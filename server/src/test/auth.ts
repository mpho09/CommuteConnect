import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose'
import type { PGlite } from '@electric-sql/pglite'
import type { AuthAdmin } from '../lib/authAdmin.ts'
import type { Db } from '../lib/db.ts'
import { createTokenVerifier } from '../lib/tokens.ts'
import type { Services } from '../routes/index.ts'

export const SUPABASE_URL = 'https://test-project.supabase.co'
export const ISSUER = `${SUPABASE_URL}/auth/v1`

/** Sample persona ids from supabase/seed.sql */
export const USERS = {
  thandi: '10000000-0000-4000-8000-000000000001',
  kabelo: '10000000-0000-4000-8000-000000000002',
  naledi: '10000000-0000-4000-8000-000000000003', // email not verified
  lerato: '10000000-0000-4000-8000-000000000004', // operator, pending
  sipho: '10000000-0000-4000-8000-000000000005', // operator, verified
  admin: '10000000-0000-4000-8000-000000000006',
  pieter: '10000000-0000-4000-8000-000000000007', // operator, rejected
  ayanda: '10000000-0000-4000-8000-000000000008', // operator, suspended
} as const

/** An ES256 key pair standing in for the project's JWT signing key. */
export async function createTestKeys() {
  const { publicKey, privateKey } = await generateKeyPair('ES256')
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'ES256' }
  const jwks = createLocalJWKSet({ keys: [jwk] })

  async function sign(
    sub: string,
    { claims = {}, expiresIn = '1h' }: { claims?: JWTPayload; expiresIn?: string } = {},
  ) {
    return new SignJWT({ role: 'authenticated', ...claims })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject(sub)
      .setIssuer(claims.iss ?? ISSUER)
      .setAudience(claims.aud ?? 'authenticated')
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(privateKey)
  }
  return { jwks, sign }
}

export function pgliteDb(db: PGlite): Db {
  return {
    query: (text, params) => db.query(text, params),
    transaction: (fn) => db.transaction((tx) => fn(tx)),
  }
}

export function fakeAuthAdmin() {
  const softDeleted: string[] = []
  const admin: AuthAdmin = {
    async softDeleteUser(id) {
      softDeleted.push(id)
    },
  }
  return { admin, softDeleted }
}

export async function testServices(pglite: PGlite) {
  const keys = await createTestKeys()
  const { admin, softDeleted } = fakeAuthAdmin()
  const services: Services = {
    db: pgliteDb(pglite),
    verifyToken: createTokenVerifier({ supabaseUrl: SUPABASE_URL, jwks: keys.jwks }),
    authAdmin: admin,
  }
  const bearer = async (userId: string) => `Bearer ${await keys.sign(userId)}`
  return { services, keys, bearer, softDeleted }
}
