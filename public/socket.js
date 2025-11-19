function playSound() {
	new Audio('/pop.mp3').play()
}

// var send = {
// 	host: (payload = {}) => {
// 		payload.whoami = 'host'
// 		_send(payload)
// 	},
// 	tv: (payload = {}) => {
// 		payload.whoami = 'tv'
// 		_send(payload)
// 	},
// 	player: (payload = {}) => {
// 		payload.whoami = 'player'
// 		_send(payload)
// 	},
// }

class Socket {
	deffered = []

	constructor(whoami) {
		this.ws = new WebSocket('ws://' + location.hostname + ':2501')

		this.ws.onopen = () => {
			this._send({ whoami })

			if (this.deffered.length) {
				this.deffered.forEach((payload) => {
					this._send(payload)
				})
				this.deffered = []
			}
		}

		this.ws.onclose = () => {
			// alert('connection lost')
			location.reload()
		}
	}

	_send(payload) {
		// check if ws is ready
		if (this.ws.readyState != 1) {
			this.deffered.push(payload)
		} else {
			this.ws.send(JSON.stringify(payload))
		}
	}

	send(type, payload) {
		if (type == 'host') {
			this._send({ host: payload })
		}
		if (type == 'nick') {
			this._send({ nick: payload })
		}
		if (type == 'enter') {
			this._send({ entry: true })
		}
	}

	bind(callback) {
		this.ws.onmessage = (e) => {
			let payload = JSON.parse(e.data)
			console.info(payload)
			callback(payload)
		}
	}
}
