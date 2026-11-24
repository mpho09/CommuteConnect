import type { Journey } from './api/types'
import { formatTime } from './format'
import { describeDays } from './time'

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
