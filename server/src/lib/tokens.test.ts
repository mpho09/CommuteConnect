import { SignJWT, UnsecuredJWT } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestKeys, ISSUER, SUPABASE_URL } from '../test/auth.ts'
import { ApiError } from './errors.ts'
import { createTokenVerifier, type VerifyToken } from './tokens.ts'

const USER = '10000000-0000-4000-8000-000000000001'
let keys: Awaited<ReturnType<typeof createTestKeys>>
let verify: VerifyToken

beforeAll(async () => {
  keys = await createTestKeys()
  verify = createTokenVerifier({ supabaseUrl: SUPABASE_URL, jwks: keys.jwks })
})

async function rejects(token: string, v: VerifyToken = verify) {
  const err = await v(token).catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect((err as ApiError).code).toBe('unauthenticated')
}

describe('createTokenVerifier', () => {
  it('accepts a valid Supabase user token', async () => {
    expect(await verify(await keys.sign(USER))).toEqual({ userId: USER })
  })

  it('rejects expired tokens', async () => {
    await rejects(await keys.sign(USER, { expiresIn: '-1m' }))
  })

  it('rejects tokens from another issuer or audience', async () => {
    await rejects(await keys.sign(USER, { claims: { iss: 'https://evil.example.com/auth/v1' } }))
    await rejects(await keys.sign(USER, { claims: { aud: 'anon' } }))
  })

  it('rejects anon-key tokens (no signed-in user)', async () => {
    await rejects(await keys.sign(USER, { claims: { role: 'anon' } }))
  })

  it('rejects tokens signed by another key', async () => {
    const other = await createTestKeys()
    await rejects(await other.sign(USER))
  })

  it('rejects tampered and unsigned tokens', async () => {
    const [h, , s] = (await keys.sign(USER)).split('.')
    const forged = Buffer.from(
      JSON.stringify({ sub: 'someone-else', role: 'authenticated' }),
    ).toString('base64url')
    await rejects(`${h}.${forged}.${s}`)
    const unsigned = new UnsecuredJWT({ role: 'authenticated' })
      .setSubject(USER)
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .encode()
    await rejects(unsigned)
    await rejects('not-a-jwt')
  })

  describe('legacy HS256 projects', () => {
    const secret = 'super-secret-jwt-token-with-at-least-32-characters'
    const hs256 = (key: string) =>
      new SignJWT({ role: 'authenticated' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(USER)
        .setIssuer(ISSUER)
        .setAudience('authenticated')
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(key))

    it('accepts HS256 tokens when the legacy secret is configured', async () => {
      const v = createTokenVerifier({
        supabaseUrl: SUPABASE_URL,
        jwks: keys.jwks,
        legacySecret: secret,
      })
      expect(await v(await hs256(secret))).toEqual({ userId: USER })
      await rejects(await hs256('wrong-secret-wrong-secret-wrong-secret'), v)
    })

    it('rejects HS256 tokens when no legacy secret is configured', async () => {
      await rejects(await hs256(secret))
    })
  })
})
