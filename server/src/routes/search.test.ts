import type { PGlite } from '@electric-sql/pglite'
import type { Express } from 'express'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import { loadConfig } from '../config/env.ts'
import { createTestDb } from '../db/testDb.ts'
import { silentLogger } from '../lib/logger.ts'
import { testServices, USERS } from '../test/auth.ts'
import { sastToday } from '../validators/search.ts'

let pglite: PGlite
let app: Express
let services: Awaited<ReturnType<typeof testServices>>['services']
let bearer: (userId: string) => Promise<string>

const P = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const PLACE = {
  tembisaPlaza: P(1),
  tembisaRank: P(2),
  ivoryPark: P(4),
  midrandGautrain: P(6),
  midrandCbd: P(7),
  waterfall: P(8),
  kempton: P(9),
  sandton: P(10),
  parkStation: P(12),
  pretoria: P(14),
  kabeloPrivate: P(101),
}
const ROUTE = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const JOURNEY = (n: number) => `50000000-0000-4000-8000-${String(n).padStart(12, '0')}`

beforeAll(async () => {
  pglite = await createTestDb({ seed: true })
  const t = await testServices(pglite)
  services = t.services
  bearer = t.bearer
  app = createApp(loadConfig({ NODE_ENV: 'test', RATE_LIMIT_MAX: '10000' }), {
    logger: silentLogger,
    services,
  })
}, 120_000)

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
/** Next date (after today, SAST) falling on ISO weekday `dow` (1 = Mon). */
const next = (dow: number) => {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(sastToday(), i)
    const w = new Date(`${d}T00:00:00Z`).getUTCDay() || 7
    if (w === dow) return d
  }
  throw new Error('unreachable')
}

async function search(params: Record<string, string | number | boolean>, app_ = app) {
  return request(app_).get('/api/search').query(params)
}
const ids = (list: Array<{ id: string }>) => list.map((x) => x.id)

const THANDI_COMMUTE = { originId: PLACE.tembisaPlaza, destinationId: PLACE.midrandGautrain }

