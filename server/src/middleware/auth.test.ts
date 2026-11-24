import type { PGlite } from '@electric-sql/pglite'
import express, { type Express } from 'express'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testDb.ts'
import { silentLogger } from '../lib/logger.ts'
import { testServices, USERS } from '../test/auth.ts'
import { errorHandler } from './errorHandler.ts'
import {
  authenticate,
  requireApprovedOperator,
  requireAuth,
  requireRole,
  requireVerifiedEmail,
} from './auth.ts'
import { requestId } from './requestId.ts'

let pglite: PGlite
let app: Express
let bearer: (userId: string) => Promise<string>
let keys: Awaited<ReturnType<typeof testServices>>['keys']

beforeAll(async () => {
  pglite = await createTestDb({ seed: true })
  const t = await testServices(pglite)
  bearer = t.bearer
  keys = t.keys
  app = express()
  app.use(requestId, authenticate(t.services))
  const ok: express.RequestHandler = (req, res) => {
    res.json({ userId: req.auth?.id ?? null })
  }
  app.get('/public', ok)
  app.get('/signed-in', requireAuth, ok)
  app.get('/verified', requireAuth, requireVerifiedEmail, ok)
  app.get('/admin', requireAuth, requireRole('admin'), ok)
  app.get('/operator', requireAuth, requireRole('operator'), ok)
  app.get('/approved-operator', requireAuth, requireApprovedOperator, ok)
  app.use(errorHandler(silentLogger))
}, 120_000)

async function get(path: string, userId?: string) {
  const req = request(app).get(path)
  if (userId) req.set('Authorization', await bearer(userId))
  return req
}

describe('authenticate', () => {
  it('lets guests through to public routes', async () => {
    const res = await get('/public')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ userId: null })
  })

  it('attaches the signed-in user', async () => {
    expect((await get('/public', USERS.thandi)).body).toEqual({ userId: USERS.thandi })
  })

  it.each([
    ['a malformed header', 'Token abc'],
    ['an invalid token', 'Bearer not.a.token'],
  ])('rejects %s with 401', async (_name, header) => {
    const res = await request(app).get('/public').set('Authorization', header)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthenticated')
  })

  it('rejects a valid token for a user with no profile', async () => {
    const res = await get('/public', '99999999-0000-4000-8000-000000000000')
    expect(res.status).toBe(401)
  })
})

describe('requireAuth', () => {
  it('returns 401 for guests', async () => {
    const res = await get('/signed-in')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatchObject({
      code: 'unauthenticated',
      message: 'Your session has expired. Please sign in again.',
    })
  })

  it('blocks suspended accounts', async () => {
    await pglite.query(`update profiles set account_status = 'suspended' where id = $1`, [
      USERS.ayanda,
    ])
    const res = await get('/signed-in', USERS.ayanda)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('forbidden')
    expect(res.body.error.message).toMatch(/suspended/)
  })
})

describe('requireVerifiedEmail (BR1)', () => {
  it('blocks users who have not verified their email', async () => {
    const res = await get('/verified', USERS.naledi)
    expect(res.status).toBe(403)
    expect(res.body.error).toMatchObject({
      code: 'email_not_verified',
      message: 'Verify your email address before doing this.',
    })
  })

  it('allows verified users', async () => {
    expect((await get('/verified', USERS.thandi)).status).toBe(200)
  })

  it('sees verification as soon as it happens (not from a stale token)', async () => {
    await pglite.query(`update auth.users set email_confirmed_at = now() where id = $1`, [
      USERS.naledi,
    ])
    expect((await get('/verified', USERS.naledi)).status).toBe(200)
    await pglite.query(`update auth.users set email_confirmed_at = null where id = $1`, [
      USERS.naledi,
    ])
  })
})

describe('requireRole', () => {
  it('blocks users without the role', async () => {
    for (const [path, user] of [
      ['/admin', USERS.thandi],
      ['/admin', USERS.sipho],
      ['/operator', USERS.thandi],
    ] as const) {
      const res = await get(path, user)
      expect(res.status, `${path} as ${user}`).toBe(403)
      expect(res.body.error.code).toBe('forbidden')
    }
  })

  it('allows users with the role', async () => {
    expect((await get('/admin', USERS.admin)).status).toBe(200)
    expect((await get('/operator', USERS.lerato)).status).toBe(200)
  })

  it('ignores role claims in the token and uses the database', async () => {
    const token = await keys.sign(USERS.thandi, {
      claims: { app_metadata: { roles: ['admin'] }, user_metadata: { roles: ['admin'] } },
    })
    const res = await request(app).get('/admin').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })
})

describe('requireApprovedOperator (BR2, BR9)', () => {
  it('allows operators verified by an admin', async () => {
    expect((await get('/approved-operator', USERS.sipho)).status).toBe(200)
  })

  it('tells pending applicants their details are being reviewed', async () => {
    const res = await get('/approved-operator', USERS.lerato)
    expect(res.status).toBe(403)
    expect(res.body.error).toMatchObject({
      code: 'verification_pending',
      message: "Your details are being reviewed. We'll notify you when there's an update.",
    })
  })

  it('blocks commuters and rejected operators', async () => {
    for (const user of [USERS.thandi, USERS.pieter]) {
      const res = await get('/approved-operator', user)
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('forbidden')
    }
  })
})
