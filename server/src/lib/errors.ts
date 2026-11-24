/**
 * API error codes, HTTP statuses and user-facing messages (PRD §12.2).
 * Codes match the client's ApiErrorCode so the UI can branch on them.
 *
 * Every error response has the shape:
 *   { "error": { "code", "message", "fieldErrors"?, "requestId"? } }
 */
export const ERRORS = {
  validation: { status: 400, message: 'Some details need fixing.' },
  unauthenticated: { status: 401, message: 'Your session has expired. Please sign in again.' },
  invalid_credentials: { status: 401, message: 'That email and password don’t match.' },
  forbidden: { status: 403, message: "You don't have permission to do that." },
  email_not_verified: { status: 403, message: 'Verify your email address before doing this.' },
  terms_required: { status: 403, message: 'Accept the Terms and Privacy Notice to continue.' },
  verification_pending: {
    status: 403,
    message: "Your details are being reviewed. We'll notify you when there's an update.",
  },
  not_found: { status: 404, message: 'We couldn’t find that. It may have been removed.' },
  seat_unavailable: { status: 409, message: 'This journey no longer has available seats.' },
  duplicate_request: { status: 409, message: 'You’ve already sent a request for this journey.' },
  email_taken: { status: 409, message: 'An account with this email already exists.' },
  payload_too_large: { status: 413, message: 'That request is too large.' },
  upload_failed: { status: 422, message: 'Upload failed. Check the file and your connection.' },
  rate_limited: { status: 429, message: 'Too many attempts. Please wait and try again.' },
  server_error: { status: 500, message: 'Something went wrong. Try again.' },
} as const satisfies Record<string, { status: number; message: string }>

export type ErrorCode = keyof typeof ERRORS

export interface ErrorBody {
  error: {
    code: ErrorCode
    message: string
    fieldErrors?: Record<string, string>
    requestId?: string
  }
}

/** Throw from handlers/services; the error middleware turns it into a response. */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly fieldErrors?: Record<string, string>

  constructor(
    code: ErrorCode,
    options: { message?: string; fieldErrors?: Record<string, string> } = {},
  ) {
    super(options.message ?? ERRORS[code].message)
    this.name = 'ApiError'
    this.code = code
    this.status = ERRORS[code].status
    this.fieldErrors = options.fieldErrors
  }

  toBody(requestId?: string): ErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fieldErrors && { fieldErrors: this.fieldErrors }),
        ...(requestId && { requestId }),
      },
    }
  }
}
