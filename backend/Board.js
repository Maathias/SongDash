import logger from '../logger.js'
import Client from './Client.js'

class Board {
	static scores = {
		'::1': 10,
		'::2': 20,
		'::3': 30,
	}

	static addPlayer(client) {
		if (this.scores[client.ip]) return

		this.scores[client.ip] = 0

		logger.debug('Board', `new player added`, client.ip)
	}

	// static removePlayer(client) {
	// 	delete this.scores[client.ip]
	// }

	static get score() {
		return {
			bump: (client, score) => (Board.scores[client.ip] += score),
			get: client => Board.scores[client.ip],
		}
	}

	static bumpScore(client, score) {
		this.scores[client.ip] += score
		logger.debug('Board', `score changed by ${score}`, client.ip)
	}

	static getScore(client) {
		return this.scores[client.ip]
	}

	static get rendered() {
		return Object.entries(this.scores)
			.filter(([ip, score]) => score > 0)
			.map(([ip, score]) => {
				const client = Client.getBy.ip(ip)
				return {
					nick: client?.nick || '---',
					score,
				}
			})
	}
}

export default Board
