import Client from './Client.js'

class Board {
	static scores = {}

	static addPlayer(client) {
		if (this.scores[client.ip]) return

		this.scores[client.ip] = 0
	}

	// static removePlayer(client) {
	// 	delete this.scores[client.ip]
	// }

	static bumpScore(client, score) {
		this.scores[client.ip] += score
	}

	static getScore(client) {
		return this.scores[client.ip]
	}

	static get rendered() {
		let list = Object.entries(this.scores).map(([ip, score]) => {
			return {
				nick: Client.getByIp(ip).nick,
				score,
			}
		})
		return list
	}
}

export default Board
