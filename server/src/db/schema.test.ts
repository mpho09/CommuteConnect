import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './testDb.ts'

/**
 * Applies supabase/migrations + seed.sql to an in-memory Postgres and checks
 * the business rules the schema is responsible for (PRD §10, §4.4).
 */

const THANDI = '10000000-0000-4000-8000-000000000001'
const KABELO = '10000000-0000-4000-8000-000000000002'
const LERATO = '10000000-0000-4000-8000-000000000004'
const ADMIN = '10000000-0000-4000-8000-000000000006'
const TEMBISA = '20000000-0000-4000-8000-000000000001'
const MIDRAND = '20000000-0000-4000-8000-000000000006'
const KABELO_WEEKDAYS = '50000000-0000-4000-8000-000000000001'
const KABELO_CANCELLED = '50000000-0000-4000-8000-000000000003'
const LERATO_MWF = '50000000-0000-4000-8000-000000000004'
const GCS = '30000000-0000-4000-8000-000000000002'

let db: PGlite

beforeAll(async () => {
  db = await createTestDb({ seed: true })
}, 120_000)

const one = async <T>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows[0] as T
const count = async (sql: string, params: unknown[] = []) =>
  Number((await one<{ n: string | number }>(`select count(*) as n from (${sql}) q`, params)).n)

/** Runs `sql` in a transaction that is always rolled back; resolves to the error message, if any. */
async function attempt(sql: string, params: unknown[] = []): Promise<string | null> {
  let message: string | null = null
  await db
    .transaction(async (tx) => {
      try {
        await tx.query(sql, params)
      } catch (e) {
        message = (e as Error).message
      }
      await tx.rollback()
    })
    .catch(() => {})
  return message
}

const insertJourney = (overrides: Record<string, string> = {}) => {
  const v = {
    publisher_id: `'${KABELO}'`,
    origin_location_id: `'${TEMBISA}'`,
    destination_location_id: `'${MIDRAND}'`,
    journey_type: `'once_off'`,
    departure_at: `now() + interval '1 day'`,
    seats_available: '2',
    vehicle_capacity: '3',
    status: `'open'`,
    ...overrides,
  }
  return `insert into journeys (${Object.keys(v).join(', ')}) values (${Object.values(v).join(', ')})`
}

describe('seed data (PRD §8.4, §10.6)', () => {
  it('creates the sample personas with profiles and roles', async () => {
    expect(await count('select 1 from profiles')).toBe(8)
    const roles = await db.query<{ full_name: string; roles: string }>(`
      select p.full_name, string_agg(r.role::text, ',' order by r.role) as roles
      from profiles p join user_roles r on r.user_id = p.id group by p.full_name`)
    const byName = Object.fromEntries(roles.rows.map((r) => [r.full_name, r.roles]))
    expect(byName).toMatchObject({
      'Thandi Ndlovu': 'commuter',
      'Kabelo Maseko': 'commuter',
      'Lerato Mokoena': 'commuter,operator',
      'Sipho Dlamini': 'operator',
      'Admin Demo': 'admin',
    })
  })

  it('uses only fictional contact details', async () => {
    expect(await count(`select 1 from auth.users where email not like '%@example.com'`)).toBe(0)
    expect(await count('select 1 from profiles where phone is not null')).toBe(0)
    expect(await count('select 1 from operators where registration_number is not null')).toBe(0)
    expect(await count('select 1 from vehicles where registration_number is not null')).toBe(0)
  })

  it('labels operators, routes and journeys as SAMPLE/DEMO', async () => {
    expect(await count(`select 1 from operators where business_name not like '%Demo'`)).toBe(0)
    expect(await count(`select 1 from operator_routes where route_name not like '%(DEMO)'`)).toBe(0)
    expect(await count(`select 1 from journeys where notes not like 'SAMPLE%'`)).toBe(0)
    expect(
      await count(`select 1 from operator_documents where file_name not like 'SAMPLE-%'`),
    ).toBe(0)
  })

  it('covers every operator verification state used in demos', async () => {
    const r = await one<{ s: string }>(
      `select string_agg(verification_status::text, ',' order by verification_status) as s from operators`,
    )
    expect(r.s).toBe('pending,verified,rejected,suspended')
  })

  it('has once-off and recurring journeys, a full and a cancelled listing', async () => {
    const r = await one<{ types: string; statuses: string }>(`
      select string_agg(distinct journey_type::text, ',' order by journey_type::text) as types,
             string_agg(distinct status::text, ',' order by status::text) as statuses from journeys`)
    expect(r.types).toBe('once_off,recurring')
    expect(r.statuses).toBe('cancelled,full,open')
  })

  it('generates 10 future occurrences per recurring journey with one cancelled', async () => {
    const rows = await db.query<{
      journey_id: string
      n: number
      cancelled: number
      past: number
    }>(`
      select journey_id, count(*)::int as n,
             count(*) filter (where status = 'cancelled')::int as cancelled,
             count(*) filter (where departure_at <= now())::int as past
      from journey_occurrences group by journey_id order by journey_id`)
    expect(rows.rows).toEqual([
      { journey_id: KABELO_WEEKDAYS, n: 10, cancelled: 1, past: 0 },
      { journey_id: LERATO_MWF, n: 10, cancelled: 0, past: 0 },
    ])
  })

  it('places recurring occurrences on the scheduled weekdays at the SAST departure time', async () => {
    const bad = await count(`
      select 1 from journey_occurrences o join recurring_schedules s using (journey_id)
      where not (extract(isodow from o.departure_at at time zone 'Africa/Johannesburg')::smallint = any (s.days_of_week))
         or (o.departure_at at time zone 'Africa/Johannesburg')::time <> s.departure_time`)
    expect(bad).toBe(0)
  })

  it('has a request in each status', async () => {
    const r = await one<{ s: string }>(
      `select string_agg(distinct status::text, ',' order by status::text) as s from journey_requests`,
    )
    expect(r.s).toBe('accepted,cancelled,pending,rejected')
  })

  it('rounds private pickup points for display (BR3, BR12)', async () => {
    const r = await one<{ display_latitude: string; display_longitude: string; latitude: string }>(
      `select latitude, display_latitude, display_longitude from locations where is_private`,
    )
    expect(r.latitude).toBe('-25.997412')
    expect(r.display_latitude).toBe('-26.000000')
    expect(r.display_longitude).toBe('28.230000')
    expect(
      await count(`select 1 from locations where not is_private and display_latitude <> latitude`),
    ).toBe(0)
  })
})

