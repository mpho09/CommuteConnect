import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { isApiError } from '../../lib/api/errors'
import type { JourneyUpdate, RequestAction } from '../../lib/api/types'

const message = (e: unknown) => (isApiError(e) ? e.message : 'Something went wrong. Try again.')

/**
 * Publisher actions on journeys and their requests. Every success refreshes
 * the journey lists, requests and occurrence data that depend on it.
 */
export function useJourneyActions() {
  const api = useApi()
  const toast = useToast()
  const queryClient = useQueryClient()

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['journeys'] }),
      queryClient.invalidateQueries({ queryKey: ['journey'] }),
      queryClient.invalidateQueries({ queryKey: ['requests'] }),
    ])

  const updateJourney = useMutation({
    mutationFn: ({ id, update }: { id: string; update: JourneyUpdate }) =>
      api.updateJourney(id, update),
    onSuccess: refresh,
  })

  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: RequestAction }) =>
      api.updateRequest(id, action),
    onSuccess: async (r) => {
      await refresh()
      toast.success(
        r.status === 'accepted' ? 'Request accepted' : 'Request declined',
        r.status === 'accepted'
          ? `${r.commuter.displayName} has been told. A seat is now taken.`
          : `${r.commuter.displayName} has been told.`,
      )
    },
    onError: async (e) => {
      // e.g. the journey filled up meanwhile (BR8): show the latest state.
      await refresh()
      toast.error('Couldn’t update the request', message(e))
    },
  })

  const cancelOccurrence = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.cancelOccurrence(id, reason),
    onSuccess: refresh,
  })

  return { updateJourney, respond, cancelOccurrence, errorMessage: message }
}
