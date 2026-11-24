import { Router } from 'express'
import { meController } from '../controllers/meController.ts'
import type { AuthAdmin } from '../lib/authAdmin.ts'
import type { Db } from '../lib/db.ts'
import { requireAuth, requireSignedIn } from '../middleware/auth.ts'
import { validate } from '../middleware/validate.ts'
import { acceptTermsSchema, deleteMeSchema, meUpdateSchema } from '../validators/me.ts'

/** /api/me (PRD §11.2, US3). Reading, accepting terms and deleting work before terms are accepted. */
export function meRouter(deps: { db: Db; authAdmin: AuthAdmin }): Router {
  const c = meController(deps)
  const router = Router()
  router.get('/', requireSignedIn, c.show)
  router.patch('/', requireAuth, validate({ body: meUpdateSchema }), c.update)
  router.post('/terms', requireSignedIn, validate({ body: acceptTermsSchema }), c.terms)
  router.delete('/', requireSignedIn, validate({ body: deleteMeSchema }), c.destroy)
  return router
}
