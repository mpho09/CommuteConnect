import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ApiError } from '../lib/errors.ts'
import type { Logger } from '../lib/logger.ts'

/** Unmatched routes. */
export const notFound: RequestHandler = () => {
  throw new ApiError('not_found')
}

/** body-parser errors carry a `type`; map the ones caused by bad client input. */
function fromBodyParser(err: unknown): ApiError | null {
  const type = (err as { type?: unknown })?.type
  if (type === 'entity.parse.failed')
    return new ApiError('validation', { message: 'The request body is not valid JSON.' })
  if (type === 'entity.too.large') return new ApiError('payload_too_large')
  if (type === 'encoding.unsupported' || type === 'charset.unsupported')
    return new ApiError('validation', { message: 'Unsupported request encoding.' })
  return null
}

/**
 * Turns any thrown error into the standard error body. Unexpected errors are
 * logged with the request id (no request data) and hidden from the client.
 */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  // Express identifies error handlers by arity, so all four params are required.
  return (err, req, res, _next) => {
    const apiError = err instanceof ApiError ? err : fromBodyParser(err)
    if (apiError) {
      res.status(apiError.status).json(apiError.toBody(req.id))
      return
    }
    logger.error('unhandled error', {
      requestId: req.id,
      name: err instanceof Error ? err.name : typeof err,
      stack: err instanceof Error ? err.stack : undefined,
    })
    res.status(500).json(new ApiError('server_error').toBody(req.id))
  }
}
