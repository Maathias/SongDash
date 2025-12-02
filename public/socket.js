function playSound() {
  new Audio('/pop.mp3').play()
}

class Socket {
  deffered = []

  constructor(whoami) {
    this.ws = new WebSocket('ws://' + location.hostname + ':2501')

    this.ws.onopen = () => {
      this.send({ whoami })

      if (this.deffered.length) {
        this.deffered.forEach(payload => {
          this.send(payload)
        })
        this.deffered = []
      }
    }

    this.ws.onclose = () => {
      // alert('connection lost')
      location.reload()
    }
  }

  send(payload) {
    // check if ws is ready
    if (this.ws.readyState != 1) {
      this.deffered.push(payload)
    } else {
      this.ws.send(JSON.stringify(payload))
      console.log('ws send:', payload)
    }
  }

  player(action, data) {
    let payload = null
    switch (action) {
      case 'nick':
        payload = { nick: data }
        break
      case 'enter':
        payload = { entry: true }
        break
    }

    this.send(payload)
  }

  bind(callback) {
    this.ws.onmessage = e => {
      let payload = JSON.parse(e.data)
      console.info(payload)
      callback(payload)
    }
  }
}
