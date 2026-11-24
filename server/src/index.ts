import { existsSync } from 'node:fs'
import { ConfigError, loadConfig } from './config/env.ts'
import { createApp } from './app.ts'
import { createLogger } from './lib/logger.ts'

const logger = createLogger()

if (existsSync('.env')) process.loadEnvFile('.env')

let config
try {
  config = loadConfig()
} catch (e) {
  if (e instanceof ConfigError) {
    console.error(e.message)
    process.exit(1)
  }
  throw e
}

const server = createApp(config, { logger }).listen(config.PORT, () => {
  logger.info('server started', { port: config.PORT, env: config.NODE_ENV })
})

function shutdown(signal: string) {
  logger.info('shutting down', { signal })
  server.close(() => process.exit(0))
  // Don't hang forever on open keep-alive connections.
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