describe('auth sign-up trigger', () => {
  const signUp = (id: string, meta: string) =>
    `insert into auth.users (id, email, raw_user_meta_data) values ('${id}', 'new.sample@example.com', '${meta}'::jsonb);
     select p.full_name, p.terms_accepted_at is not null as accepted,
            (select string_agg(role::text, ',' order by role) from user_roles where user_id = p.id) as roles
     from profiles p where p.id = '${id}'`

  async function run(meta: string) {
    let row: { full_name: string; accepted: boolean; roles: string } | undefined
    await db.transaction(async (tx) => {
      const id = '11111111-0000-4000-8000-000000000001'
      const results = await tx.exec(signUp(id, meta))
      row = results[1]?.rows[0] as typeof row
      await tx.rollback()
    })
    return row
  }

  it('creates a profile and requested commuter/operator roles', async () => {
    expect(
      await run(
        '{"full_name": "  Sam Sample  ", "roles": ["commuter", "operator"], "accepted_terms": true}',
      ),
    ).toEqual({ full_name: 'Sam Sample', accepted: true, roles: 'commuter,operator' })
  })

  it('never grants admin from sign-up metadata', async () => {
    expect((await run('{"full_name": "Eve", "roles": ["admin"]}'))?.roles).toBe('commuter')
  })

  it('tolerates missing or malformed metadata', async () => {
    expect(await run('{"roles": "operator", "accepted_terms": "yes please"}')).toEqual({
      full_name: 'new.sample',
      accepted: false,
      roles: 'commuter',
    })
  })
})

describe('business rule constraints', () => {
  it('accepts a valid once-off journey', async () => {
    expect(await attempt(insertJourney())).toBeNull()
  })

  it('rejects departures in the past (BR4)', async () => {
    expect(await attempt(insertJourney({ departure_at: `now() - interval '1 hour'` }))).toMatch(
      /Departure must be in the future/,
    )
  })

  it('requires a departure for once-off and none for recurring', async () => {
    expect(await attempt(insertJourney({ departure_at: 'null' }))).toMatch(/departure_matches_type/)
    expect(await attempt(insertJourney({ journey_type: `'recurring'` }))).toMatch(
      /departure_matches_type/,
    )
  })

  it('enforces seats against capacity and status (BR6)', async () => {
    expect(await attempt(insertJourney({ seats_available: '4' }))).toMatch(/seats_within_capacity/)
    expect(await attempt(insertJourney({ seats_available: '0' }))).toMatch(/open_has_seats/)
    expect(await attempt(insertJourney({ seats_available: '-1', status: `'cancelled'` }))).toMatch(
      /seats_available_check/,
    )
    expect(await attempt(insertJourney({ status: `'full'` }))).toMatch(/full_has_no_seats/)
  })

  it('rejects the same origin and destination', async () => {
    expect(await attempt(insertJourney({ destination_location_id: `'${TEMBISA}'` }))).toMatch(
      /journey_endpoints_differ/,
    )
  })

  it('requires a non-negative fare or "Contact for fare" (BR10)', async () => {
    const route = (fare: string, type: string) => `
      insert into operator_routes (operator_id, origin_location_id, destination_location_id,
        route_name, transport_type, fare_cents, fare_type, schedule_description)
      values ('${GCS}', '${TEMBISA}', '${MIDRAND}', 'Test', 'bus', ${fare}, '${type}', 'Weekdays')`
    expect(await attempt(route('1500', 'fixed'))).toBeNull()
    expect(await attempt(route('null', 'contact'))).toBeNull()
    expect(await attempt(route('-1', 'fixed'))).toMatch(/fare_cents_check/)
    expect(await attempt(route('null', 'fixed'))).toMatch(/fare_matches_type/)
    expect(await attempt(route('1500', 'contact'))).toMatch(/fare_matches_type/)
  })

  it('allows one active request per commuter and journey (BR7)', async () => {
    // Thandi already has a pending request on Kabelo's weekday journey
    const dup = `insert into journey_requests (journey_id, commuter_id) values ('${KABELO_WEEKDAYS}', '${THANDI}')`
    expect(await attempt(dup)).toMatch(/journey_requests_one_active/)
    // Lerato's earlier request was rejected, so she may ask again
    expect(
      await attempt(
        `insert into journey_requests (journey_id, commuter_id) values ('${KABELO_WEEKDAYS}', '${LERATO}')`,
      ),
    ).toBeNull()
  })

  it('blocks requests to join your own journey (BR7)', async () => {
    expect(
      await attempt(
        `insert into journey_requests (journey_id, commuter_id) values ('${KABELO_WEEKDAYS}', '${KABELO}')`,
      ),
    ).toMatch(/own journey/)
  })

  it('requires an occurrence to belong to the requested journey', async () => {
    const sql = `
      insert into journey_requests (journey_id, occurrence_id, commuter_id)
      select '${KABELO_CANCELLED}', id, '${LERATO}' from journey_occurrences
      where journey_id = '${KABELO_WEEKDAYS}' limit 1`
    expect(await attempt(sql)).toMatch(/occurrence_of_journey/)
  })

  it('only marks operators verified with a decision date (BR9)', async () => {
    expect(
      await attempt(
        `update operators set verification_status = 'verified' where business_name = 'Midrand Shuttle Demo'`,
      ),
    ).toMatch(/verified_has_date/)
  })

  it('keeps document paths out of public URLs', async () => {
    expect(
      await attempt(
        `update operator_documents set storage_path = 'https://cdn.example.com/x.pdf' where status = 'submitted'`,
      ),
    ).toMatch(/storage_path_check/)
  })
})

