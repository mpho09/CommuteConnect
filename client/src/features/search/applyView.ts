import type { Journey, OperatorRoute, SearchResults } from '../../lib/api/types'
import { formatTime } from '../../lib/format'
import type { ResultsView, SearchQuery } from './searchQuery'

const journeyTime = (j: Journey) =>
  j.schedule?.departureTime ?? (j.departureAt ? formatTime(j.departureAt) : '99:99')

/** Client-side view options: verified filter, operator-only and sort. */
export function applyView(
  results: SearchResults,
  q: SearchQuery,
  view: ResultsView,
): { routes: OperatorRoute[]; journeys: Journey[] } {
  let routes = results.routes
  let journeys = q.type === 'operators' ? [] : results.journeys
  if (view.verifiedOnly) routes = routes.filter((r) => r.operator.verificationStatus === 'verified')
  if (view.sort === 'fare') {
    // Unpublished fares ("Contact for fare") go last.
    routes = [...routes].sort((a, b) => (a.fareCents ?? Infinity) - (b.fareCents ?? Infinity))
    journeys = [...journeys].sort((a, b) => (a.costSharingCents ?? 0) - (b.costSharingCents ?? 0))
  } else if (view.sort === 'earliest') {
    journeys = [...journeys].sort((a, b) => journeyTime(a).localeCompare(journeyTime(b)))
  }
  return { routes, journeys }
}
