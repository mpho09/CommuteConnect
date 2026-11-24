import { Bell, ChevronDown, CircleUser, LogOut, Menu, Route, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { cn } from '../lib/cn'
import type { Me } from '../lib/api/types'
import { useNotifications } from '../features/notifications/useNotifications'
import { useSession, useSignOut, type Role } from '../lib/session/session'
import { ButtonLink } from './ui/Button'

const PRIMARY_LINKS = [
  { to: '/search', label: 'Find transport' },
  { to: '/operator/setup', label: 'List your service' },
  { to: '/help', label: 'Help' },
]

const DASHBOARDS: Record<Role, { to: string; label: string }> = {
  commuter: { to: '/commuter', label: 'My dashboard' },
  operator: { to: '/operator', label: 'Operator dashboard' },
  admin: { to: '/admin', label: 'Admin' },
}

function accountLinks(user: Me) {
  return [
    ...user.roles.map((r) => DASHBOARDS[r]),
    { to: '/requests', label: 'My requests' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/settings', label: 'Profile & settings' },
  ]
}

/** Closes a popover on Escape or a click outside `ref`. */
function useDismiss(open: boolean, close: () => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, close, ref])
}

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-space-sm rounded-lg">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary-container text-on-primary shadow-sm">
        <Route aria-hidden className="size-5" />
      </span>
      <span className="text-title-md font-bold tracking-tight text-primary">
        Commute<span className="text-secondary">Connect</span>
      </span>
    </Link>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-space-sm py-2 text-body-md transition-colors',
    isActive ? 'font-title-md text-primary' : 'text-on-surface-variant hover:text-on-surface',
  )

export function TopNav() {
  const { user } = useSession()
  const signOut = useSignOut()
  const { unread } = useNotifications()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const mobileRef = useRef<HTMLDivElement>(null)
  const accountMenuId = useId()
  const mobileMenuId = useId()

  // Close menus whenever the route changes (adjusting state during render).
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMobileOpen(false)
    setAccountOpen(false)
  }

  useDismiss(accountOpen, () => setAccountOpen(false), accountRef)
  useDismiss(mobileOpen, () => setMobileOpen(false), mobileRef)

  return (
    <header className="sticky top-0 z-40 bg-surface/90 shadow-[0_1px_8px_rgb(23_59_87/0.06)] backdrop-blur-xl">
      <div ref={mobileRef}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-space-md px-margin-mobile md:h-20 md:px-gutter lg:px-margin">
          <Wordmark />

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-space-md">
              {PRIMARY_LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} className={navLinkClass}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-space-xs">
            {user ? (
              <>
                <Link
                  to="/notifications"
                  aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                  className="relative flex size-11 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary"
                >
                  <Bell aria-hidden className="size-5" />
                  {unread > 0 && (
                    <span
                      aria-hidden
                      className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-error px-1 text-label-sm text-on-error"
                    >
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                <div ref={accountRef} className="relative hidden lg:block">
                  <button
                    type="button"
                    aria-expanded={accountOpen}
                    aria-controls={accountMenuId}
                    onClick={() => setAccountOpen((o) => !o)}
                    className="flex min-h-11 items-center gap-space-xs rounded-lg px-space-sm text-label-lg font-label-lg text-on-surface hover:bg-surface-container"
                  >
                    <CircleUser aria-hidden className="size-6 text-primary-container" />
                    <span className="max-w-40 truncate">{user.fullName}</span>
                    <ChevronDown aria-hidden className="size-4" />
                    <span className="sr-only">account menu</span>
                  </button>
                  {accountOpen && (
                    <ul
                      id={accountMenuId}
                      className="absolute right-0 mt-space-xs w-56 rounded-xl border border-border-default bg-surface-container-lowest p-space-xs shadow-raised"
                    >
                      {accountLinks(user).map((l) => (
                        <li key={l.to}>
                          <Link
                            to={l.to}
                            className="flex min-h-11 items-center rounded-lg px-space-sm text-body-md text-on-surface hover:bg-surface-container"
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                      <li className="mt-space-xs border-t border-border-default pt-space-xs">
                        <button
                          type="button"
                          onClick={signOut}
                          className="flex min-h-11 w-full items-center gap-space-sm rounded-lg px-space-sm text-body-md text-on-surface hover:bg-surface-container"
                        >
                          <LogOut aria-hidden className="size-4" />
                          Log out
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-space-xs sm:flex">
                <ButtonLink to="/login" variant="ghost">
                  Log in
                </ButtonLink>
                <ButtonLink to="/signup">Sign up</ButtonLink>
              </div>
            )}

            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls={mobileMenuId}
              onClick={() => setMobileOpen((o) => !o)}
              className="flex size-11 items-center justify-center rounded-lg text-on-surface hover:bg-surface-container lg:hidden"
            >
              {mobileOpen ? (
                <X aria-hidden className="size-6" />
              ) : (
                <Menu aria-hidden className="size-6" />
              )}
              <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            id={mobileMenuId}
            aria-label="Mobile"
            className="border-t border-border-default bg-surface-container-lowest px-margin-mobile pb-space-md lg:hidden"
          >
            <ul className="flex flex-col py-space-sm">
              {[...PRIMARY_LINKS, ...(user ? accountLinks(user) : [])].map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-12 items-center rounded-lg px-space-sm text-body-lg',
                        isActive
                          ? 'bg-primary-container text-on-primary'
                          : 'text-on-surface hover:bg-surface-container',
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            {user && (
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-12 w-full items-center gap-space-sm rounded-lg px-space-sm text-body-lg text-on-surface hover:bg-surface-container"
              >
                <LogOut aria-hidden className="size-5" />
                Log out
              </button>
            )}
            {!user && (
              <div className="flex flex-col gap-space-sm">
                <ButtonLink to="/signup" fullWidth size="lg">
                  Sign up
                </ButtonLink>
                <ButtonLink to="/login" variant="outline" fullWidth size="lg">
                  Log in
                </ButtonLink>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}
