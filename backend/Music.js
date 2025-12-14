import { exec } from 'child_process'
import { promisify } from 'util'

import logger from '../logger.js'

const execAsync = promisify(exec)

async function controlLinux(action) {
	const lookup = {
		Play: 'Play',
		Pause: 'Pause',
		Stop: 'Stop',
		Next: 'Next',
		Previous: 'Previous',
		PlayPause: 'PlayPause',
		Meta: 'Meta',
	}

	const command = lookup[action]

	try {
		// Find active media player
		// const { stdout: playerList } = await execAsync(
		//   "dbus-send --session --dest=org.freedesktop.DBus --type=method_call --print-reply /org/freedesktop/DBus org.freedesktop.DBus.ListNames | grep 'org.mpris.MediaPlayer2' | grep -v 'kdeconnect' | head -n 1 | awk '{print $2}' | tr -d '\"'"
		// )

		const playerList = 'org.mpris.MediaPlayer2.spotify' // TODO: fix detection of active player

		const player = playerList.trim()

		if (!player) {
			return new Error('No media player found')
		}

		if (command === 'Meta') {
			// Get metadata
			const { stdout: metadata } = await execAsync(
				`dbus-send --print-reply --dest=${player} /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:org.mpris.MediaPlayer2.Player string:Metadata`
			)

			// Parse artist
			const artistMatch = metadata.match(/xesam:artist[\s\S]*?string "(.*?)"/)
			const author = artistMatch ? artistMatch[1] : 'Unknown Artist'

			// Parse title
			const titleMatch = metadata.match(/xesam:title[\s\S]*?string "(.*?)"/)
			const track = titleMatch ? titleMatch[1] : 'Unknown Title'

			logger.debug('Music', `fetched metadata:`, { author, track })

			return {
				author,
				track,
			}
		} else {
			// Execute control command
			await execAsync(
				`dbus-send --print-reply --dest=${player} /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.${command}`
			)

			logger.debug('Music', `executed command:`, command)

			return newStateLookup[action]
		}
	} catch (error) {
		return new Error(`Linux music control error: ${error.message}`)
	}
}

function controlWindows(action) {
	const lookup = {
		Play: 'Play',
		Pause: 'Pause',
		Stop: 'Pause',
		Next: 'Next',
		Previous: 'Previous',
		PlayPause: 'Toggle',
		Meta: 'Info',
	}

	const script = [
		'param(',
		// Info, Toggle, Next, Previous, Play, Pause
		`    [string]$Command = "${lookup[action]}"`,
		')',
		'# 1. Load Windows Media Assemblies',
		'[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null',
		'Add-Type -AssemblyName System.Runtime.WindowsRuntime',
		'# 2. Async Helper (Required for WinRT)',
		'Function Await($WinRtTask, $ResultType) {',
		"    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]",
		'    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)',
		'    $netTask = $asTask.Invoke($null, @($WinRtTask))',
		'    $netTask.Wait(-1) | Out-Null',
		'    return $netTask.Result',
		'}',
		'try {',
		'    # 3. Connect to Media Manager',
		'    $managerTask = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()',
		'    $manager = Await $managerTask ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])',
		'    $session = $manager.GetCurrentSession()',
		'    if ($session) {',
		'        # --- CONTROL COMMANDS ---',
		'        if ($Command -eq "Next") {',
		'            $task = $session.TrySkipNextAsync()',
		'            $null = Await $task ([bool])',
		'        }',
		'        elseif ($Command -eq "Previous") {',
		'            $task = $session.TrySkipPreviousAsync()',
		'            $null = Await $task ([bool])',
		'        }',
		'        elseif ($Command -eq "Play") {',
		'            $task = $session.TryPlayAsync()',
		'            $null = Await $task ([bool])',
		'        }',
		'        elseif ($Command -eq "Pause") {',
		'            $task = $session.TryPauseAsync()',
		'            $null = Await $task ([bool])',
		'        }',
		'        elseif ($Command -eq "Toggle") {',
		'            $status = $session.GetPlaybackInfo().PlaybackStatus',
		'            if ($status -eq "Playing") {',
		'                $task = $session.TryPauseAsync()',
		'                $null = Await $task ([bool])',
		'            } else {',
		'                $task = $session.TryPlayAsync()',
		'                $null = Await $task ([bool])',
		'            }',
		'        }',
		'        # --- RETURN INFO (Always return status so UI updates immediately) ---',
		'        # Small delay to allow app to update status before reading',
		'        if ($Command -ne "Info") { Start-Sleep -Milliseconds 200 }',
		'        $infoTask = $session.TryGetMediaPropertiesAsync()',
		'        $info = Await $infoTask ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])',
		'        $playbackInfo = $session.GetPlaybackInfo()',
		'        $result = @{',
		'            Title = $info.Title',
		'            Artist = $info.Artist',
		'            Album = $info.AlbumTitle',
		'            IsPlaying = ($playbackInfo.PlaybackStatus -eq "Playing")',
		'            Success = $true',
		'        }',
		'        $result | ConvertTo-Json -Compress',
		'    } else {',
		'        $result = @{ IsPlaying = $false; Title = "Nothing Playing"; Success = $false }',
		'        $result | ConvertTo-Json -Compress',
		'    }',
		'} catch {',
		'    $result = @{ IsPlaying = $false; Title = "Error"; Error = $_.Exception.Message }',
		'    $result | ConvertTo-Json -Compress',
		'}',
	].join('\n')

	return new Promise((resolve, reject) => {
		exec(script, (error, stdout, stderr) => {
			if (error) return reject(error)
			if (stderr) return reject(new Error(stderr))
			if (action === 'Meta') {
				try {
					const { Artist, Title } = JSON.parse(stdout)
					resolve({
						author: Artist,
						track: Title,
					})
				} catch (parseError) {
					reject(parseError)
				}
			} else {
				resolve(newStateLookup[action])
			}
		})
	})
}

const newStateLookup = {
	Play: 'playing',
	Pause: 'paused',
	Next: 'playing',
}

class Music {
	static status = 'waiting'
	static metadata = null
	static listeners = new Set()
	static #platform = null

	static init(platform) {
		this.#platform = platform

		logger.debug('Music', `initialized for platform`, platform)
	}

	static control(action) {
		const allowed = ['Play', 'Pause', 'Stop', 'Next', 'Previous', 'PlayPause']

		if (!allowed.includes(action)) return
		// if (this.status == newStateLookup[action]) return

		let controller = {
			linux: controlLinux,
			win32: controlWindows,
		}[this.#platform]

		controller(action)
		this.newStatus = newStateLookup[action]

		// Fetch and broadcast metadata (non-blocking)
		setTimeout(() => this.getMeta(), 1000)
	}

	static set newStatus(status) {
		const allowed = ['playing', 'paused', 'waiting']

		if (!allowed.includes(status)) return

		this.status = status

		logger.debug('Music', `status changed to`, status)
	}

	static async getMeta() {
		this.metadata = await {
			linux: controlLinux,
			win32: controlWindows,
		}[this.#platform]('Meta')

		this.emit({ metadata: this.metadata, status: this.status })

		return this.metadata
	}

	static on(callback) {
		this.listeners.add(callback)
	}

	static off(callback) {
		this.listeners.delete(callback)
	}

	static emit(payload) {
		this.listeners.forEach(callback => callback(payload))
	}
}

export default Music
export { controlLinux, controlWindows }
