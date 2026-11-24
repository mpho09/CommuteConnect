import type { PGlite } from '@electric-sql/pglite'
import type { Express } from 'express'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import { loadConfig } from '../config/env.ts'
import { createTestDb } from '../db/testDb.ts'
import { silentLogger } from '../lib/logger.ts'
import { testServices, USERS } from '../test/auth.ts'

let pglite: PGlite
let app: Express
let bearer: (userId: string) => Promise<string>
let softDeleted: string[]

beforeAll(async () => {
  pglite = await createTestDb({ seed: true })
  const t = await testServices(pglite)
  bearer = t.bearer
  softDeleted = t.softDeleted
  app = createApp(loadConfig({ NODE_ENV: 'test', RATE_LIMIT_MAX: '10000' }), {
    logger: silentLogger,
    services: t.services,
  })
}, 120_000)

const as = async (userId: string) => ({ Authorization: await bearer(userId) })
const TEMBISA = '20000000-0000-4000-8000-000000000001'
const MIDRAND = '20000000-0000-4000-8000-000000000006'
const KABELO_PRIVATE_POINT = '20000000-0000-4000-8000-000000000101'

describe('GET /api/me', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get('/api/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthenticated')
  })

  it('returns the signed-in profile in the client shape', async () => {
    const res = await request(app)
      .get('/api/me')
      .set(await as(USERS.thandi))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: USERS.thandi,
      fullName: 'Thandi Ndlovu',
      email: 'thandi.sample@example.com',
      emailVerified: true,
      phone: null,
      roles: ['commuter'],
      accountStatus: 'active',
      preferences: {
        usualOriginId: TEMBISA,
        usualDestinationId: MIDRAND,
        usualDepartureTime: '07:00',
        travelDays: [1, 2, 3, 4, 5],
        notifyByEmail: true,
      },
      profileComplete: true,
      termsAcceptedAt: expect.any(String),
      createdAt: expect.stringMatching(/Z$/),
    })
  })

  it('shows unverified email and multiple roles', async () => {
    const naledi = await request(app)
      .get('/api/me')
      .set(await as(USERS.naledi))
    expect(naledi.body).toMatchObject({ emailVerified: false, profileComplete: false })
    const lerato = await request(app)
      .get('/api/me')
      .set(await as(USERS.lerato))
    expect(lerato.body.roles).toEqual(['commuter', 'operator'])
  })
})

describe('PATCH /api/me (US3)', () => {
  it('updates allowed fields and returns the new profile', async () => {
    const res = await request(app)
      .patch('/api/me')
      .set(await as(USERS.naledi))
      .send({
        fullName: '  Naledi K.  ',
        phone: '+27 82 000 0000',
        profileComplete: true,
        preferences: { usualOriginId: TEMBISA, usualDepartureTime: '06:30', travelDays: [2, 4] },
      })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      fullName: 'Naledi K.',
      phone: '+27 82 000 0000',
      profileComplete: true,
      preferences: {
        usualOriginId: TEMBISA,
        usualDestinationId: null,
        usualDepartureTime: '06:30',
        travelDays: [2, 4],
        notifyByEmail: true,
      },
    })
  })

  it.each([
    ['roles', { roles: ['admin'] }],
    ['accountStatus', { accountStatus: 'active' }],
    ['email', { email: 'someone@example.com' }],
    ['emailVerified', { emailVerified: true }],
    ['termsAcceptedAt', { termsAcceptedAt: '2020-01-01T00:00:00Z' }],
    ['a nested unknown preference', { preferences: { isAdmin: true } }],
  ])('rejects attempts to change %s', async (_name, body) => {
    const res = await request(app)
      .patch('/api/me')
      .set(await as(USERS.thandi))
      .send(body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation')
    const roles = await pglite.query(`select role from user_roles where user_id = $1`, [
      USERS.thandi,
    ])
    expect(roles.rows).toEqual([{ role: 'commuter' }])
  })

  it('validates values with field errors', async () => {
    const res = await request(app)
      .patch('/api/me')
      .set(await as(USERS.thandi))
      .send({ fullName: ' ', phone: 'call me', preferences: { travelDays: [1, 1, 9] } })
    expect(res.status).toBe(400)
    expect(Object.keys(res.body.error.fieldErrors).sort()).toEqual([
      'fullName',
      'phone',
      'preferences.travelDays',
      'preferences.travelDays.2',
    ])
  })

  it('rejects an empty update', async () => {
    const res = await request(app)
      .patch('/api/me')
      .set(await as(USERS.thandi))
      .send({})
    expect(res.status).toBe(400)
  })

  it("rejects unknown places and other users' private points (BR3)", async () => {
    const unknown = await request(app)
      .patch('/api/me')
      .set(await as(USERS.thandi))
      .send({ preferences: { usualOriginId: '20000000-0000-4000-8000-000000000999' } })
    expect(unknown.status).toBe(400)
    expect(unknown.body.error.fieldErrors).toEqual({
      'preferences.usualOriginId': 'Choose a place from the list.',
    })
    const someoneElses = await request(app)
      .patch('/api/me')
      .set(await as(USERS.thandi))
      .send({ preferences: { usualOriginId: KABELO_PRIVATE_POINT } })
    expect(someoneElses.status).toBe(400)
  })

  it('requires a session', async () => {
    expect((await request(app).patch('/api/me').send({ fullName: 'X' })).status).toBe(401)
  })
})

