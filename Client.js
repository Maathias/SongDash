import Music from './Music.js'
import Queue from './Queue.js'
import Board from './Board.js'

class Client {
	static list = []
	static listeners = []

	type = null

	constructor(ws, req) {
		this.ws = ws
		ws.client = this
		this.ip = req.socket.remoteAddress

		console.info(`ws: up ${this.ip}`)

		Client.list.push(this)

		ws.on('close', () => {
			console.info(`ws: down ${req.socket.remoteAddress}`)
			Client.list = Client.list.filter((client) => client != this)
			// Board.removePlayer(this)
		})

		ws.on('message', (data) => {
			let payload = JSON.parse(data.toString())

			console.log(payload)

			this.recieve(payload)

			// Client.on('entry', ({ client }) => {

			// })
		})
	}

	recieve(payload) {
		if (payload.whoami) {
			if (!payload.whoami in ['tv', 'host', 'player']) return

			this.type = payload.whoami
			console.info(`ws: '${this.type}' registered`)
			if (this.type == 'tv') Client.broadcast('update')
			if (this.type == 'player') {
				Board.addPlayer(this)
				Client.broadcast('score', this)
			}
		}

		// initiated only actions
		if (this.type == null) return
		// ###

		if (payload.nick) {
			if (typeof payload.nick != 'string') return
			if (payload.nick.trim() == '') return

			this.nick = payload.nick
			console.info(`ws: '${this.ip}' renamed to '${this.nick}' `)
		}

		if (payload.entry) {
			console.info(`ws: '${this.nick}' entered`)

			Queue.add(this)
			Music.control('Pause')
		}

		if (payload.host) {
			if (this.type != 'host') return

			let data = payload.host,
				action = data.action

			if (action == 'clear') {
				Queue.clear()
				Music.setStatus('waiting')
			}

			if (action == 'play') {
				Music.control('Play')
			}

			if (action == 'pause') {
				Music.control('Pause')
			}

			if (action == 'next') {
				Music.control('Next')
				Queue.clear()
			}

			if (action == 'nextPlayer') {
				Queue.nextPlayer()
			}

			if (action == 'points') {
				Board.bumpScore(Queue.activeClient, data.points)
				Client.broadcast('score', Queue.activeClient)
			}
		}
		Client.broadcast('update')
	}

	send(payload) {
		this.ws.send(JSON.stringify(payload))
	}

	static addPlayer(newclient) {
		Client.list.push(newclient)
	}

	static removePlayer(oldclient) {
		Client.list = Client.list.filter((client) => client != oldclient)
	}

	static trigger(e, p) {
		Client.listeners.forEach((listener) => {
			if (listener.e == e) listener.f(p)
		})
	}

	static on(e, f) {
		this.listeners.push({ e, f })
	}

	static broadcast(event, payload) {
		if (event == 'update') {
			Client.getType('tv').forEach((client) => {
				client.send({
					queue: Queue.rendered,
					active: Queue.active,
					status: Music.status,
				})
			})
		}

		if (event == 'score') {
			payload.send({
				points: Board.getScore(payload),
			})
		}
	}

	static getType(type) {
		return Client.list.filter((client) => client.type == type)
	}

	static getByIp(ip) {
		return Client.list.find((client) => client.ip == ip)
	}
}

export default Client
