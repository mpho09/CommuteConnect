import { z } from 'zod'
import { uuid } from './common.ts'

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000
/** Today's date in South Africa (UTC+2, no daylight saving). */
export const sastToday = (now = new Date()) =>
  new Date(now.getTime() + SAST_OFFSET_MS).toISOString().slice(0, 10)

const page = z.coerce.number().int().min(1).max(1000).default(1)
const pageSize = z.coerce.number().int().min(1).max(50).default(20)

/** GET /api/search query (US4). */
export const searchQuerySchema = z
  .object({
    originId: uuid,
    destinationId: uuid,
    date: z.iso
      .date({ message: 'Use the format YYYY-MM-DD.' })
      .refine((d) => d >= sastToday(), 'Choose today or a future date.')
      .optional(),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the format HH:mm.')
      .optional(),
    windowMinutes: z.coerce.number().int().min(15).max(180).default(60),
    frequency: z.enum(['once_off', 'recurring', 'any']).default('any'),
    transportType: z.enum(['minibus_taxi', 'shuttle', 'bus', 'coach', 'shared']).optional(),
    verifiedOnly: z.stringbool().default(false),
    sort: z.enum(['recommended', 'fare', 'recent']).default('recommended'),
    page,
    pageSize,
  })
  .strict()
  .refine((v) => v.originId !== v.destinationId, {
    message: 'Choose a destination different from your pickup area.',
    path: ['destinationId'],
  })

/** GET /api/places */
export const placesQuerySchema = z
  .object({ q: z.string().trim().min(2, 'Type at least 2 characters.').max(100) })
  .strict()

/** GET /api/operators/search */
export const operatorSearchQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    transportType: z.enum(['minibus_taxi', 'shuttle', 'bus', 'coach']).optional(),
    page,
    pageSize,
  })
  .strict()
