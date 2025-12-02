import { WebSocketServer } from 'ws'
import express from 'express'

import env from './env.js'
import Client from './backend/Client.js'
import Music from './backend/Music.js'

const app = express()

app.use(express.static('public'))

app.listen(env.HTTP_PORT, () => console.log(`http  : listening on ${env.HTTP_PORT}`))

const wss = new WebSocketServer({
  port: env.WS_PORT,
}).on('listening', () => console.log(`ws    : listening on ${env.WS_PORT}`))

wss.on('connection', (ws, req) => new Client(ws, req))

// bind music metadata broadcasts to clients
// used to avoid dependency cycles

Music.bind(p => Client.trigger('musicMetadata', p))
