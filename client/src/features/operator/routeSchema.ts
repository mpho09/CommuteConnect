import type { FareType, RouteInput, TransportType } from '../../lib/api/types'
import type { PlaceRef } from '../search/PlacePicker'

export const MAX_STOPS = 10
export const MAX_SCHEDULE = 400

export interface RouteValues {
  routeName: string
  transportType: TransportType
  origin: PlaceRef | null
  destination: PlaceRef | null
  stops: Array<PlaceRef | null>
  scheduleDescription: string
  fareType: FareType
  /** Rands, e.g. "26" or "26.50"; ignored for "contact" */
  fare: string
}

export type RouteField = keyof RouteValues
const rands = /^\d+([.,]\d{1,2})?$/

/** Validates the route editor (BR10) and builds the API input. */
export function validateRoute(v: RouteValues): {
  errors: Partial<Record<RouteField, string>>
  input?: RouteInput
} {
  const errors: Partial<Record<RouteField, string>> = {}
  const name = v.routeName.trim()
  if (name.length < 3) errors.routeName = 'Give the route a name (at least 3 characters).'
  else if (name.length > 80) errors.routeName = 'Use 80 characters or fewer.'
  if (!v.origin) errors.origin = 'Choose a starting point from the list.'
  if (!v.destination) errors.destination = 'Choose a destination from the list.'
  else if (v.origin?.id === v.destination.id)
    errors.destination = 'Choose a destination different from the starting point.'

  const stops = v.stops
  if (stops.some((s) => s === null)) errors.stops = 'Choose each stop from the list, or remove it.'
  else {
    const ids = [v.origin?.id, ...stops.map((s) => s!.id), v.destination?.id].filter(Boolean)
    if (new Set(ids).size !== ids.length)
      errors.stops = 'Each place can appear only once on the route.'
  }

  const schedule = v.scheduleDescription.trim()
  if (!schedule) errors.scheduleDescription = 'Describe when this service runs.'
  else if (schedule.length > MAX_SCHEDULE)
    errors.scheduleDescription = `Use ${MAX_SCHEDULE} characters or fewer.`

  // BR10: a non-negative ZAR fare, or "Contact for fare" (never a made-up price).
  const fare = v.fare.trim()
  if (v.fareType !== 'contact' && !rands.test(fare))
    errors.fare = 'Enter the fare in rands, e.g. 26 or 26.50, or choose “Contact for fare”.'

  if (Object.keys(errors).length) return { errors }
  return {
    errors,
    input: {
      routeName: name,
      transportType: v.transportType,
      originId: v.origin!.id,
      destinationId: v.destination!.id,
      stopIds: stops.map((s) => s!.id),
      fareType: v.fareType,
      fareCents: v.fareType === 'contact' ? null : Math.round(Number(fare.replace(',', '.')) * 100),
      scheduleDescription: schedule,
    },
  }
}
