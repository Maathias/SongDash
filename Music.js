import { exec } from 'child_process'

class Music {
	static status = 'waiting'

	static control(action) {
		const allowed = ['Play', 'Pause', 'Stop', 'Next', 'Previous', 'PlayPause']

		if (!allowed.includes(action)) return

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

		let status = {
			Play: 'playing',
			Pause: 'paused',
			Stop: 'stopped',
			Next: 'playing',
		}[action]

		this.setStatus(status)
	}

	static setStatus(status) {
		const allowed = ['playing', 'paused', 'waiting']

		if (!allowed.includes(status)) return

		this.status = status
	}

	static getMeta() {
		/*
		method return time=1737905619.455697 sender=:1.419 -> destination=:1.2759 serial=6800 reply_serial=2
   variant       array [
         dict entry(
            string "mpris:trackid"
            variant                string "/com/spotify/track/7dxQFzp8zZzgDkaYEXQZIv"
         )
         dict entry(
            string "mpris:length"
            variant                uint64 258453000
         )
         dict entry(
            string "mpris:artUrl"
            variant                string "https://i.scdn.co/image/ab67616d0000b273b01fea159227ea845c2bd72e"
         )
         dict entry(
            string "xesam:album"
            variant                string "Crystal Castles"
         )
         dict entry(
            string "xesam:albumArtist"
            variant                array [
                  string "Crystal Castles"
               ]
         )
         dict entry(
            string "xesam:artist"
            variant                array [
                  string "Crystal Castles"
               ]
         )
         dict entry(
            string "xesam:autoRating"
            variant                double 0.63
         )
         dict entry(
            string "xesam:discNumber"
            variant                int32 1
         )
         dict entry(
            string "xesam:title"
            variant                string "Crimewave"
         )
         dict entry(
            string "xesam:trackNumber"
            variant                int32 3
         )
         dict entry(
            string "xesam:url"
            variant                string "https://open.spotify.com/track/7dxQFzp8zZzgDkaYEXQZIv"
         )
      ]

		*/

		// primitives
		// dict entry\(\s+.+ \"(.+)\"\s+variant\s+(.+?) (.+)\s+\)

		// arrays
		// dict entry\(\s+.+ \"(.+)\"\s+variant\s+(.+?) array \[\s+(.+?)\s+\]\s+\)

		exec(
			`dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'Metadata'`,
			(error, stdout, stderr) => {
				if (error) {
					console.log(`error: ${error.message}`)
					return
				}
				if (stderr) {
					console.log(`stderr: ${stderr}`)
					return
				}
				console.log(`stdout: ${stdout}`)
			}
		)
	}
}

export default Music
