import type { RequestHandler } from 'express'
import type { Db } from '../lib/db.ts'
import { ApiError } from '../lib/errors.ts'
import type { VerifyToken } from '../lib/tokens.ts'
import { loadAuthUser, type Role } from '../services/authUser.ts'

/**
 * Reads `Authorization: Bearer <Supabase access token>`. No header: continues
 * as a guest. A bad/expired token, or a deleted account: 401.
 */
export function authenticate({
  db,
  verifyToken,
}: {
  db: Db
  verifyToken: VerifyToken
}): RequestHandler {
  return async (req, _res, next) => {
    const header = req.get('authorization')
    if (!header) return next()
    const match = /^Bearer ([A-Za-z0-9._~+/=-]+)$/.exec(header)
    if (!match?.[1]) throw new ApiError('unauthenticated')
    const { userId } = await verifyToken(match[1])
    const user = await loadAuthUser(db, userId)
    if (!user || user.accountStatus === 'deleted') throw new ApiError('unauthenticated')
    req.auth = user
    next()
  }
}

/**
 * Signed in and not suspended. Use for the few routes a user needs before
 * accepting the terms (reading their profile, accepting the terms, deleting
 * their account); everything else uses `requireAuth`.
 */
export const requireSignedIn: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw new ApiError('unauthenticated')
  if (req.auth.accountStatus === 'suspended') {
    throw new ApiError('forbidden', {
      message: 'Your account is suspended. Contact support if you think this is a mistake.',
    })
  }
  next()
}

/** Signed in, not suspended, and has accepted the Terms and Privacy Notice (BR18). */
export const requireAuth: RequestHandler = (req, res, next) => {
  requireSignedIn(req, res, () => {
    if (!req.auth?.termsAccepted) throw new ApiError('terms_required')
    next()
  })
}

/** BR1: verified email before publishing, requesting or enquiring. Use after requireAuth. */
export const requireVerifiedEmail: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw new ApiError('unauthenticated')
  if (!req.auth.emailVerified) throw new ApiError('email_not_verified')
  next()
}

/** Any of the given roles. Use after requireAuth. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw new ApiError('unauthenticated')
    if (!roles.some((r) => req.auth?.roles.includes(r))) throw new ApiError('forbidden')
    next()
  }
}

/**
 * Operator role and an admin-verified operator profile (BR2, BR9). Pending or
 * under-review applications get the "being reviewed" message.
 */
export const requireApprovedOperator: RequestHandler = (req, _res, next) => {
  const user = req.auth
  if (!user) throw new ApiError('unauthenticated')
  const status = user.operator?.verificationStatus
  if (user.roles.includes('operator') && status === 'verified') return next()
  if (status === 'pending' || status === 'under_review') throw new ApiError('verification_pending')
  throw new ApiError('forbidden')
}
