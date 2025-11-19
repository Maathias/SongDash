import Client from './Client.js'
import Music from './Music.js'

class Queue {
	static array = []
	static active = null

	static add(client) {
		if (this.isClientInQueue(client)) {
			// if (Music.status == 'playing') this.active++
			return
		}

		if (this.isEmpty) this.active = 0

		this.push(client)
	}

	static get isEmpty() {
		return this.array.length == 0
	}

	static isClientInQueue(client) {
		return this.array.includes(client.ip)
	}

	static push(client) {
		this.array.push(client.ip)
	}

	static clear() {
		this.array = []
		this.active = null
	}

	static nextPlayer() {
		this.active = (this.active + 1) % this.array.length
	}

	static get rendered() {
		return this.array.map((ip, i) => {
			return Client.getByIp(ip)?.nick
		})
	}

	static get activeClient() {
		return Client.getByIp(this.array[this.active])
	}
}

export default Queue
