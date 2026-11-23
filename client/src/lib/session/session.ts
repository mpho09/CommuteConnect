import { createContext, useContext } from 'react'

/**
 * Temporary session stub. Real auth (Supabase) arrives with the API work;
 * the mock layer (#2) will add a dev role switcher. Until then the dev
 * session can be set with VITE_DEV_ROLE=commuter|operator|admin.
 */
export type Role = 'commuter' | 'operator' | 'admin'

export interface SessionUser {
  id: string
  displayName: string
  roles: Role[]
}

export interface Session {
  user: SessionUser | null
}

export const SessionContext = createContext<Session>({ user: null })

export function useSession(): Session {
  return useContext(SessionContext)
}

const ROLES: readonly Role[] = ['commuter', 'operator', 'admin']

export function devSessionFromEnv(role: string | undefined): Session {
  if (!role || !ROLES.includes(role as Role)) return { user: null }
  return {
    user: { id: `dev-${role}`, displayName: `Dev ${role}`, roles: [role as Role] },
  }
}