describe('status transitions (PRD §10.4)', () => {
  const setStatus = (table: string, col: string, to: string, where: string) =>
    attempt(`update ${table} set ${col} = '${to}' where ${where}`)

  it('allows valid request decisions and blocks reviving finished ones', async () => {
    expect(
      await attempt(
        `update journey_requests set status = 'accepted', responded_at = now() where status = 'pending'`,
      ),
    ).toBeNull()
    expect(
      await setStatus('journey_requests', 'status', 'accepted', `status = 'rejected'`),
    ).toMatch(/Invalid status change on journey_requests: rejected -> accepted/)
    expect(
      await setStatus('journey_requests', 'status', 'pending', `status = 'cancelled'`),
    ).toMatch(/cancelled -> pending/)
  })

  it('does not reopen cancelled journeys', async () => {
    expect(await setStatus('journeys', 'status', 'open', `id = '${KABELO_CANCELLED}'`)).toMatch(
      /Invalid status change on journeys: cancelled -> open/,
    )
  })

  it('follows the operator verification workflow', async () => {
    expect(
      await setStatus('operators', 'verification_status', 'under_review', `id = '${GCS}'`),
    ).toMatch(/verified -> under_review/)
    expect(
      await setStatus(
        'operators',
        'verification_status',
        'under_review',
        `business_name = 'Midrand Shuttle Demo'`,
      ),
    ).toBeNull()
  })

  it('requires a resolution note to close a report', async () => {
    expect(
      await attempt(
        `update reports set status = 'dismissed', closed_at = now() where status = 'open'`,
      ),
    ).toMatch(/resolved_has_note/)
    expect(
      await attempt(
        `update reports set status = 'dismissed', closed_at = now(), resolution_note = 'Checked' where status = 'open'`,
      ),
    ).toBeNull()
  })

  it('allows only the documented transitions for every guarded table', async () => {
    const r = await one<{ tables: string }>(
      `select string_agg(distinct table_name, ',' order by table_name) as tables from private.status_transitions`,
    )
    expect(r.tables).toBe(
      'enquiries,journey_occurrences,journey_requests,journeys,operator_routes,operators,reports',
    )
  })
})

describe('audit log and security defaults', () => {
  it('is append-only', async () => {
    expect(await attempt(`update audit_logs set action = 'tampered'`)).toMatch(/append-only/)
    expect(await attempt(`delete from audit_logs`)).toMatch(/append-only/)
    expect(
      await attempt(`insert into audit_logs (actor_id, action) values ('${ADMIN}', 'test.action')`),
    ).toBeNull()
  })

  it('enables row level security on every public table (deny by default until #23)', async () => {
    const r = await db.query<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public' and not rowsecurity`,
    )
    expect(r.rows).toEqual([])
    expect(await count(`select 1 from pg_tables where schemaname = 'public'`)).toBe(18)
  })

  it('stores timestamps as timestamptz (BR17)', async () => {
    const r = await db.query<{ col: string }>(`
      select table_name || '.' || column_name as col from information_schema.columns
      where table_schema = 'public' and data_type = 'timestamp without time zone'`)
    expect(r.rows).toEqual([])
  })
})
