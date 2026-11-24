import { useQueryClient } from '@tanstack/react-query'
import type { Me, Session } from '../../lib/api/types'
import { sessionQueryKey } from '../../lib/session/session'

/** Stores a newly signed-in user as the current session. */
export function useSetSessionUser() {
  const queryClient = useQueryClient()
  return (user: Me) => {
    queryClient.setQueryData<Session>(sessionQueryKey, { user })
  }
}
