import { exec } from 'child_process'
import os from 'os'

class Music {
  static status = 'waiting'
  static metadata = null
  static listeners = new Set()

  /** Control music playback
   * @param {string} action - One of 'Play', 'Pause', 'Stop', 'Next', 'Previous', 'PlayPause'
   * */
  static control(action) {
    const allowed = ['Play', 'Pause', 'Stop', 'Next', 'Previous', 'PlayPause']

    if (!allowed.includes(action)) return

    const platform = os.platform()

    function controlLinux(action) {
      exec(
        `dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.${action}`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`)
            return
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`)
            return
          }
          // console.log(`stdout: ${stdout}`)
        }
      )
    }

    function controlMac(action) {
      const actionMap = {
        Play: 'play',
        Pause: 'pause',
        Stop: 'stop',
        Next: 'next track',
        Previous: 'previous track',
        PlayPause: 'playpause',
      }

      const spotifyAction = actionMap[action]
      if (!spotifyAction) return

      exec(
        `osascript -e 'tell application "Spotify" to ${spotifyAction}'`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`)
            return
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`)
            return
          }
          // console.log(`stdout: ${stdout}`)
        }
      )
    }

    function controlWindows(action) {
      const actionMap = {
        Play: 'Play',
        Pause: 'Pause',
        Stop: 'Stop',
        Next: 'Next',
        Previous: 'Previous',
        PlayPause: 'PlayPause',
      }

      const spotifyAction = actionMap[action]
      if (!spotifyAction) return

      // Using nircmd or PowerShell to control Spotify on Windows
      exec(
        `powershell -Command "$wshell = New-Object -ComObject wscript.shell; $wshell.AppActivate('Spotify'); Start-Sleep -Milliseconds 100"`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`)
            return
          }

          // Send media keys
          const keyMap = {
            Play: 'play',
            Pause: 'pause',
            Stop: 'stop',
            Next: 'next',
            Previous: 'previous',
            PlayPause: 'playpause',
          }

          const key = keyMap[action]
          exec(
            `powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]0xB3)"`,
            (error, stdout, stderr) => {
              if (error) {
                console.log(`error: ${error.message}`)
              }
            }
          )
        }
      )
    }

    switch (platform) {
      case 'linux':
        controlLinux(action)
        break
      case 'darwin':
        controlMac(action)
        break
      case 'win32':
        controlWindows(action)
        break
      default:
        throw new Error(`Platform ${platform} not supported`)
    }

    let status = {
      Play: 'playing',
      Pause: 'paused',
      Stop: 'stopped',
      Next: 'playing',
    }[action]

    this.setStatus(status)

    // Fetch and broadcast metadata (non-blocking)
    setTimeout(() => {
      this.getMeta()
        .then(() =>
          this.trigger({ metadata: this.metadata, status: this.status })
        )
        .catch(error =>
          console.log(`Could not fetch metadata: ${error.message}`)
        )
    }, 1000)
  }

  static setStatus(status) {
    const allowed = ['playing', 'paused', 'waiting']

    if (!allowed.includes(status)) return

    this.status = status
  }

  static getMeta() {
    return new Promise((resolve, reject) => {
      const platform = os.platform()

      const getMetaLinux = () => {
          // Try Spotify first, then other MPRIS2 players
          const players = [
            'org.mpris.MediaPlayer2.spotify',
            'org.mpris.MediaPlayer2.vlc',
            'org.mpris.MediaPlayer2.rhythmbox',
            'org.mpris.MediaPlayer2.audacious',
          ]

          const tryPlayer = index => {
            if (index >= players.length) {
              reject(new Error('No active media player found'))
              return
            }

            const player = players[index]
            exec(
              `dbus-send --print-reply --dest=${player} /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'Metadata'`,
              (error, stdout, stderr) => {
                if (error) {
                  // Try next player
                  tryPlayer(index + 1)
                  return
                }

                // Parse the dbus output
                const metadata = {}

                // Extract title
                const titleMatch = stdout.match(
                  /xesam:title["\s]+variant\s+string\s+"([^"]+)"/
                )
                if (titleMatch) metadata.title = titleMatch[1]

                // Extract artists
                const artistMatch = stdout.match(
                  /xesam:artist["\s]+variant\s+array\s+\[\s+string\s+"([^"]+)"/
                )
                if (artistMatch) metadata.artist = artistMatch[1]

                // Extract album
                const albumMatch = stdout.match(
                  /xesam:album["\s]+variant\s+string\s+"([^"]+)"/
                )
                if (albumMatch) metadata.album = albumMatch[1]

                // Extract artwork URL
                const artMatch = stdout.match(
                  /mpris:artUrl["\s]+variant\s+string\s+"([^"]+)"/
                )
                if (artMatch) metadata.artworkUrl = artMatch[1]

                // Extract duration (in microseconds)
                const lengthMatch = stdout.match(
                  /mpris:length["\s]+variant\s+(?:uint64|int64)\s+(\d+)/
                )
                if (lengthMatch)
                  metadata.duration = parseInt(lengthMatch[1]) / 1000000 // Convert to seconds

                // Extract track URL
                const urlMatch = stdout.match(
                  /xesam:url["\s]+variant\s+string\s+"([^"]+)"/
                )
                if (urlMatch) metadata.url = urlMatch[1]

                metadata.player = player.replace('org.mpris.MediaPlayer2.', '')

                Music.metadata = metadata
                resolve(metadata)
              }
            )
          }

          tryPlayer(0)
        },
        getMetaMac = () => {
          // Try Spotify, Music (iTunes), and other common players
          const script = `
			set output to ""
			tell application "System Events"
				set spotifyRunning to (name of processes) contains "Spotify"
				set musicRunning to (name of processes) contains "Music"
			end tell
			
			if spotifyRunning then
				tell application "Spotify"
					if player state is not stopped then
						set trackName to name of current track
						set trackArtist to artist of current track
						set trackAlbum to album of current track
						set trackDuration to duration of current track
						set trackUrl to spotify url of current track
						set output to "Spotify|||" & trackName & "|||" & trackArtist & "|||" & trackAlbum & "|||" & trackDuration & "|||" & trackUrl
					end if
				end tell
			else if musicRunning then
				tell application "Music"
					if player state is not stopped then
						set trackName to name of current track
						set trackArtist to artist of current track
						set trackAlbum to album of current track
						set trackDuration to duration of current track
						set output to "Music|||" & trackName & "|||" & trackArtist & "|||" & trackAlbum & "|||" & trackDuration & "|||"
					end if
				end tell
			end if
			
			return output
		`

          exec(
            `osascript -e '${script.replace(/'/g, "'\\''")}'`,
            (error, stdout, stderr) => {
              if (error) {
                reject(new Error('No active media player found'))
                return
              }

              const output = stdout.trim()
              if (!output) {
                reject(new Error('No track currently playing'))
                return
              }

              const parts = output.split('|||')
              const metadata = {
                player: parts[0],
                title: parts[1],
                artist: parts[2],
                album: parts[3],
                duration: parseFloat(parts[4]) / 1000, // Convert milliseconds to seconds
              }

              if (parts[5]) metadata.url = parts[5]

              Music.metadata = metadata
              resolve(metadata)
            }
          )
        },
        getMetaWindows = () => {
          // Use Windows 10+ GlobalSystemMediaTransportControlsSessionManager
          const script = `
			Add-Type -AssemblyName System.Runtime.WindowsRuntime
			$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
			Function Await($WinRtTask, $ResultType) {
				$asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
				$netTask = $asTask.Invoke($null, @($WinRtTask))
				$netTask.Wait(-1) | Out-Null
				$netTask.Result
			}
			
			$sessionManager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
			$sessions = Await ($sessionManager::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
			$currentSession = $sessions.GetCurrentSession()
			
			if ($null -eq $currentSession) {
				Write-Output "ERROR: No active media session"
				exit 1
			}
			
			$mediaProperties = Await ($currentSession.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
			
			$title = $mediaProperties.Title
			$artist = $mediaProperties.Artist
			$album = $mediaProperties.AlbumTitle
			$player = $currentSession.SourceAppUserModelId
			
			Write-Output "$player|||$title|||$artist|||$album"
		`

          exec(
            `powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`,
            (error, stdout, stderr) => {
              if (error || stdout.includes('ERROR:')) {
                reject(new Error('No active media player found'))
                return
              }

              const parts = stdout.trim().split('|||')
              const metadata = {
                player: parts[0],
                title: parts[1],
                artist: parts[2],
                album: parts[3],
              }

              Music.metadata = metadata
              resolve(metadata)
            }
          )
        }

      switch (platform) {
        case 'linux':
          getMetaLinux()
          break
        case 'darwin':
          getMetaMac()
          break
        case 'win32':
          getMetaWindows()
          break
        default:
          reject(new Error(`Platform ${platform} not supported`))
      }
    })
  }

  static bind(callback) {
    // bind a callback to status updates
    // support many listeners
    this.listeners.add(callback)
  }

  static trigger(payload) {
    this.listeners.forEach(callback => callback(payload))
  }
}

export default Music
