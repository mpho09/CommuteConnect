import type { Db, Queryable } from '../lib/db.ts'
import { ApiError } from '../lib/errors.ts'
import type { AuthAdmin } from '../lib/authAdmin.ts'
import type { AccountStatus, Role } from './authUser.ts'

/** GET /api/me response. Matches the client's `Me` type, plus termsAcceptedAt. */
export interface Me {
  id: string
  fullName: string
  email: string
  emailVerified: boolean
  phone: string | null
  roles: Role[]
  accountStatus: AccountStatus
  preferences: {
    usualOriginId: string | null
    usualDestinationId: string | null
    /** "HH:mm" SAST */
    usualDepartureTime: string | null
    /** ISO weekdays, 1 = Monday */
    travelDays: number[]
    notifyByEmail: boolean
  }
  profileComplete: boolean
  termsAcceptedAt: string | null
  createdAt: string
}

export interface MeUpdate {
  fullName?: string
  phone?: string | null
  preferences?: Partial<Me['preferences']>
  profileComplete?: boolean
}

interface MeRow {
  id: string
  full_name: string
  email: string
  email_verified: boolean
  phone: string | null
  roles: Role[]
  account_status: AccountStatus
  usual_origin_location_id: string | null
  usual_destination_location_id: string | null
  usual_departure_time: string | null
  travel_days: number[]
  notify_by_email: boolean
  profile_complete: boolean
  terms_accepted_at: Date | null
  created_at: Date
}

const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null)

export async function getMe(db: Queryable, userId: string): Promise<Me> {
  const { rows } = await db.query<MeRow>(
    `select p.id, p.full_name, u.email, u.email_confirmed_at is not null as email_verified,
            p.phone, p.account_status::text as account_status,
            coalesce(array(select r.role::text from public.user_roles r
                           where r.user_id = p.id order by r.role), '{}') as roles,
            p.usual_origin_location_id, p.usual_destination_location_id,
            p.usual_departure_time::text as usual_departure_time,
            p.travel_days::int[] as travel_days, p.notify_by_email, p.profile_complete,
            p.terms_accepted_at, p.created_at
       from public.profiles p join auth.users u on u.id = p.id
      where p.id = $1`,
    [userId],
  )
  const r = rows[0]
  if (!r) throw new ApiError('not_found')
  return {
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    emailVerified: r.email_verified,
    phone: r.phone,
    roles: r.roles,
    accountStatus: r.account_status,
    preferences: {
      usualOriginId: r.usual_origin_location_id,
      usualDestinationId: r.usual_destination_location_id,
      usualDepartureTime: r.usual_departure_time?.slice(0, 5) ?? null,
      travelDays: r.travel_days,
      notifyByEmail: r.notify_by_email,
    },
    profileComplete: r.profile_complete,
    termsAcceptedAt: iso(r.terms_accepted_at),
    createdAt: iso(r.created_at) as string,
  }
}

/** Profile columns a user may change, keyed by API field. Anything else is rejected upstream. */
const COLUMNS = {
  fullName: 'full_name',
  phone: 'phone',
  profileComplete: 'profile_complete',
  usualOriginId: 'usual_origin_location_id',
  usualDestinationId: 'usual_destination_location_id',
  usualDepartureTime: 'usual_departure_time',
  travelDays: 'travel_days',
  notifyByEmail: 'notify_by_email',
} as const

export async function updateMe(db: Db, userId: string, update: MeUpdate): Promise<Me> {
  const fields: Partial<Record<keyof typeof COLUMNS, unknown>> = {
    fullName: update.fullName,
    phone: update.phone,
    profileComplete: update.profileComplete,
    ...update.preferences,
  }
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined) as Array<
    [keyof typeof COLUMNS, unknown]
  >

  // Saved places must be public landmarks or the user's own private points (BR3).
  const placeErrors: Record<string, string> = {}
  for (const key of ['usualOriginId', 'usualDestinationId'] as const) {
    const id = update.preferences?.[key]
    if (!id) continue
    const { rows } = await db.query(
      `select 1 from public.locations where id = $1 and (not is_private or owner_id = $2)`,
      [id, userId],
    )
    if (rows.length === 0) placeErrors[`preferences.${key}`] = 'Choose a place from the list.'
  }
  if (Object.keys(placeErrors).length)
    throw new ApiError('validation', { fieldErrors: placeErrors })

  return db.transaction(async (tx) => {
    if (entries.length) {
      // Column names come from the fixed COLUMNS map; values are parameters.
      const sets = entries.map(([k], i) => `${COLUMNS[k]} = $${i + 2}`)
      await tx.query(`update public.profiles set ${sets.join(', ')} where id = $1`, [
        userId,
        ...entries.map(([, v]) => v),
      ])
    }
    return getMe(tx, userId)
  })
}

