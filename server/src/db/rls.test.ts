import type { PGlite } from '@electric-sql/pglite'
import { readdir, readFile, stat } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { USERS } from '../test/auth.ts'
import { createTestDb } from './testDb.ts'

/**
 * Data boundaries for the browser-facing Supabase roles (#23, PRD §11.5):
 * guests (anon) and signed-in users (authenticated, with their JWT sub).
 * Commuter A = Thandi, commuter B = Kabelo, operators Sipho (verified) and
 * Lerato (pending), plus the admin.
 */

let db: PGlite

beforeAll(async () => {
  db = await createTestDb({ seed: true })
}, 120_000)

type Who = keyof typeof USERS | 'guest'

/** Runs `sql` as a Data API caller inside a rolled-back transaction. */
async function as<T = Record<string, unknown>>(
  who: Who,
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: T[] } | { error: string }> {
  let out: { rows: T[] } | { error: string } = { error: 'not run' }
  await db
    .transaction(async (tx) => {
      if (who === 'guest') {
        await tx.query(`set local role anon`)
      } else {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: USERS[who], role: 'authenticated' }),
        ])
        await tx.query(`set local role authenticated`)
      }
      try {
        out = { rows: (await tx.query<T>(sql, params)).rows }
      } catch (e) {
        out = { error: (e as Error).message }
      }
      await tx.rollback()
    })
    .catch(() => {})
  return out
}

async function rows<T = Record<string, unknown>>(who: Who, sql: string, params: unknown[] = []) {
  const r = await as<T>(who, sql, params)
  if ('error' in r) throw new Error(`${who}: ${r.error}`)
  return r.rows
}

async function ids(who: Who, table: string, where = 'true') {
  return (
    await rows<{ id: string }>(who, `select id from ${table} where ${where} order by id`)
  ).map((r) => r.id)
}

async function denied(who: Who, sql: string) {
  const r = await as(who, sql)
  expect('error' in r ? r.error : 'allowed', `${who}: ${sql}`).toMatch(/permission denied/)
}

