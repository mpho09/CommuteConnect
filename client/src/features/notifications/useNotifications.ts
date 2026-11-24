import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../lib/api/apiContext'
import { useSession } from '../../lib/session/session'

export const notificationsKey = ['notifications', 'mine'] as const

/** How often to check for new notifications until real-time updates arrive (#30). */
const POLL_MS = 60_000

/** The signed-in user's notifications, plus read actions. Shared by the page and the nav badge. */
export function useNotifications() {
  const api = useApi()
  const { user } = useSession()
  const queryClient = useQueryClient()

  const list = useQuery({
    queryKey: notificationsKey,
    queryFn: () => api.listNotifications(),
    enabled: !!user,
    refetchInterval: POLL_MS,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationsKey })

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: refresh,
  })
  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: refresh,
  })

  const unread = (list.data ?? []).filter((n) => !n.isRead).length
  return { list, unread, markRead, markAllRead }
}
