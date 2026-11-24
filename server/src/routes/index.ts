import { Router } from 'express'
import { getHealth } from '../controllers/healthController.ts'

/** All /api routes (PRD §11.2). Feature routers are mounted here as they're built. */
export function apiRouter(): Router {
  const router = Router()
  router.get('/health', getHealth)
  return router
}
