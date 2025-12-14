import logger from '../logger.js'
import Board from './Board.js'
import Music from './Music.js'

class Client {
	static list = []
	static listeners = new Map()

	type = null

	constructor(ws, req) {
		this.ws = ws
		ws.client = this

		this.ip = req.socket.remoteAddress

		logger.debug('Client', 'up', this.ip)

		Client.list.push(this)

		ws.on('close', () => {
			logger.debug('Client', 'down', this.ip)
			Client.list = Client.list.filter(client => client != this)

			// Clean up event listeners for this client
			Client.listeners.forEach((listeners, eventName) => {
				Client.listeners.set(
					eventName,
					listeners.filter(listener => listener.who !== this)
				)
			})
		})

		ws.on('message', data => {
			let message = JSON.parse(data.toString())
			this.receive(message)
		})
	}

	receive(message) {
		const { type, action, data } = message

		logger.trace('Client', 'recv', { type, action, from: this.ip })

		// Handle client registration
		if (type === 'register') {
			return this.handleRegistration(data.clientType)
		}

		// Require client to be registered before handling other commands
		if (this.type == null) return

		if (type == 'player') Client.emit('playerAction-' + action, { client: this, data })
		if (type == 'host') Client.emit('hostAction-' + action, data)

		Client.emit('update')
	}

	handleRegistration(clientType) {
		const validTypes = ['tv', 'host', 'player']
		if (!validTypes.includes(clientType)) return

		this.type = clientType
		logger.info('Client', `'${this.ip}' registered as`, this.type)

		if (this.type == 'player') {
			Board.addPlayer(this)
		} else if (this.type == 'tv') {
			Client.emit('update')
		} else if (this.type == 'host') {
			this.send({
				type: 'state',
				action: 'metadata',
				data: Music.metadata,
			})
		}
	}

	send(message) {
		this.ws.send(JSON.stringify(message))
		logger.trace('Client', 'send', message)
	}

	// Emit an event to all registered listeners
	static emit(event, payload) {
		const listeners = this.listeners.get(event) || []
		listeners.forEach(listener => {
			listener.callback(payload)
		})
	}

	// Register an event listener
	static on(event, callback, who) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, [])
		}
		this.listeners.get(event).push({ callback, who })
	}

	// static off(event, who) {
	//   if (!this.listeners.has(event)) return

	//   const listeners = this.listeners.get(event)
	//   this.listeners.set(
	//     event,
	//     listeners.filter(listener => listener.who !== who)
	//   )
	// }

	static get getBy() {
		return {
			ip: ip => Client.list.find(client => client.ip == ip),
			type: type => Client.list.filter(client => client.type == type),
		}
	}
}

export default Client
