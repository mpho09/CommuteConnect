import { Router } from 'express'
import { getHealth } from '../controllers/healthController.ts'
import type { AuthAdmin } from '../lib/authAdmin.ts'
import type { Db } from '../lib/db.ts'
import type { VerifyToken } from '../lib/tokens.ts'
import { authenticate } from '../middleware/auth.ts'
import { meRouter } from './me.ts'

/** Backing services. Without them (no Supabase/DB configured) only /health is served. */
export interface Services {
  db: Db
  verifyToken: VerifyToken
  authAdmin: AuthAdmin
}

/** All /api routes (PRD §11.2). Feature routers are mounted here as they're built. */
export function apiRouter(services?: Services): Router {
  const router = Router()
  router.get('/health', getHealth)
  if (services) {
    router.use(authenticate(services))
    router.use('/me', meRouter(services))
  }
  return router
}
