import { Router } from 'express'
import { getHealth } from '../controllers/healthController.ts'
import type { AuthAdmin } from '../lib/authAdmin.ts'
import type { Db } from '../lib/db.ts'
import type { Logger } from '../lib/logger.ts'
import type { VerifyToken } from '../lib/tokens.ts'
import { authenticate } from '../middleware/auth.ts'
import { createDbPlacesProvider, type PlacesProvider } from '../services/places.ts'
import { meRouter } from './me.ts'
import { searchRouter } from './search.ts'

/** Backing services. Without them (no Supabase/DB configured) only /health is served. */
export interface Services {
  db: Db
  verifyToken: VerifyToken
  authAdmin: AuthAdmin
  /** Geocoding provider; defaults to public landmarks in the database. */
  places?: PlacesProvider
}

/** All /api routes (PRD §11.2). Feature routers are mounted here as they're built. */
export function apiRouter(
  services: Services | undefined,
  options: { logger: Logger; freshnessDays: number },
): Router {
  const router = Router()
  router.get('/health', getHealth)
  if (services) {
    router.use(authenticate(services))
    router.use('/me', meRouter(services))
    router.use(
      searchRouter({
        db: services.db,
        places: services.places ?? createDbPlacesProvider(services.db),
        logger: options.logger,
        freshnessDays: options.freshnessDays,
      }),
    )
  }
  return router
}
