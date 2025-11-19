import dotenv from 'dotenv'

const NODE_ENV = process.env.NODE_ENV,
	dotfile = {
		production: '.env',
		development: '.dev.env',
	}[NODE_ENV ?? 'production']

console.info(`env: ${NODE_ENV} | ${dotfile}`)

const config = dotenv.config({ path: `./${dotfile}` })

if (config.error) throw `enviroment file ${dotfile} not found`

const env = {
	HTTP_PORT: 2500,
	WS_PORT: 2501,
}

for (let key in env) {
	process.env[key] && (env[key] = env[key].constructor(process.env[key]))
}

export default env
