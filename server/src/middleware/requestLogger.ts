import type { RequestHandler } from 'express'
import type { Logger } from '../lib/logger.ts'

/**
 * Logs one line per request without PII: method, matched route pattern
 * (falls back to the path; never the query string, which can hold
 * locations), status and duration. No IPs, headers or bodies.
 */
export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const start = process.hrtime.bigint()
    res.on('finish', () => {
      const route = req.route?.path ? `${req.baseUrl}${String(req.route.path)}` : req.path
      logger.info('request', {
        requestId: req.id,
        method: req.method,
        route,
        status: res.statusCode,
        durationMs: Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10,
      })
    })
    next()
  }
}
