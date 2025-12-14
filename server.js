import { WebSocketServer } from 'ws'
import express from 'express'
import os from 'os'

import env from './env.js'
import logger from './logger.js'
import Client from './backend/Client.js'
import Music from './backend/Music.js'
import Qr from './backend/Qr.js'
import Queue from './backend/Queue.js'
import Board from './backend/Board.js'

const app = express()

app.use(express.static('public'))

// Serve pages from /pages directory with clean URLs
app.get('/:page', (req, res, next) => {
	const allowedPages = ['host', 'player', 'tv']
	if (allowedPages.includes(req.params.page)) {
		res.sendFile(`pages/${req.params.page}.html`, { root: '.' })
	} else {
		next()
	}
})

app.use(Qr.serve())

app.listen(env.HTTP_PORT, () => logger.info('server', 'http port is', env.HTTP_PORT))

const wss = new WebSocketServer({
	port: env.WS_PORT,
}).on('listening', () => logger.info('server', 'websocket port is', env.WS_PORT))

Qr.init(process.env.SERVER_HOST)
Music.init(os.platform())

wss.on('connection', (ws, req) => new Client(ws, req))

// Bind music metadata broadcasts to clients
// Used to avoid dependency cycles

Music.on(data => {
	if (!data.metadata) return

	Client.getBy.type('host').forEach(host =>
		host.send({
			type: 'state',
			action: 'metadata',
			data: data.metadata,
		})
	)
})

Client.on('update', () => {
	Client.getBy.type('tv').forEach(tv => {
		tv.send({
			action: 'update',
			data: {
				queue: Queue.rendered,
				active: Queue.active,
				status: Music.status,
				board: Board.rendered,
			},
		})
	})
})

Client.on('hostAction-play', () => Music.control('Play'))
Client.on('hostAction-pause', () => Music.control('Pause'))
Client.on('hostAction-next', () => {
	Music.control('Next')
	Queue.clear()
})
Client.on('hostAction-clear', () => {
	Queue.clear()
	Music.newStatus = 'waiting'
})
Client.on('hostAction-nextPlayer', () => Queue.nextPlayer())

Client.on('hostAction-points', ({ points }) => {
	Board.score.bump(Queue.activeClient, points || 0)
	// Client.emit('score', Queue.activeClient)

	// Client.getBy.type('tv').forEach(client => {
	//   client.send({
	//     type: 'ui',
	//     action: 'updateScoreboard',
	//     data: {
	//       scoreboard: Board.rendered,
	//     },
	//   })
	// })
})

Client.on('hostAction-showQr', ({ show }) => {
	Client.getBy.type('tv').forEach(tv => {
		tv.send({
			action: 'showQr',
			data: { show },
		})
	})
})

Client.on('playerAction-setNick', ({ client, data }) => {
	const nick = data?.nick
	if (typeof nick !== 'string' || nick.trim() === '') return

	client.nick = nick
	logger.info('Client', `'${client.ip}' renamed to '${client.nick}'`)
})

Client.on('playerAction-enter', ({ client }) => {
	logger.debug('Client', `'${client.nick}' entered`)
	Queue.add(client)
	Music.control('Pause')
})
