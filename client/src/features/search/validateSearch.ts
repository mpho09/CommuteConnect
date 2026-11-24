import { isoToSastTime, minutesOf, sastToday } from '../../lib/time'
import type { PlaceRef } from './PlacePicker'

export type SearchErrors = Partial<Record<'origin' | 'destination' | 'date' | 'time', string>>

/** Dates and times are SAST (BR17); past trips are not allowed (BR4). */
export function validateSearch(
  v: { origin: PlaceRef | null; destination: PlaceRef | null; date: string; time: string },
  now: Date,
): SearchErrors {
  const errors: SearchErrors = {}
  if (!v.origin) errors.origin = 'Choose a pickup area from the list.'
  if (!v.destination) errors.destination = 'Choose a destination from the list.'
  else if (v.origin && v.origin.id === v.destination.id)
    errors.destination = 'Choose a destination different from your pickup area.'

  const today = sastToday(now)
  if (!v.date) errors.date = 'Choose a date.'
  else if (v.date < today) errors.date = 'Choose today or a future date.'
  else if (
    v.date === today &&
    v.time &&
    minutesOf(v.time) < minutesOf(isoToSastTime(now.toISOString()))
  )
    errors.time = 'That time has passed. Choose a later time or another date.'
  return errors
}
