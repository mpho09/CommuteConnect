import { useSession } from '../../lib/session/session'

/** Where "List your service" goes: sign up first, operator setup, or the existing dashboard. */
export function useListServiceLink(): string {
  const { user } = useSession()
  if (!user) return `/signup?next=${encodeURIComponent('/operator/setup')}`
  return user.roles.includes('operator') ? '/operator' : '/operator/setup'
}
