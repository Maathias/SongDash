import { WebSocketServer } from 'ws'
import express from 'express'
import os from 'os'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import env from './env.js'
import logger from './logger.js'
import Client from './backend/Client.js'
import Music from './backend/Music.js'
import Qr from './backend/Qr.js'
import Queue from './backend/Queue.js'
import Board from './backend/Board.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

// Determine if we're in production (built) or development
const isProduction = process.env.NODE_ENV === 'production'
const pagesDir = isProduction ? 'dist' : 'src/pages'

// When running as nexe binary, use process.cwd() as base path
// Otherwise use __dirname (for normal node execution)
const isNexeBinary = process.argv[0].includes('songdash')
const basePath = isNexeBinary ? process.cwd() : __dirname

// Serve static files from public directory
app.use(express.static(join(basePath, 'public')))

// In development, also serve src directory for Vite assets
if (!isProduction) {
	app.use('/src', express.static(join(basePath, 'src')))
	// Serve styles and scripts directly for relative imports from HTML
	app.use('/styles', express.static(join(basePath, 'src/styles')))
	app.use('/scripts', express.static(join(basePath, 'src/scripts')))
}

// Serve built pages from /dist in production
if (isProduction) {
	app.use(express.static(join(basePath, 'dist')))
}

// Serve pages with clean URLs
app.get('/:page', (req, res, next) => {
	const allowedPages = ['host', 'player', 'tv', 'debug']
	if (allowedPages.includes(req.params.page)) {
		const filePath = isProduction
			? join(basePath, 'dist', `${req.params.page}.html`)
			: join(basePath, pagesDir, `${req.params.page}.html`)
		res.sendFile(filePath)
	} else {
		next()
	}
})

app.use(Qr.serve())

app.listen(env.HTTP_PORT, () => logger.info('server', 'http port is', env.HTTP_PORT))

const wss = new WebSocketServer({
	port: env.WS_PORT,
}).on('listening', () => logger.info('server', 'websocket port is', env.WS_PORT))

Qr.init(env.SERVER_HOST)
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

	Client.emit('debug')
})

Client.on('debug', () => {
	Client.getBy.type('debug').forEach(debug => {
		debug.send({
			action: 'update',
			data: {
				client: Client.debug(),
				board: Board.debug(),
				music: Music.debug(),
				queue: Queue.debug(),
				timestamp: new Date().toISOString(),
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
