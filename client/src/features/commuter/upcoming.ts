import type { Journey } from '../../lib/api/types'
import { sastToday } from '../../lib/time'

const ACTIVE: Journey['status'][] = ['open', 'full', 'paused']

/** Still to happen: a future once-off trip, or a recurring one that hasn't ended. */
export function isUpcoming(j: Journey, now: Date): boolean {
  if (!ACTIVE.includes(j.status)) return false
  if (j.journeyType === 'once_off') return !!j.departureAt && new Date(j.departureAt) >= now
  const until = j.schedule?.validUntil
  return !until || until >= sastToday(now)
}

/** Once-off trips by date first, then recurring ones. */
export function byNextDeparture(a: Journey, b: Journey): number {
  return (a.departureAt ?? '~').localeCompare(b.departureAt ?? '~')
}
