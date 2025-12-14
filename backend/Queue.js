import logger from '../logger.js'
import Music from './Music.js'

function getTime() {
	if (!Music.playingSince) return null
	return (new Date() - Music.playingSince) / 1000
}

class Queue {
	static array = []
	static active = null

	static add(client) {
		if (this.isClientInQueue(client)) return

		if (this.isEmpty) this.active = 0

		this.array.push({ client, time: getTime() })

		logger.debug('Queue', `client added to queue`, client.ip)
	}

	static get isEmpty() {
		return this.array.length == 0
	}

	static isClientInQueue(client) {
		return this.array.some(({ client: c }) => c.ip === client.ip)
	}

	static clear() {
		this.array = []
		this.active = null

		logger.debug('Queue', `queue cleared`)
	}

	static nextPlayer() {
		this.active = (this.active + 1) % this.array.length
	}

	static get rendered() {
		return this.array.map(({ client, time }) => [client.nick, time])
	}

	static get activeClient() {
		return this.array[this.active]?.client
	}

	static debug() {
		return {
			queue: this.array.map(({ client, time }, index) => ({
				position: index,
				ip: client.ip,
				nick: client.nick || null,
				isActive: index === this.active,
				time,
			})),
			active: this.active,
			length: this.array.length,
			isEmpty: this.isEmpty,
			activeClient: this.activeClient
				? {
						ip: this.activeClient.ip,
						nick: this.activeClient.nick || null,
				  }
				: null,
		}
	}
}

export default Queue
