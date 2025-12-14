import dotenv from 'dotenv'

const NODE_ENV = process.env.NODE_ENV,
  dotfile = {
    production: '.env',
    development: '.dev.env',
  }[NODE_ENV ?? 'production']

// logger.info('env', `${NODE_ENV} | ${dotfile}`)

// Try to load env file, but don't throw if it doesn't exist
dotenv.config({ path: `./${dotfile}` })

const env = {
	HTTP_PORT: 2500,
	WS_PORT: 2501,
	LOG_LEVEL: 'info',
	SERVER_HOST: '',
}

// Override defaults with environment variables if they exist
for (let key in env) {
	process.env[key] && (env[key] = env[key].constructor(process.env[key]))
}

export default env
