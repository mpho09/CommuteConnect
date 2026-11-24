/**
 * Display formatting. Data is stored in UTC and ZAR cents; the UI always shows
 * Africa/Johannesburg time and rands (PRD BR17).
 */
import type { OperatorRoute, TransportType } from './api/types'

export const TIME_ZONE = 'Africa/Johannesburg'

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  minibus_taxi: 'Minibus taxi',
  shuttle: 'Shuttle',
  bus: 'Bus',
  coach: 'Coach',
}

const zar = new Intl.NumberFormat('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 4500 -> "R 45.00". null means the operator didn't publish a fare (BR10). */
export function formatFare(cents: number | null): string {
  if (cents === null) return 'Contact for fare'
  // en-ZA uses a comma decimal and space grouping; the designs use "R 45.00".
  return `R ${zar
    .format(cents / 100)
    .replace(/\s/g, ' ')
    .replace(',', '.')}`
}

const time = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** ISO UTC timestamp -> "06:30" in SAST. */
export function formatTime(iso: string): string {
  return time.format(new Date(iso))
}

const date = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** ISO UTC timestamp -> "21 Nov 2026" in SAST. */
export function formatDate(iso: string): string {
  return date.format(new Date(iso))
}

/** "R 35.00", "From R 35.00" or "Contact for fare" (BR10: never a made-up price). */
export function describeFare(r: Pick<OperatorRoute, 'fareCents' | 'fareType'>): string {
  if (r.fareType === 'contact' || r.fareCents === null) return 'Contact for fare'
  return r.fareType === 'from' ? `From ${formatFare(r.fareCents)}` : formatFare(r.fareCents)
}
