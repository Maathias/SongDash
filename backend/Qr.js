import QRCode from 'qrcode'
import logger from '../logger.js'
import env from '../env.js'

export default class Qr {
  static #cache = null
  static #host = null

  static init(host) {
    this.#host = host
    logger.info('Qr', 'host for qr', host)
    if (!host) logger.warn('env', 'SERVER_HOST is not defined, QR codes will not be generated')
  }

  static serve() {
    return async (req, res, next) => {
      if (req.path !== '/qr') return next()

      try {
        if (this.host === null) {
          throw new Error('SERVER_HOST is not defined')
        }

        if (!this.#cache) {
          const payload = this.#payload()
          this.#cache = await this.#generate(payload)
        }

        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.send(this.#cache)
      } catch (error) {
        logger.error('http', 'QR code generation error:', error)
        res.status(500).send('Failed to generate QR code')
      }
    }
  }

  static async #generate(data) {
    return await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 512,
      margin: 2,
    })
  }

  static #payload() {
    const port = env.HTTP_PORT
    return `http://${this.#host}:${port}/player`
  }
}
