import logger from '../logger.js'
import Board from './Board.js'
import Music from './Music.js'
import { UAParser } from 'ua-parser-js'

function getUA(req) {
	const uaString = req.headers['user-agent'] || null

	if (uaString) {
		const parser = new UAParser(uaString)
		const result = parser.getResult()
		return {
			raw: uaString,
			browser: result.browser.name ? `${result.browser.name} ${result.browser.version || ''}`.trim() : null,
			os: result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : null,
			device: result.device.type || 'desktop',
		}
	}
}

class Client {
	static list = []
	static listeners = new Map()

	type = null
	nick = null
	ip = null
	ws = null
	userAgent = null

	constructor(ws, req) {
		this.ws = ws
		ws.client = this

		this.ip = req.socket.remoteAddress
		this.userAgent = getUA(req)

		logger.debug('Client', 'up', this.ip)

		Client.list.push(this)
		Client.emit('debug')

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

			Client.emit('debug')
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
		const validTypes = ['tv', 'host', 'player', 'debug']
		if (!validTypes.includes(clientType)) throw new Error(`Invalid client type: ${clientType}`)

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
		} else if (this.type == 'debug') {
			Client.emit('update')
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

	static debug() {
		return {
			clients: Client.list.map(client => ({
				ip: client.ip,
				type: client.type,
				nick: client.nick || null,
				userAgent: client.userAgent,
				connected: client.ws.readyState === 1,
			})),
			totalClients: Client.list.length,
		}
	}
}

export default Client
