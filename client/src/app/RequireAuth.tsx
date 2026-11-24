import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingList } from '../components/ui/States'
import { useSession, type Role } from '../lib/session/session'

/**
 * Route guard. Guests go to /login (remembering where they were heading);
 * signed-in users without a permitted role go to /forbidden.
 * With no `roles`, any signed-in user is allowed.
 */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin">
        <LoadingList count={2} label="Checking your session…" />
      </div>
    )
  }

  if (!user) {
    const next = location.pathname + location.search
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  if (roles && !roles.some((r) => user.roles.includes(r))) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