describe('GET /api/search (US4)', () => {
  it('returns operator routes and shared journeys as separate groups', async () => {
    const res = await search(THANDI_COMMUTE)
    expect(res.status).toBe(200)
    // Verified operator first, then the pending one (labelled, not hidden)
    expect(ids(res.body.routes)).toEqual([ROUTE(2), ROUTE(1)])
    expect(
      res.body.routes.map(
        (r: { operator: { verificationStatus: string } }) => r.operator.verificationStatus,
      ),
    ).toEqual(['verified', 'pending'])
    // Kabelo's weekday lift. Lerato's lift club starts at Ivory Park, ~3.03 km
    // away: just outside the 3 km radius.
    expect(ids(res.body.journeys)).toEqual([JOURNEY(1)])
    expect(res.body.pagination).toEqual({
      routes: { total: 2, page: 1, pageSize: 20, hasMore: false },
      journeys: { total: 1, page: 1, pageSize: 20, hasMore: false },
    })
  })

  it('returns routes in the client shape, with ordered stops', async () => {
    const res = await search(THANDI_COMMUTE)
    const taxi = res.body.routes[0]
    expect(taxi).toMatchObject({
      routeName: 'Tembisa Rank – Midrand CBD (DEMO)',
      transportType: 'minibus_taxi',
      fareCents: 1800,
      fareType: 'fixed',
      status: 'active',
      needsConfirmation: false,
      operator: { businessName: 'Gauteng Commuter Services Demo', verifiedAt: expect.any(String) },
      origin: { id: PLACE.tembisaRank, label: 'Tembisa Taxi Rank', area: 'Tembisa, Ekurhuleni' },
    })
    expect(taxi.stops.map((s: { place: { label: string } }) => s.place.label)).toEqual([
      'Ivory Park',
      'Midrand Gautrain Station',
    ])
  })

  it('shows shared journeys without private details (BR3, BR12)', async () => {
    const res = await search(THANDI_COMMUTE)
    const kabelo = res.body.journeys[0]
    expect(kabelo).toMatchObject({
      publisher: { id: USERS.kabelo, displayName: 'Kabelo M.' },
      originZone: 'Tembisa Plaza area',
      destinationZone: 'Midrand Gautrain Station area',
      originApprox: { lat: -26, lng: 28.23 },
      journeyType: 'recurring',
      departureAt: null,
      schedule: { daysOfWeek: [1, 2, 3, 4, 5], departureTime: '06:45', validUntil: null },
      seatsAvailable: 2,
      costSharingCents: 2000,
    })
    const body = JSON.stringify(res.body)
    expect(body).not.toContain('Example Street') // private address
    expect(body).not.toContain('-25.997412') // exact private coordinates
    expect(body).not.toContain('Maseko') // surname
  })

  it('respects direction: a route must pass the origin before the destination', async () => {
    const res = await search({ originId: PLACE.midrandGautrain, destinationId: PLACE.tembisaPlaza })
    expect(res.body.routes).toEqual([])
  })

  it('flags stale routes as "Needs confirmation" (BR11) using the configured window', async () => {
    const stale = await search({ originId: PLACE.kempton, destinationId: PLACE.sandton })
    expect(stale.body.routes).toMatchObject([
      { id: ROUTE(3), needsConfirmation: true, fareType: 'contact', fareCents: null },
    ])

    const lenient = createApp(
      loadConfig({ NODE_ENV: 'test', RATE_LIMIT_MAX: '10000', LISTING_FRESHNESS_DAYS: '100' }),
      { logger: silentLogger, services },
    )
    const fresh = await search({ originId: PLACE.kempton, destinationId: PLACE.sandton }, lenient)
    expect(fresh.body.routes[0].needsConfirmation).toBe(false)
  })

  it('excludes suspended operators and their routes', async () => {
    const res = await search({ originId: PLACE.pretoria, destinationId: PLACE.parkStation })
    expect(res.body.routes).toEqual([])
  })

  it('filters by transport type, with "shared" meaning shared journeys only', async () => {
    const shuttle = await search({ ...THANDI_COMMUTE, transportType: 'shuttle' })
    expect(ids(shuttle.body.routes)).toEqual([ROUTE(1)])
    expect(shuttle.body.journeys).toEqual([])
    const shared = await search({ ...THANDI_COMMUTE, transportType: 'shared' })
    expect(shared.body.routes).toEqual([])
    expect(ids(shared.body.journeys)).toEqual([JOURNEY(1)])
  })

  it('can limit routes to verified operators (BR9)', async () => {
    const res = await search({ ...THANDI_COMMUTE, verifiedOnly: true })
    expect(ids(res.body.routes)).toEqual([ROUTE(2)])
  })

  it('filters by frequency and leaves out full listings', async () => {
    const onceOff = await search({ ...THANDI_COMMUTE, frequency: 'once_off' })
    expect(onceOff.body.journeys).toEqual([])
    // Kabelo's Kempton Park -> Waterfall trip is full
    const full = await search({ originId: PLACE.kempton, destinationId: PLACE.waterfall })
    expect(full.body.journeys).toEqual([])
    // Thandi's own once-off trip home is open
    const home = await search({
      originId: PLACE.sandton,
      destinationId: PLACE.tembisaPlaza,
      frequency: 'once_off',
    })
    expect(ids(home.body.journeys)).toEqual([JOURNEY(5)])
  })

  it('matches once-off journeys on the requested date and departure window (SAST)', async () => {
    const base = { originId: PLACE.sandton, destinationId: PLACE.tembisaPlaza }
    const day = addDays(sastToday(), 5) // departs in 5 days at 17:30
    expect(ids((await search({ ...base, date: day })).body.journeys)).toEqual([JOURNEY(5)])
    expect((await search({ ...base, date: addDays(day, -1) })).body.journeys).toEqual([])
    expect(ids((await search({ ...base, date: day, time: '17:00' })).body.journeys)).toEqual([
      JOURNEY(5),
    ])
    expect((await search({ ...base, date: day, time: '15:00' })).body.journeys).toEqual([])
    expect(
      ids((await search({ ...base, date: day, time: '15:00', windowMinutes: 180 })).body.journeys),
    ).toEqual([JOURNEY(5)])
  })

  it('matches recurring journeys only on their scheduled days', async () => {
    const tuesday = await search({ ...THANDI_COMMUTE, date: next(2) })
    expect(ids(tuesday.body.journeys)).toEqual([JOURNEY(1)])
    const saturday = await search({ ...THANDI_COMMUTE, date: next(6) })
    expect(saturday.body.journeys).toEqual([])
  })

  it('leaves out a recurring journey on a day its trip was cancelled', async () => {
    const { rows } = await pglite.query<{ day: string }>(
      `select (departure_at at time zone 'Africa/Johannesburg')::date::text as day
         from journey_occurrences where journey_id = $1 and status = 'cancelled'`,
      [JOURNEY(1)],
    )
    const res = await search({ ...THANDI_COMMUTE, date: rows[0]!.day })
    expect(ids(res.body.journeys)).not.toContain(JOURNEY(1))
  })

  it('leaves out recurring journeys whose schedule has ended', async () => {
    const lift = { originId: PLACE.ivoryPark, destinationId: PLACE.midrandCbd }
    expect(ids((await search(lift)).body.journeys)).toEqual([JOURNEY(4)])
    await pglite.query(
      `update recurring_schedules set valid_until = (now() at time zone 'Africa/Johannesburg')::date - 1
        where journey_id = $1`,
      [JOURNEY(4)],
    )
    try {
      expect((await search(lift)).body.journeys).toEqual([])
    } finally {
      await pglite.query(
        `update recurring_schedules set valid_until = (now() at time zone 'Africa/Johannesburg')::date + 60
          where journey_id = $1`,
        [JOURNEY(4)],
      )
    }
  })

  it('leaves out journeys from suspended publishers', async () => {
    await pglite.query(`update profiles set account_status = 'suspended' where id = $1`, [
      USERS.kabelo,
    ])
    try {
      expect((await search(THANDI_COMMUTE)).body.journeys).toEqual([])
    } finally {
      await pglite.query(`update profiles set account_status = 'active' where id = $1`, [
        USERS.kabelo,
      ])
    }
    expect(ids((await search(THANDI_COMMUTE)).body.journeys)).toEqual([JOURNEY(1)])
  })

  it('paginates each group and sorts by fare', async () => {
    const p1 = await search({ ...THANDI_COMMUTE, pageSize: 1, page: 1 })
    expect(ids(p1.body.routes)).toEqual([ROUTE(2)])
    expect(p1.body.pagination.routes).toEqual({ total: 2, page: 1, pageSize: 1, hasMore: true })
    const p2 = await search({ ...THANDI_COMMUTE, pageSize: 1, page: 2 })
    expect(ids(p2.body.routes)).toEqual([ROUTE(1)])
    expect(p2.body.pagination.routes.hasMore).toBe(false)
    const p3 = await search({ ...THANDI_COMMUTE, pageSize: 1, page: 3 })
    expect(p3.body.routes).toEqual([])
    expect(p3.body.pagination.routes.total).toBe(2)

    const byFare = await search({ ...THANDI_COMMUTE, sort: 'fare' })
    expect(byFare.body.routes.map((r: { fareCents: number }) => r.fareCents)).toEqual([1800, 2500])
  })

  it('validates the search', async () => {
    const same = await search({ originId: PLACE.tembisaPlaza, destinationId: PLACE.tembisaPlaza })
    expect(same.status).toBe(400)
    expect(same.body.error.fieldErrors.destinationId).toBe(
      'Choose a destination different from your pickup area.',
    )

    const past = await search({ ...THANDI_COMMUTE, date: addDays(sastToday(), -1) })
    expect(past.body.error.fieldErrors.date).toBe('Choose today or a future date.')

    const unknown = await search({
      ...THANDI_COMMUTE,
      originId: '20000000-0000-4000-8000-000000000999',
    })
    expect(unknown.body.error.fieldErrors).toEqual({ originId: 'Choose a place from the list.' })

    const extra = await search({ ...THANDI_COMMUTE, lat: -26 })
    expect(extra.status).toBe(400)
  })

  it("does not accept someone else's private point as a search place", async () => {
    const guest = await search({
      originId: PLACE.kabeloPrivate,
      destinationId: PLACE.midrandGautrain,
    })
    expect(guest.body.error.fieldErrors).toEqual({ originId: 'Choose a place from the list.' })
    const owner = await request(app)
      .get('/api/search')
      .set('Authorization', await bearer(USERS.kabelo))
      .query({ originId: PLACE.kabeloPrivate, destinationId: PLACE.midrandGautrain })
    expect(owner.status).toBe(200)
  })

  it('records a search event without places or times (F11)', async () => {
    const before = await pglite.query<{ n: number }>(
      `select count(*)::int as n from analytics_events where event_type = 'search'`,
    )
    await request(app)
      .get('/api/search')
      .set('Authorization', await bearer(USERS.thandi))
      .query({ ...THANDI_COMMUTE, time: '07:00' })
    const { rows } = await pglite.query<{
      n: number
      user_id: string
      properties: Record<string, unknown>
    }>(
      `select (select count(*)::int from analytics_events where event_type = 'search') as n,
              user_id, properties
         from analytics_events where event_type = 'search' order by id desc limit 1`,
    )
    expect(rows[0]!.n).toBe(before.rows[0]!.n + 1)
    expect(rows[0]!.user_id).toBe(USERS.thandi)
    expect(rows[0]!.properties).toEqual({
      has_results: true,
      route_count: 2,
      journey_count: 1,
      frequency: 'any',
      transport_type: 'any',
      page: 1,
    })
  })
})