const id = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`
const JOURNEY = (n: number) => id('50000000', n)
const REQUEST = (n: number) => id('60000000', n)
const KABELO_PRIVATE_POINT = id('20000000', 101)

describe('schema-wide defaults', () => {
  it('has RLS and at least one read policy on every public table', async () => {
    const r = await db.query<{ tablename: string }>(`
      select t.tablename from pg_tables t
       where t.schemaname = 'public'
         and (not t.rowsecurity
              or not exists (select 1 from pg_policies p
                              where p.schemaname = 'public' and p.tablename = t.tablename))`)
    expect(r.rows).toEqual([])
  })

  it('defines no write policies and grants no write privileges to browser roles', async () => {
    const policies = await db.query(
      `select tablename, cmd from pg_policies where schemaname = 'public' and cmd <> 'SELECT'`,
    )
    expect(policies.rows).toEqual([])
    const grants = await db.query(`
      select table_name, grantee, privilege_type from information_schema.role_table_grants
       where table_schema = 'public' and grantee in ('anon', 'authenticated')
         and privilege_type <> 'SELECT'`)
    expect(grants.rows).toEqual([])
  })

  it('rejects writes from signed-in users, even to their own rows', async () => {
    await denied('thandi', `update profiles set full_name = 'X' where id = '${USERS.thandi}'`)
    await denied('thandi', `update user_roles set role = 'admin' where user_id = '${USERS.thandi}'`)
    await denied(
      'thandi',
      `insert into journey_requests (journey_id, commuter_id) values ('${JOURNEY(4)}', '${USERS.thandi}')`,
    )
    await denied('kabelo', `update journeys set seats_available = 3 where id = '${JOURNEY(1)}'`)
    await denied('admin', `delete from reports`)
    await denied('guest', `insert into analytics_events (event_type) values ('spam')`)
  })
})

describe('guests (anon)', () => {
  it('see public listings only', async () => {
    expect(await ids('guest', 'journeys')).toEqual([JOURNEY(1), JOURNEY(2), JOURNEY(4), JOURNEY(5)])
    // Active routes of verified or pending operators; not the suspended operator's coach
    expect(await ids('guest', 'operator_routes')).toEqual([
      id('40000000', 1),
      id('40000000', 2),
      id('40000000', 3),
      id('40000000', 4),
    ])
    const ops = await rows<{ business_name: string }>(
      'guest',
      `select business_name from operators order by business_name`,
    )
    expect(ops.map((o) => o.business_name)).toEqual([
      'Gauteng Commuter Services Demo',
      'Midrand Shuttle Demo',
    ])
    expect(await rows('guest', `select 1 from journey_occurrences`)).toHaveLength(20)
  })

  it('cannot see private pickup points or personal tables', async () => {
    expect(await ids('guest', 'locations', 'is_private')).toEqual([])
    for (const t of [
      'profiles',
      'user_roles',
      'journey_requests',
      'enquiries',
      'notifications',
      'reports',
      'operator_documents',
      'vehicles',
      'audit_logs',
    ]) {
      await denied('guest', `select * from ${t}`)
    }
  })
})

describe('private columns (BR3, BR12)', () => {
  it('never exposes exact coordinates or street addresses to browser roles', async () => {
    for (const who of ['guest', 'kabelo', 'admin'] as const) {
      await denied(who, `select latitude from locations`)
      await denied(who, `select address_text from locations`)
    }
  })

  it('lets the owner see only the rounded position of their private point', async () => {
    expect(
      await rows(
        'kabelo',
        `select display_latitude, display_longitude from locations where id = $1`,
        [KABELO_PRIVATE_POINT],
      ),
    ).toEqual([{ display_latitude: '-26.000000', display_longitude: '28.230000' }])
    expect(await ids('thandi', 'locations', `id = '${KABELO_PRIVATE_POINT}'`)).toEqual([])
  })

  it('hides registration numbers', async () => {
    await denied('sipho', `select registration_number from operators`)
    await denied('sipho', `select registration_number from vehicles`)
  })
})

describe('commuter A (Thandi) vs commuter B (Kabelo)', () => {
  it('each sees only their own profile, phone and roles', async () => {
    expect(await ids('thandi', 'profiles')).toEqual([USERS.thandi])
    expect(await rows('thandi', `select phone from profiles`)).toEqual([{ phone: null }])
    expect(await ids('kabelo', 'profiles')).toEqual([USERS.kabelo])
    expect(await rows('thandi', `select user_id from user_roles`)).toEqual([
      { user_id: USERS.thandi },
    ])
  })

  it("sees others' listings but not their cancelled or draft ones", async () => {
    // Kabelo's cancelled listing is visible to Kabelo, not to Thandi
    expect(await ids('thandi', 'journeys', `id = '${JOURNEY(3)}'`)).toEqual([])
    expect(await ids('kabelo', 'journeys', `id = '${JOURNEY(3)}'`)).toEqual([JOURNEY(3)])
  })

  it('sees requests they sent and requests on their own journeys only', async () => {
    // Sent: 1 (pending to Kabelo), 2 (accepted by Lerato), 4 (cancelled). Received: 5 (Kabelo -> Thandi)
    expect(await ids('thandi', 'journey_requests')).toEqual([
      REQUEST(1),
      REQUEST(2),
      REQUEST(4),
      REQUEST(5),
    ])
    // Kabelo: received 1, 3, 4 on his journeys; sent 5. Not 2 (Thandi -> Lerato)
    expect(await ids('kabelo', 'journey_requests')).toEqual([
      REQUEST(1),
      REQUEST(3),
      REQUEST(4),
      REQUEST(5),
    ])
  })

  it('sees only their own notifications and reports', async () => {
    const mine = await rows<{ recipient_id: string }>(
      'thandi',
      `select distinct recipient_id from notifications`,
    )
    expect(mine).toEqual([{ recipient_id: USERS.thandi }])
    // Thandi filed report 1; Kabelo filed report 2. Neither sees the other's.
    expect(await ids('thandi', 'reports')).toEqual([id('90000000', 1)])
    expect(await ids('kabelo', 'reports')).toEqual([id('90000000', 2)])
  })

  it('cannot see operator documents, vehicles or back-office records', async () => {
    for (const t of [
      'operator_documents',
      'vehicles',
      'audit_logs',
      'moderation_actions',
      'analytics_events',
    ]) {
      expect(await rows('thandi', `select 1 from ${t}`), t).toEqual([])
    }
  })
})

describe('operators', () => {
  it('see enquiries on their own routes only', async () => {
    // Enquiry 1 is on Lerato's shuttle, enquiry 2 on Sipho's taxi route
    expect(await ids('sipho', 'enquiries')).toEqual([id('70000000', 2)])
    expect(await ids('lerato', 'enquiries')).toEqual([id('70000000', 1)])
    // The commuter who sent them sees both
    expect(await ids('thandi', 'enquiries')).toEqual([id('70000000', 1), id('70000000', 2)])
  })

  it('see their own verification documents and vehicles, not other operators’', async () => {
    expect(await rows('lerato', `select 1 from operator_documents`)).toHaveLength(2)
    expect(await rows('sipho', `select 1 from operator_documents`)).toEqual([])
    const vehicles = await rows<{ operator_id: string }>(
      'sipho',
      `select distinct operator_id from vehicles`,
    )
    expect(vehicles).toEqual([{ operator_id: id('30000000', 2) }])
  })

  it('see their own unlisted records, which stay hidden from others', async () => {
    // Ayanda's operator is suspended: hidden publicly, visible to its owner
    expect(await ids('thandi', 'operators', `id = '${id('30000000', 4)}'`)).toEqual([])
    expect(await ids('ayanda', 'operators')).toContain(id('30000000', 4))
    expect(await ids('ayanda', 'operator_routes', `id = '${id('40000000', 5)}'`)).toEqual([
      id('40000000', 5),
    ])
  })
})

describe('admin', () => {
  it('can read everything needed for review and moderation', async () => {
    expect(await rows('admin', `select 1 from profiles`)).toHaveLength(8)
    expect(await rows('admin', `select 1 from operators`)).toHaveLength(4)
    expect(await rows('admin', `select 1 from operator_documents`)).toHaveLength(2)
    expect(await rows('admin', `select 1 from reports`)).toHaveLength(2)
    expect(await rows('admin', `select 1 from journey_requests`)).toHaveLength(5)
    expect(await rows('admin', `select 1 from audit_logs`)).toHaveLength(3)
    expect(await rows('admin', `select 1 from locations where is_private`)).toHaveLength(1)
  })

  it("does not read other people's notifications", async () => {
    const r = await rows<{ recipient_id: string }>(
      'admin',
      `select distinct recipient_id from notifications`,
    )
    expect(r).toEqual([{ recipient_id: USERS.admin }])
  })
})

describe('projects that do not auto-expose new tables', () => {
  it('grant the same read access explicitly', async () => {
    const strict = await createTestDb({ seed: true, autoExposeTables: false })
    const read = async (role: 'anon' | 'authenticated', sql: string) => {
      let n = -1
      await strict.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: USERS.thandi }),
        ])
        await tx.query(`set local role ${role}`)
        n = (await tx.query(sql)).rows.length
        await tx.rollback()
      })
      return n
    }
    expect(await read('authenticated', 'select id from profiles')).toBe(1)
    expect(await read('authenticated', 'select id from journey_requests')).toBe(4)
    expect(await read('anon', 'select id from journeys')).toBe(4)
    expect(await read('anon', 'select id, display_latitude from locations')).toBe(14)
    await strict.close()
  }, 120_000)
})

describe('service-role key stays server-side', () => {
  const CLIENT = new URL('../../../client/', import.meta.url)
  const SECRET = /service[_-]?role|sb_secret_|SUPABASE_JWT_SECRET|DATABASE_URL/i

  async function files(dir: URL): Promise<URL[]> {
    const out: URL[] = []
    for (const name of await readdir(dir)) {
      if (['node_modules', 'dist', '.vite'].includes(name)) continue
      const url = new URL(name, dir)
      if ((await stat(url)).isDirectory()) out.push(...(await files(new URL(`${name}/`, dir))))
      else if (/\.(tsx?|jsx?|html|json|example)$|^\.env/.test(name)) out.push(url)
    }
    return out
  }

  it('is not referenced anywhere in the client app', async () => {
    const offenders: string[] = []
    for (const f of await files(CLIENT)) {
      if (SECRET.test(await readFile(f, 'utf8'))) offenders.push(f.pathname)
    }
    expect(offenders).toEqual([])
  })
})
