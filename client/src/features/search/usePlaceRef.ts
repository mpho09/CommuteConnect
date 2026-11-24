import { useQuery } from '@tanstack/react-query'
import { useApi } from '../../lib/api/apiContext'
import type { PlaceRef } from './PlacePicker'

/**
 * Looks up a stored place id (e.g. a usual origin) so it can be shown by
 * name. A place that no longer exists resolves to null.
 */
export function usePlaceRef(id: string | null): { place: PlaceRef | null; isLoading: boolean } {
  const api = useApi()
  const { data, isPending } = useQuery({
    queryKey: ['place', id],
    queryFn: () => api.getPlace(id!),
    enabled: id !== null,
    staleTime: Infinity,
  })
  if (id === null) return { place: null, isLoading: false }
  return { place: data ? { id: data.id, label: data.label } : null, isLoading: isPending }
}