describe('GET /api/places', () => {
  it('finds public landmarks by name, prefix matches first', async () => {
    const res = await request(app).get('/api/places').query({ q: 'tem' })
    expect(res.status).toBe(200)
    expect(res.body.map((p: { label: string }) => p.label)).toEqual([
      'Tembisa Plaza',
      'Tembisa Taxi Rank',
    ])
    expect(res.body[0]).toEqual({
      id: PLACE.tembisaPlaza,
      label: 'Tembisa Plaza',
      area: 'Tembisa, Ekurhuleni',
      lat: -25.9963,
      lng: 28.2268,
    })
  })

  it('never returns private pickup points and treats wildcards literally', async () => {
    expect((await request(app).get('/api/places').query({ q: 'plaza area' })).body).toEqual([])
    expect((await request(app).get('/api/places').query({ q: '%%' })).body).toEqual([])
  })

  it('needs at least two characters', async () => {
    expect((await request(app).get('/api/places').query({ q: 't' })).status).toBe(400)
  })
})

describe('GET /api/operators/search', () => {
  it('lists only admin-verified operators (BR9)', async () => {
    const res = await request(app).get('/api/operators/search')
    expect(res.status).toBe(200)
    expect(res.body.operators).toEqual([
      {
        id: '30000000-0000-4000-8000-000000000002',
        businessName: 'Gauteng Commuter Services Demo',
        verificationStatus: 'verified',
        verifiedAt: expect.any(String),
        description: expect.stringContaining('DEMO'),
        serviceArea: 'Tembisa, Kempton Park, Midrand, Sandton',
        transportTypes: ['bus', 'minibus_taxi'],
        activeRouteCount: 3,
      },
    ])
    expect(res.body.pagination).toEqual({ total: 1, page: 1, pageSize: 20, hasMore: false })
    expect(JSON.stringify(res.body)).not.toContain('@example.com') // no contact email
  })

  it('filters by name/area and transport type', async () => {
    const midrand = await request(app).get('/api/operators/search').query({ q: 'midrand' })
    expect(midrand.body.operators).toHaveLength(1)
    const shuttle = await request(app)
      .get('/api/operators/search')
      .query({ transportType: 'shuttle' })
    expect(shuttle.body.operators).toEqual([])
    expect(shuttle.body.pagination.total).toBe(0)
  })
})
