import type { Frequency, Place, SearchParams, TransportType } from '../../lib/api/types'
import { TRANSPORT_LABELS } from '../../lib/format'

/**
 * What to show: everything, all operator services, one vehicle type, or
 * only community shared journeys.
 */
export type TypeFilter = 'operators' | 'shared' | TransportType

export const TYPE_FILTERS: TypeFilter[] = [
  'operators',
  'minibus_taxi',
  'shuttle',
  'bus',
  'coach',
  'shared',
]

/** ± minutes around the departure time. */
export const WINDOWS = [30, 60, 120] as const
export const DEFAULT_WINDOW = 60

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
  /** ± minutes around `time`; defaults to DEFAULT_WINDOW */
  window?: number
  frequency: Exclude<Frequency, 'any'>
  /** Unset = everything */
  type?: TypeFilter
}

/** Results-page view options; they don't change what the server returns. */
export type SortOrder = 'recommended' | 'earliest' | 'fare'

export interface ResultsView {
  verifiedOnly: boolean
  sort: SortOrder
}

export const SEARCH_RESULTS_PATH = '/search/results'

export function toSearchUrl(
  q: SearchQuery,
  view: Partial<ResultsView> = {},
  path = SEARCH_RESULTS_PATH,
): string {
  const p = new URLSearchParams({
    from: q.origin.id,
    fromLabel: q.origin.label,
    to: q.destination.id,
    toLabel: q.destination.label,
    frequency: q.frequency,
  })
  if (q.date) p.set('date', q.date)
  if (q.time) p.set('time', q.time)
  if (q.time && q.window && q.window !== DEFAULT_WINDOW) p.set('window', String(q.window))
  if (q.type) p.set('type', q.type)
  if (view.verifiedOnly) p.set('verified', '1')
  if (view.sort && view.sort !== 'recommended') p.set('sort', view.sort)
  return `${path}?${p}`
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
  const window = Number(params.get('window'))
  const type = params.get('type') as TypeFilter | null
  return {
    origin: { id: from, label: params.get('fromLabel') || from },
    destination: { id: to, label: params.get('toLabel') || to },
    date: date && DATE_RE.test(date) ? date : undefined,
    time: time && TIME_RE.test(time) ? time : undefined,
    window: (WINDOWS as readonly number[]).includes(window) ? window : undefined,
    frequency: params.get('frequency') === 'recurring' ? 'recurring' : 'once_off',
    type: type && TYPE_FILTERS.includes(type) ? type : undefined,
  }
}

export function parseResultsView(params: URLSearchParams): ResultsView {
  const sort = params.get('sort')
  return {
    verifiedOnly: params.get('verified') === '1',
    sort: sort === 'earliest' || sort === 'fare' ? sort : 'recommended',
  }
}

export function toSearchParams(q: SearchQuery): SearchParams {
  return {
    originId: q.origin.id,
    destinationId: q.destination.id,
    date: q.date,
    time: q.time,
    windowMinutes: q.time ? (q.window ?? DEFAULT_WINDOW) : undefined,
    frequency: q.frequency,
    // "All operator services" is filtered on the client; the API takes one type.
    transportType: q.type === 'operators' ? undefined : q.type,
  }
}

/** Label for a transport-type filter value. */
export function typeLabel(t: TypeFilter): string {
  if (t === 'operators') return 'All operator services'
  if (t === 'shared') return 'Community shared journeys'
  return TRANSPORT_LABELS[t]
}
