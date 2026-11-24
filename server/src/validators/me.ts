import { z } from 'zod'
import { uuid } from './common.ts'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * PATCH /api/me. Strict: any other key (roles, accountStatus, email,
 * emailVerified, termsAcceptedAt, …) is rejected, so protected fields can't be
 * changed from the client (US3).
 */
export const meUpdateSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Enter your name.').max(80, 'Use 80 characters or fewer.'),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{7,20}$/, 'Enter a valid phone number, e.g. +27 82 123 4567.')
      .nullable(),
    preferences: z
      .object({
        usualOriginId: uuid.nullable(),
        usualDestinationId: uuid.nullable(),
        usualDepartureTime: z.string().regex(HHMM, 'Use the format HH:mm.').nullable(),
        travelDays: z
          .array(z.number().int().min(1).max(7))
          .max(7)
          .refine((d) => new Set(d).size === d.length, 'Each day can only be chosen once.'),
        notifyByEmail: z.boolean(),
      })
      .partial()
      .strict(),
    profileComplete: z.boolean(),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one field to update.')
  .refine(
    (v) =>
      !v.preferences?.usualOriginId ||
      v.preferences.usualOriginId !== v.preferences.usualDestinationId,
    {
      message: 'Choose a destination different from your usual origin.',
      path: ['preferences', 'usualDestinationId'],
    },
  )

/** DELETE /api/me: an explicit confirmation, so a stray request can't close an account (US3). */
export const deleteMeSchema = z.object({
  confirm: z.literal(true, { message: 'Confirm that you want to delete your account.' }),
})

/** POST /api/me/terms */
export const acceptTermsSchema = z.object({
  accept: z.literal(true, { message: 'Accept the Terms and Privacy Notice to continue.' }),
})