/** Records Terms and Privacy Notice acceptance (BR18). Idempotent: keeps the first time. */
export async function acceptTerms(db: Db, userId: string): Promise<Me> {
  return db.transaction(async (tx) => {
    await tx.query(
      `update public.profiles set terms_accepted_at = coalesce(terms_accepted_at, now()) where id = $1`,
      [userId],
    )
    await tx.query(
      `insert into public.audit_logs (actor_id, action, target_type, target_id)
       values ($1, 'account.terms_accepted', 'user', $1)`,
      [userId],
    )
    return getMe(tx, userId)
  })
}

const CLOSED_REASON = 'Account closed'

/**
 * Closes an account (US3, PRD §12.4). Personal details are removed and open
 * activity is cancelled so counterparts are not left waiting. Records needed
 * for disputes, safety and legal duties (requests, enquiries, reports, audit,
 * operator records) are kept but no longer point to identifiable details.
 * Finally the Supabase Auth user is soft-deleted, which blocks sign-in.
 */
export async function deleteAccount(db: Db, authAdmin: AuthAdmin, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Tell people with active requests on this user's journeys before cancelling.
    await tx.query(
      `insert into public.notifications (recipient_id, type, title, body, link_target)
       select distinct r.commuter_id, 'journey_changed'::public.notification_type,
              'Journey cancelled', 'A journey you requested has been cancelled.', '/requests'
         from public.journey_requests r join public.journeys j on j.id = r.journey_id
        where j.publisher_id = $1 and r.status in ('pending', 'accepted')`,
      [userId],
    )
    await tx.query(
      `update public.journey_requests r set status = 'cancelled', cancel_reason = $2
         from public.journeys j
        where j.id = r.journey_id and j.publisher_id = $1 and r.status in ('pending', 'accepted')`,
      [userId, 'Journey cancelled: publisher’s account closed'],
    )
    await tx.query(
      `update public.journeys set status = 'cancelled'
        where publisher_id = $1 and status in ('draft', 'open', 'full', 'paused')`,
      [userId],
    )
    // This user's own requests to others' journeys
    await tx.query(
      `update public.journey_requests set status = 'cancelled', cancel_reason = $2
        where commuter_id = $1 and status in ('pending', 'accepted')`,
      [userId, CLOSED_REASON],
    )
    // Operator listings stop appearing; the operator record is kept for review history.
    await tx.query(
      `update public.operator_routes set status = 'inactive'
        where status in ('draft', 'active')
          and operator_id in (select id from public.operators where owner_id = $1)`,
      [userId],
    )
    // Private places: delete unused ones, strip address text from the rest.
    await tx.query(
      `update public.profiles set usual_origin_location_id = null, usual_destination_location_id = null
        where id = $1`,
      [userId],
    )
    await tx.query(
      `delete from public.locations l
        where l.owner_id = $1
          and not exists (select 1 from public.journeys j
                           where l.id in (j.origin_location_id, j.destination_location_id))
          and not exists (select 1 from public.operator_routes o
                           where l.id in (o.origin_location_id, o.destination_location_id))
          and not exists (select 1 from public.route_stops s where s.location_id = l.id)`,
      [userId],
    )
    await tx.query(
      `update public.locations set address_text = null, label = 'Removed location' where owner_id = $1`,
      [userId],
    )
    await tx.query(`delete from public.notifications where recipient_id = $1`, [userId])
    await tx.query(`delete from public.user_roles where user_id = $1`, [userId])
    await tx.query(
      `update public.profiles set
         full_name = 'Deleted user', phone = null, usual_departure_time = null,
         travel_days = '{}', notify_by_email = false, account_status = 'deleted'
       where id = $1`,
      [userId],
    )
    await tx.query(
      `insert into public.audit_logs (actor_id, action, target_type, target_id)
       values ($1, 'account.deleted', 'user', $1)`,
      [userId],
    )
  })
  // After commit: the profile is already 'deleted', so API access is blocked
  // even if this call fails; it is safe to retry.
  await authAdmin.softDeleteUser(userId)
}
