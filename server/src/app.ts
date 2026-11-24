import cors from 'cors'
import express, { type Express, type Router } from 'express'
import helmet from 'helmet'
import type { Config } from './config/env.ts'
import { createLogger, type Logger } from './lib/logger.ts'
import { errorHandler, notFound } from './middleware/errorHandler.ts'
import { createRateLimiter } from './middleware/rateLimit.ts'
import { requestId } from './middleware/requestId.ts'
import { requestLogger } from './middleware/requestLogger.ts'
import { apiRouter, type Services } from './routes/index.ts'

export interface AppDeps {
  logger?: Logger
  /** Database, token verifier and auth admin. Omitted: only /api/health is served. */
  services?: Services
  /** Override the /api router (tests). */
  api?: Router
}

/** Builds the Express app. Kept free of side effects (no listen) so tests can use it directly. */
export function createApp(
  config: Config,
  {
    logger = createLogger(),
    services,
    api = apiRouter(services, { logger, freshnessDays: config.LISTING_FRESHNESS_DAYS }),
  }: AppDeps = {},
): Express {
  const app = express()
  app.set('trust proxy', config.TRUST_PROXY)

  app.use(requestId)
  app.use(requestLogger(logger))
  app.use(helmet())
  app.use(
    cors({
      // No allowed origins configured (dev/test) means same-origin only.
      origin: config.CORS_ORIGINS.length ? config.CORS_ORIGINS : false,
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
      maxAge: 600,
    }),
  )
  app.use(express.json({ limit: '100kb' }))

  app.use(
    '/api',
    createRateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, limit: config.RATE_LIMIT_MAX }),
    api,
  )

  app.use(notFound)
  app.use(errorHandler(logger))
  return app
}
