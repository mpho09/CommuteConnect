import { rateLimit } from 'express-rate-limit'
import { ApiError } from '../lib/errors.ts'

/**
 * Per-IP rate limiter that answers with the standard 'rate_limited' error.
 * Use the general limit for /api, and stricter ones on sensitive endpoints
 * (sign-up, enquiries, join requests, uploads, reports — PRD §12.3).
 */
export function createRateLimiter({ windowMs, limit }: { windowMs: number; limit: number }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json(new ApiError('rate_limited').toBody(req.id))
    },
  })
}
