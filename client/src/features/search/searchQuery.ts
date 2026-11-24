import type { Frequency, Place, SearchParams } from '../../lib/api/types'

/**
 * A search as it lives in the URL (/search/results?…), so results are
 * shareable and survive reloads. Place labels travel with the ids so the
 * results page can show the summary without another lookup.
 */
export interface SearchQuery {
  origin: Pick<Place, 'id' | 'label'>
  destination: Pick<Place, 'id' | 'label'>
  /** "YYYY-MM-DD" (SAST) */
  date?: string
  /** "HH:mm" (SAST) */
  time?: string
  frequency: Exclude<Frequency, 'any'>
}

export const SEARCH_RESULTS_PATH = '/search/results'

export function toSearchUrl(q: SearchQuery): string {
  const p = new URLSearchParams({
    from: q.origin.id,
    fromLabel: q.origin.label,
    to: q.destination.id,
    toLabel: q.destination.label,
    frequency: q.frequency,
  })
  if (q.date) p.set('date', q.date)
  if (q.time) p.set('time', q.time)
  return `${SEARCH_RESULTS_PATH}?${p}`
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Parses URL params back into a query; null if origin or destination is missing. */
export function parseSearchQuery(params: URLSearchParams): SearchQuery | null {
  const from = params.get('from')
  const to = params.get('to')
  if (!from || !to) return null
  const date = params.get('date') ?? undefined
  const time = params.get('time') ?? undefined
  return {
    origin: { id: from, label: params.get('fromLabel') || from },
    destination: { id: to, label: params.get('toLabel') || to },
    date: date && DATE_RE.test(date) ? date : undefined,
    time: time && TIME_RE.test(time) ? time : undefined,
    frequency: params.get('frequency') === 'recurring' ? 'recurring' : 'once_off',
  }
}

export function toSearchParams(q: SearchQuery): SearchParams {
  return {
    originId: q.origin.id,
    destinationId: q.destination.id,
    date: q.date,
    time: q.time,
    frequency: q.frequency,
  }
}
