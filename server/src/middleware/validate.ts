import type { RequestHandler } from 'express'
import type { z } from 'zod'
import { ApiError } from '../lib/errors.ts'

type Part = 'body' | 'query' | 'params'
type Schemas = Partial<Record<Part, z.ZodType>>

/** Field errors keyed by input name ("seats", "origin.lat"); first message per field wins. */
export function toFieldErrors(error: z.ZodError, prefix?: Part): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : (prefix ?? '_')
    out[key] ??= issue.message
  }
  return out
}

/**
 * Validates and replaces req.body / req.query / req.params with the parsed
 * (coerced, stripped) values. Fails with a 400 'validation' error.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    const fieldErrors: Record<string, string> = {}
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part]
      if (!schema) continue
      const result = schema.safeParse(req[part] ?? {})
      if (!result.success) {
        Object.assign(fieldErrors, toFieldErrors(result.error, part))
        continue
      }
      // Express 5 exposes req.query as a getter; shadow it with the parsed value.
      Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true })
    }
    if (Object.keys(fieldErrors).length) throw new ApiError('validation', { fieldErrors })
    next()
  }
}
