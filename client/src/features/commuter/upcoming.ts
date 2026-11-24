import type { Journey } from '../../lib/api/types'
import { formatTime } from '../../lib/format'
import { describeDays, sastToday } from '../../lib/time'

const weekdayDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Johannesburg',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/** "Mon–Fri · 06:45" or "Sat 30 Nov · 07:00" (SAST). */
export function describeSchedule(j: Journey): string {
  if (j.schedule) return `${describeDays(j.schedule.daysOfWeek)} · ${j.schedule.departureTime}`
  if (j.departureAt)
    return `${weekdayDate.format(new Date(j.departureAt))} · ${formatTime(j.departureAt)}`
  return 'Schedule to be confirmed'
}

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
