import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useApi } from '../api/apiContext'
import type { Me } from '../api/types'

export type { Role } from '../api/types'

export const sessionQueryKey = ['session'] as const

export interface SessionState {
  user: Me | null
  /** True until the first session check finishes. */
  isLoading: boolean
}

/** Current signed-in user, from the API (mock or Supabase Auth later). */
export function useSession(): SessionState {
  const api = useApi()
  const { data, isPending } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: () => api.getSession(),
    staleTime: Infinity,
  })
  return { user: data?.user ?? null, isLoading: isPending }
}

/** Signs out, clears all cached data (so no previous user's data lingers) and goes home. */
export function useSignOut() {
  const api = useApi()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return async () => {
    // Leave protected pages first, and render the new page synchronously;
    // otherwise the old page's guard sees "signed out" and redirects to /login.
    await navigate('/', { flushSync: true })
    await api.signOut()
    // Wipe the previous user's data; refetches the (now empty) session.
    await queryClient.resetQueries()
  }
}
