import { existsSync } from 'node:fs'
import { ConfigError, loadConfig, type Config } from './config/env.ts'
import { createApp } from './app.ts'
import { createAuthAdmin } from './lib/authAdmin.ts'
import { createPgDb } from './lib/db.ts'
import { createLogger } from './lib/logger.ts'
import { createTokenVerifier } from './lib/tokens.ts'
import type { Services } from './routes/index.ts'

const logger = createLogger()

if (existsSync('.env')) process.loadEnvFile('.env')

let config: Config
try {
  config = loadConfig()
} catch (e) {
  if (e instanceof ConfigError) {
    console.error(e.message)
    process.exit(1)
  }
  throw e
}

let db: ReturnType<typeof createPgDb> | undefined
let services: Services | undefined
if (config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY && config.DATABASE_URL) {
  db = createPgDb(config.DATABASE_URL)
  services = {
    db,
    verifyToken: createTokenVerifier({
      supabaseUrl: config.SUPABASE_URL,
      legacySecret: config.SUPABASE_JWT_SECRET,
    }),
    authAdmin: createAuthAdmin(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY),
  }
} else {
  logger.warn(
    'Supabase/database not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL); only /api/health is available',
  )
}

const server = createApp(config, { logger, services }).listen(config.PORT, () => {
  logger.info('server started', { port: config.PORT, env: config.NODE_ENV })
})

function shutdown(signal: string) {
  logger.info('shutting down', { signal })
  server.close(() => {
    void (db?.close() ?? Promise.resolve()).finally(() => process.exit(0))
  })
  // Don't hang forever on open keep-alive connections.
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
