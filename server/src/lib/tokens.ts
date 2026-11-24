import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { ApiError } from './errors.ts'

/** Verified identity from a Supabase access token. */
export interface TokenClaims {
  userId: string
}

export type VerifyToken = (token: string) => Promise<TokenClaims>

const ASYMMETRIC = ['ES256', 'RS256']

/**
 * Verifies Supabase Auth access tokens: signature (project JWKS, or the
 * legacy shared secret for HS256 projects), issuer, audience, expiry and the
 * `authenticated` role. Any failure is a 401; the reason is not revealed.
 */
export function createTokenVerifier(options: {
  supabaseUrl: string
  /** Override the key source (tests). Defaults to the project's JWKS endpoint. */
  jwks?: JWTVerifyGetKey
  /** Legacy HS256 JWT secret, if the project still uses it. */
  legacySecret?: string
}): VerifyToken {
  const base = options.supabaseUrl.replace(/\/+$/, '')
  const issuer = `${base}/auth/v1`
  const jwks = options.jwks ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
  const secret = options.legacySecret ? new TextEncoder().encode(options.legacySecret) : null

  return async (token) => {
    try {
      const { alg } = decodeProtectedHeader(token)
      const common = { issuer, audience: 'authenticated', clockTolerance: 5 }
      const { payload } =
        alg === 'HS256' && secret
          ? await jwtVerify(token, secret, { ...common, algorithms: ['HS256'] })
          : await jwtVerify(token, jwks, { ...common, algorithms: ASYMMETRIC })
      if (payload.role !== 'authenticated' || typeof payload.sub !== 'string' || !payload.sub) {
        throw new Error('not a user token')
      }
      return { userId: payload.sub }
    } catch {
      throw new ApiError('unauthenticated')
    }
  }
}
