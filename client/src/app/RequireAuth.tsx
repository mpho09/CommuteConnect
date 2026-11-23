import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession, type Role } from '../lib/session/session'

/**
 * Route guard. Guests go to /login (remembering where they were heading);
 * signed-in users without a permitted role go to /forbidden.
 * With no `roles`, any signed-in user is allowed.
 */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user } = useSession()
  const location = useLocation()

  if (!user) {
    const next = location.pathname + location.search
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  if (roles && !roles.some((r) => user.roles.includes(r))) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
