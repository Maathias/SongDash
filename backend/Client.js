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

    console.info(`ws    : up ${this.ip}`)

    Client.list.push(this)

    ws.on('close', () => {
      console.info(`ws    : down ${this.ip}`)
      Client.list = Client.list.filter(client => client != this)
      Client.listeners = Client.listeners.filter(listener => listener.who != this)
      // Board.removePlayer(this)
    })

    ws.on('message', data => {
      let payload = JSON.parse(data.toString())
      this.receive(payload)
    })
  }

  receive(payload) {
    // Handle client registration
    if (payload.whoami) {
      this.handleRegistration(payload.whoami)
      return
    }

    // Require client to be registered before handling other commands
    if (this.type == null) return

    // Handle type-specific commands
    switch (this.type) {
      case 'player':
        this.handlePlayerCommands(payload)
        break
      case 'host':
        this.handleHostCommands(payload)
        break
      case 'tv':
        // TV clients only receive broadcasts, no commands
        break
    }

    Client.trigger('update')

    // Client.broadcast('update')
  }

  handleRegistration(clientType) {
    const validTypes = ['tv', 'host', 'player']
    if (!validTypes.includes(clientType)) return

    this.type = clientType
    console.info(`ws    : '${this.type}' registered`)

    if (this.type == 'tv') {
      // Client.broadcast('update')
      Client.on(
        'update',
        () => {
          this.send({
            queue: Queue.rendered,
            active: Queue.active,
            status: Music.status,
          })
        },
        this
      )
    }

    if (this.type == 'player') {
      Board.addPlayer(this)
      // Client.broadcast('score', this)
      Client.on(
        'score',
        client => {
          if (client !== this) return
          this.send({
            points: Board.score.get(this),
          })
        },
        this
      )
    }

    if (this.type == 'host') {
      Client.on(
        'musicMetadata',
        ({ metadata }) => {
          this.send({ metadata })
        },
        this
      )
    }
  }

  handlePlayerCommands(payload) {
    if (payload.nick) {
      const nick = payload.nick
      if (typeof nick != 'string') return
      if (nick.trim() == '') return

      this.nick = nick
      console.info(`ws    : '${this.ip}' renamed to '${this.nick}'`)
    }

    if (payload.entry) {
      console.info(`ws    : '${this.nick}' entered`)
      Queue.add(this)
      Music.control('Pause')
    }
  }

  handleHostCommands(payload) {
    const { action, points } = payload

    const actions = {
      clear: () => {
        Queue.clear()
        Music.setStatus('waiting')
      },
      play: () => {
        Music.control('Play')
      },
      pause: () => {
        Music.control('Pause')
      },
      next: () => {
        Music.control('Next')
        Queue.clear()
      },
      nextPlayer: () => {
        Queue.nextPlayer()
      },
      points: () => {
        Board.score.bump(Queue.activeClient, points)
        Client.trigger('score', Queue.activeClient)
      },
    }

    if (actions[action]) actions[action]()
  }

  send(payload) {
    this.ws.send(JSON.stringify(payload))
  }

  static trigger(event, payload) {
    Client.listeners.forEach(listener => {
      if (listener.event == event) listener.callback(payload)
    })
  }

  static on(event, callback, who) {
    this.listeners.push({ event, callback, who })
  }

  static get getBy() {
    return {
      ip: ip => Client.list.find(client => client.ip == ip),
      type: type => Client.list.filter(client => client.type == type),
    }
  }
}

export default Client
