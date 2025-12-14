function playSound() {
  new Audio('/pop.mp3').play()
}

class Socket {
  #deferred = []
  #messageListeners = []
  #eventListeners = new Map()

  constructor(clientType) {
    this.clientType = clientType
    this.ws = new WebSocket('ws://' + location.hostname + ':2501')

    this.ws.onopen = () => {
      // Send registration message
      this.send({
        type: 'register',
        data: { clientType },
      })

      // Send any deferred messages
      if (this.#deferred.length) {
        this.#deferred.forEach(payload => {
          this.send(payload)
        })
        this.#deferred = []
      }
    }

    this.ws.onclose = () => {
      setTimeout(() => {
        location.reload()
      }, 1000)
    }

    // Set up message routing
    this.ws.onmessage = e => {
      const message = JSON.parse(e.data)
      console.debug('recv', message)

      this.receive(message)

      // // Layer 1: Notify all message listeners
      // this.#messageListeners.forEach(listener => listener(message))

      // Layer 2: Trigger custom events based on message content
      // this.#triggerCustomEvents(message)
    }
  }

  /**
   * Send a message to the server
   * @param {Object} payload - Message payload following the protocol
   */
  send(payload) {
    if (this.ws.readyState !== 1) {
      this.#deferred.push(payload)
    } else {
      this.ws.send(JSON.stringify(payload))
      console.log('send', payload)
    }
  }

  receive(message) {
    const { action, data } = message

    this.#emit(action, data)
  }

  // /**
  //  * Layer 1: Listen to all incoming WebSocket messages
  //  * @param {Function} callback - Called with raw message object
  //  */
  // onMessage(callback) {
  //   this.#messageListeners.push(callback)
  // }

  on(eventName, callback) {
    if (!this.#eventListeners.has(eventName)) {
      this.#eventListeners.set(eventName, [])
    }
    this.#eventListeners.get(eventName).push(callback)
  }

  // off(eventName, callback) {
  //   if (!this.#eventListeners.has(eventName)) return

  //   const listeners = this.#eventListeners.get(eventName)
  //   const index = listeners.indexOf(callback)
  //   if (index > -1) {
  //     listeners.splice(index, 1)
  //   }
  // }

  #emit(eventName, data) {
    if (!this.#eventListeners.has(eventName)) return

    this.#eventListeners.get(eventName).forEach(callback => {
      callback(data)
    })
  }

  // #triggerCustomEvents(message) {
  //   return console.warn(message)

  //   // Extract event-like data from the message
  //   const { type, action, data } = message

  //   // Emit based on message structure
  //   if (type && action) {
  //     this.#emit(`${type}:${action}`, data)
  //   }

  //   // Emit for specific data fields (backwards compatibility & convenience)
  //   if (data) {
  //     Object.keys(data).forEach(key => {
  //       this.#emit(key, data[key])
  //     })
  //   }
  // }

  #createTypedSender = type => (action, data) => {
    const message = { type, action }
    if (data !== undefined) {
      message.data = data
    }
    this.send(message)
  }

  player = this.#createTypedSender('player')
  host = this.#createTypedSender('host')
}
