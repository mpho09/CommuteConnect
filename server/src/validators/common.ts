import { z } from 'zod'

/** Reusable request schemas. Feature validators live next to this file. */
export const uuid = z.uuid({ message: 'Must be a valid id.' })

export const idParams = z.object({ id: uuid })
