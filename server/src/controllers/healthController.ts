import type { RequestHandler } from 'express'

/** GET /api/health — liveness check for the host and uptime monitors. */
export const getHealth: RequestHandler = (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ status: 'ok', time: new Date().toISOString() })
}
