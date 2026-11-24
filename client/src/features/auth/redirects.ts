import type { Me } from '../../lib/api/types'

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password']

/**
 * The `next` destination, only if it's a path inside this app. Rejects
 * absolute and protocol-relative URLs (open-redirect protection) and the
 * auth pages themselves.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  const path = raw.split(/[?#]/)[0]
  if (AUTH_PAGES.includes(path)) return null
  return raw
}

/** Where a signed-in user lands by default (US2: the dashboard for their permissions). */
export function homeFor(user: Pick<Me, 'roles' | 'profileComplete'>): string {
  if (user.roles.includes('admin')) return '/admin'
  if (!user.profileComplete) return '/setup'
  if (user.roles.includes('commuter')) return '/commuter'
  if (user.roles.includes('operator')) return '/operator'
  return '/'
}
