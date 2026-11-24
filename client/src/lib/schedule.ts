import type { Journey } from './api/types'
import { formatTime } from './format'
import { addDays, describeDays, isoToSastDate, sastToday } from './time'

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

/** ISO UTC -> "Mon 1 Dec · 06:45" (SAST), for a single trip. */
export function formatTrip(iso: string): string {
  return `${weekdayDate.format(new Date(iso))} · ${formatTime(iso)}`
}

/** ISO UTC -> "Today, 08:10", "Yesterday, 18:20" or "21 Nov, 08:00" (SAST). */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const day = isoToSastDate(iso)
  const today = sastToday(now)
  const time = formatTime(iso)
  if (day === today) return `Today, ${time}`
  if (day === addDays(today, -1)) return `Yesterday, ${time}`
  return `${dayMonth.format(new Date(iso))}, ${time}`
}

const dayMonth = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Johannesburg',
  day: 'numeric',
  month: 'short',
})
