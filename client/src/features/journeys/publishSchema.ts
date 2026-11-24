import { z } from 'zod'
import type { JourneyInput, JourneyType } from '../../lib/api/types'
import { sastToIso, sastToday } from '../../lib/time'
import type { PlaceRef } from '../search/PlacePicker'

export const MAX_VEHICLE_SEATS = 15
export const MAX_NOTES = 500
/** A sanity cap; contributions should only cover running costs (BR16). */
export const MAX_CONTRIBUTION_RANDS = 500

/** Form state for S9 Publish Journey. Numbers stay strings until validated. */
export interface PublishValues {
  journeyType: JourneyType
  origin: PlaceRef | null
  destination: PlaceRef | null
  /** Once-off: "YYYY-MM-DD" and "HH:mm" in SAST */
  date: string
  time: string
  /** Recurring */
  daysOfWeek: number[]
  departureTime: string
  validFrom: string
  validUntil: string
  vehicleCapacity: string
  seatsAvailable: string
  /** Optional cost-sharing contribution in rands, e.g. "25" or "25.50" */
  contribution: string
  notes: string
  /** BR16 acknowledgement */
  eligible: boolean
}

export type PublishField = keyof PublishValues

const wholeNumber = /^\d+$/
const rands = /^\d+([.,]\d{1,2})?$/

/**
 * Validates the form (BR4, BR5, BR6, BR16) and builds the API input. Errors
 * are keyed by field, first message per field.
 */
export function validatePublish(
  v: PublishValues,
  now: Date,
): { errors: Partial<Record<PublishField, string>>; input?: JourneyInput } {
  const schema = z.custom<PublishValues>().superRefine((val, ctx) => {
    const add = (path: PublishField, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })

    if (!val.origin) add('origin', 'Choose a pickup area from the list.')
    if (!val.destination) add('destination', 'Choose a destination from the list.')
    else if (val.origin?.id === val.destination.id)
      add('destination', 'Choose a destination different from your pickup area.')

    const today = sastToday(now)
    if (val.journeyType === 'once_off') {
      // BR4: a future local departure.
      if (!val.date) add('date', 'Choose a date.')
      else if (val.date < today) add('date', 'Choose today or a future date.')
      if (!val.time) add('time', 'Choose a departure time.')
      else if (
        val.date &&
        val.date >= today &&
        Date.parse(sastToIso(val.date, val.time)) <= now.getTime()
      )
        add('time', 'That time has passed. Choose a later time.')
    } else {
      // BR5: days, start date, time; end date optional but not before start.
      if (val.daysOfWeek.length === 0) add('daysOfWeek', 'Choose at least one day.')
      if (!val.departureTime) add('departureTime', 'Choose a departure time.')
      if (!val.validFrom) add('validFrom', 'Choose a start date.')
      else if (val.validFrom < today) add('validFrom', 'Start today or later.')
      if (val.validUntil && val.validFrom && val.validUntil < val.validFrom)
        add('validUntil', 'The end date can’t be before the start date.')
    }

    // BR6: positive whole seats, not more than the vehicle's passenger seats.
    const capacity = Number(val.vehicleCapacity)
    const capacityOk =
      wholeNumber.test(val.vehicleCapacity) && capacity >= 1 && capacity <= MAX_VEHICLE_SEATS
    if (!capacityOk)
      add('vehicleCapacity', `Enter your vehicle’s passenger seats (1–${MAX_VEHICLE_SEATS}).`)
    const seats = Number(val.seatsAvailable)
    if (!wholeNumber.test(val.seatsAvailable) || seats < 1)
      add('seatsAvailable', 'Offer at least one seat (a whole number).')
    else if (capacityOk && seats > capacity)
      add('seatsAvailable', 'You can’t offer more seats than your vehicle has.')

    const c = val.contribution.trim()
    if (c && (!rands.test(c) || Number(c.replace(',', '.')) > MAX_CONTRIBUTION_RANDS))
      add(
        'contribution',
        `Enter an amount in rands up to R ${MAX_CONTRIBUTION_RANDS}, e.g. 25 or 25.50.`,
      )

    if (val.notes.length > MAX_NOTES) add('notes', `Use ${MAX_NOTES} characters or fewer.`)
    if (!val.eligible) add('eligible', 'Confirm this is a cost-sharing trip you’re making anyway.')
  })

  const parsed = schema.safeParse(v)
  if (!parsed.success) {
    const errors: Partial<Record<PublishField, string>> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as PublishField
      errors[key] ??= issue.message
    }
    return { errors }
  }

  const c = v.contribution.trim()
  return {
    errors: {},
    input: {
      originId: v.origin!.id,
      destinationId: v.destination!.id,
      journeyType: v.journeyType,
      departureAt: v.journeyType === 'once_off' ? sastToIso(v.date, v.time) : null,
      schedule:
        v.journeyType === 'recurring'
          ? {
              daysOfWeek: v.daysOfWeek,
              departureTime: v.departureTime,
              validFrom: v.validFrom,
              validUntil: v.validUntil || null,
            }
          : null,
      seatsAvailable: Number(v.seatsAvailable),
      vehicleCapacity: Number(v.vehicleCapacity),
      costSharingCents: c ? Math.round(Number(c.replace(',', '.')) * 100) : null,
      notes: v.notes.trim(),
    },
  }
}
