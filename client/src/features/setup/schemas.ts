import { z } from 'zod'
import type { PlaceRef } from '../search/PlacePicker'

/** Per-step validation for S4 Profile Setup. Mirrors the server's PATCH /api/me rules. */

export const personalSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your full name.')
    .max(80, 'Use 80 characters or fewer.'),
  // Optional; same format as the server accepts.
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?[0-9 ]{7,20}$/.test(v), {
      message: 'Enter a valid phone number, e.g. +27 82 123 4567.',
    }),
})

export type PersonalValues = z.input<typeof personalSchema>

export interface PreferenceValues {
  origin: PlaceRef | null
  destination: PlaceRef | null
  /** "HH:mm" SAST, or '' for none */
  departureTime: string
  /** ISO weekdays, 1 = Monday */
  travelDays: number[]
  notifyByEmail: boolean
}

export const preferencesSchema = z
  .object({
    origin: z.object({ id: z.string(), label: z.string() }).nullable(),
    destination: z.object({ id: z.string(), label: z.string() }).nullable(),
    departureTime: z.string(),
    travelDays: z.array(z.number().int().min(1).max(7)),
    notifyByEmail: z.boolean(),
  })
  .refine((v) => !v.origin || !v.destination || v.origin.id !== v.destination.id, {
    message: 'Choose a destination different from your usual pickup area.',
    path: ['destination'],
  })
