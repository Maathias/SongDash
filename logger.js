import env from './env.js'

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',

  trace: '\x1b[90m',
  debug: '\x1b[36m',
  info: '\x1b[34m',
  warn: '\x1b[33m',
  error: '\x1b[31m',

  emphasis: '\x1b[35m',
}

const levels = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
}

const threshold = levels[env.LOG_LEVEL?.toLowerCase()] ?? levels.info

function log(level, category, message, emphasis) {
  if (levels[level] < threshold) return

  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}:${String(now.getSeconds()).padStart(2, '0')}`

  const timestamp = `${colors.dim}${time}${colors.reset}`
  const levelStr = `${colors[level]}${level.toUpperCase().padEnd(5)}${colors.reset}`
  const categoryStr = `${colors.bright}${category.padEnd(6)}${colors.reset}`

  const isDebuggerAttached = typeof process !== 'undefined' && process.execArgv?.includes('--inspect')

  const emphasisStr = emphasis
    ? ` ${colors.emphasis}[${typeof emphasis === 'object' ? JSON.stringify(emphasis) : emphasis}]${
        colors.reset
      }`
    : ''

  if (isDebuggerAttached) console.log(`${timestamp} ${levelStr} ${categoryStr} ${message}`, emphasis)
  else console.log(`${timestamp} ${levelStr} ${categoryStr} ${message}${emphasisStr}`)
}

export default {
  trace: (category, message, emphasis) => log('trace', category, message, emphasis),
  debug: (category, message, emphasis) => log('debug', category, message, emphasis),
  info: (category, message, emphasis) => log('info', category, message, emphasis),
  warn: (category, message, emphasis) => log('warn', category, message, emphasis),
  error: (category, message, emphasis) => log('error', category, message, emphasis),
}