describe('Terms and Privacy Notice consent (BR18)', () => {
  const NEW_USER = '11111111-0000-4000-8000-000000000002'

  beforeAll(async () => {
    // Signed up straight through Supabase without ticking the consent box
    await pglite.query(
      `insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
       values ($1, 'direct.sample@example.com', now(), '{"full_name": "Direct Signup"}')`,
      [NEW_USER],
    )
  })

  it('lets the user read their profile, showing consent is missing', async () => {
    const res = await request(app)
      .get('/api/me')
      .set(await as(NEW_USER))
    expect(res.status).toBe(200)
    expect(res.body.termsAcceptedAt).toBeNull()
  })

  it('blocks other actions until the terms are accepted', async () => {
    const res = await request(app)
      .patch('/api/me')
      .set(await as(NEW_USER))
      .send({ fullName: 'D' })
    expect(res.status).toBe(403)
    expect(res.body.error).toMatchObject({
      code: 'terms_required',
      message: 'Accept the Terms and Privacy Notice to continue.',
    })
  })

  it('requires explicit acceptance', async () => {
    const res = await request(app)
      .post('/api/me/terms')
      .set(await as(NEW_USER))
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error.fieldErrors).toHaveProperty('accept')
  })

  it('records acceptance with an audit entry, then allows actions', async () => {
    const res = await request(app)
      .post('/api/me/terms')
      .set(await as(NEW_USER))
      .send({ accept: true })
    expect(res.status).toBe(200)
    expect(res.body.termsAcceptedAt).toEqual(expect.any(String))
    const audit = await pglite.query(
      `select 1 from audit_logs where actor_id = $1 and action = 'account.terms_accepted'`,
      [NEW_USER],
    )
    expect(audit.rows).toHaveLength(1)
    const patch = await request(app)
      .patch('/api/me')
      .set(await as(NEW_USER))
      .send({ fullName: 'Direct Sample' })
    expect(patch.status).toBe(200)
  })
})

describe('DELETE /api/me (US3, PRD §12.4)', () => {
  it('requires explicit confirmation', async () => {
    const res = await request(app)
      .delete('/api/me')
      .set(await as(USERS.kabelo))
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error.fieldErrors).toEqual({
      confirm: 'Confirm that you want to delete your account.',
    })
    expect(softDeleted).toEqual([])
  })

  it('anonymises the account, cancels open activity and keeps retained records', async () => {
    const res = await request(app)
      .delete('/api/me')
      .set(await as(USERS.kabelo))
      .send({ confirm: true })
    expect(res.status).toBe(204)
    expect(softDeleted).toEqual([USERS.kabelo])

    const q = async (sql: string) => (await pglite.query(sql, [USERS.kabelo])).rows

    expect(await q(`select full_name, phone, account_status from profiles where id = $1`)).toEqual([
      { full_name: 'Deleted user', phone: null, account_status: 'deleted' },
    ])
    expect(await q(`select 1 from user_roles where user_id = $1`)).toEqual([])
    expect(await q(`select 1 from notifications where recipient_id = $1`)).toEqual([])

    // Their listings are cancelled; nothing open remains
    expect(
      await q(`select distinct status from journeys where publisher_id = $1 order by status`),
    ).toEqual([{ status: 'cancelled' }])
    // People waiting on their journeys are released and told
    const thandi = await pglite.query<{ status: string; cancel_reason: string }>(
      `select r.status, r.cancel_reason from journey_requests r
        where r.commuter_id = $1 and r.journey_id = '50000000-0000-4000-8000-000000000001'`,
      [USERS.thandi],
    )
    expect(thandi.rows).toEqual([
      { status: 'cancelled', cancel_reason: 'Journey cancelled: publisher’s account closed' },
    ])
    const notified = await pglite.query(
      `select 1 from notifications where recipient_id = $1 and type = 'journey_changed'
         and created_at > now() - interval '1 minute'`,
      [USERS.thandi],
    )
    expect(notified.rows).toHaveLength(1)
    // Their own pending request is cancelled, but the record is kept
    expect(
      await q(
        `select status, cancel_reason from journey_requests where commuter_id = $1 and created_at > now() - interval '1 day'`,
      ),
    ).toEqual([{ status: 'cancelled', cancel_reason: 'Account closed' }])

    // Private point still referenced by a (cancelled) journey: kept but stripped
    const point = await pglite.query(`select label, address_text from locations where id = $1`, [
      KABELO_PRIVATE_POINT,
    ])
    expect(point.rows).toEqual([{ label: 'Removed location', address_text: null }])

    // Reports they filed are retained for safety purposes
    expect(await q(`select 1 from reports where reporter_id = $1`)).toHaveLength(1)
    expect(
      await q(`select 1 from audit_logs where actor_id = $1 and action = 'account.deleted'`),
    ).toHaveLength(1)
  })

  it('signs the user out of the API afterwards', async () => {
    const res = await request(app)
      .get('/api/me')
      .set(await as(USERS.kabelo))
    expect(res.status).toBe(401)
  })
})

describe('without Supabase configured', () => {
  it('serves only the health check', async () => {
    const bare = createApp(loadConfig({ NODE_ENV: 'test' }), { logger: silentLogger })
    expect((await request(bare).get('/api/health')).status).toBe(200)
    expect((await request(bare).get('/api/me')).status).toBe(404)
  })
})
