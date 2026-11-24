import type { Queryable } from '../lib/db.ts'

export type Role = 'commuter' | 'operator' | 'admin'
export type AccountStatus = 'active' | 'restricted' | 'suspended' | 'deleted'
export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended'

/** What the API knows about the caller on every authenticated request. */
export interface AuthUser {
  id: string
  emailVerified: boolean
  roles: Role[]
  accountStatus: AccountStatus
  termsAccepted: boolean
  /** The user's operator profile, if they have one. */
  operator: { id: string; verificationStatus: VerificationStatus } | null
}

interface Row {
  id: string
  email_verified: boolean
  roles: Role[]
  account_status: AccountStatus
  terms_accepted: boolean
  operator_id: string | null
  operator_status: VerificationStatus | null
}

/**
 * Loads the caller's roles and status from the database on each request, so
 * role changes, suspensions and email verification take effect immediately
 * (token claims are never trusted for permissions). Null if no profile.
 */
export async function loadAuthUser(db: Queryable, userId: string): Promise<AuthUser | null> {
  const { rows } = await db.query<Row>(
    `select p.id,
            u.email_confirmed_at is not null as email_verified,
            coalesce(array(select r.role::text from public.user_roles r
                           where r.user_id = p.id order by r.role), '{}') as roles,
            p.account_status::text as account_status,
            p.terms_accepted_at is not null as terms_accepted,
            o.id as operator_id,
            o.verification_status::text as operator_status
       from public.profiles p
       join auth.users u on u.id = p.id
       left join lateral (
         select id, verification_status from public.operators
          where owner_id = p.id order by created_at limit 1
       ) o on true
      where p.id = $1`,
    [userId],
  )
  const r = rows[0]
  if (!r) return null
  return {
    id: r.id,
    emailVerified: r.email_verified,
    roles: r.roles,
    accountStatus: r.account_status,
    termsAccepted: r.terms_accepted,
    operator: r.operator_id
      ? { id: r.operator_id, verificationStatus: r.operator_status as VerificationStatus }
      : null,
  }
}
