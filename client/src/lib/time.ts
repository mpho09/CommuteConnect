/**
 * SAST helpers. South Africa is UTC+2 all year (no daylight saving), so
 * conversions are a fixed offset. Dates are "YYYY-MM-DD", times "HH:mm".
 */
const OFFSET_MS = 2 * 60 * 60 * 1000

/** Today's date in SAST. */
export function sastToday(now: Date = new Date()): string {
  return new Date(now.getTime() + OFFSET_MS).toISOString().slice(0, 10)
}

/** SAST date + time -> ISO UTC string. */
export function sastToIso(date: string, time: string): string {
  return new Date(Date.parse(`${date}T${time}:00Z`) - OFFSET_MS).toISOString()
}

/** ISO UTC -> SAST "YYYY-MM-DD". */
export function isoToSastDate(iso: string): string {
  return new Date(Date.parse(iso) + OFFSET_MS).toISOString().slice(0, 10)
}

/** ISO UTC -> SAST "HH:mm". */
export function isoToSastTime(iso: string): string {
  return new Date(Date.parse(iso) + OFFSET_MS).toISOString().slice(11, 16)
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a "YYYY-MM-DD" date. */
export function weekdayOf(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** "HH:mm" -> minutes since midnight. */
export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** [1,2,3,4,5] -> "Mon–Fri"; [1,3,5] -> "Mon, Wed, Fri". */
export function describeDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b)
  if (sorted.length === 7) return 'Daily'
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1)
  if (contiguous && sorted.length >= 3) {
    return `${WEEKDAY_SHORT[sorted[0] - 1]}–${WEEKDAY_SHORT[sorted[sorted.length - 1] - 1]}`
  }
  return sorted.map((d) => WEEKDAY_SHORT[d - 1]).join(', ')
}
