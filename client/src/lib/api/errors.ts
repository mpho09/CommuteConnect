/**
 * API error codes and the user-facing messages from PRD §12.2.
 * Screens show `error.message`; branch on `error.code`.
 */
export type ApiErrorCode =
  | 'offline'
  | 'server_error'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'email_not_verified'
  | 'seat_unavailable'
  | 'duplicate_request'
  | 'upload_failed'
  | 'verification_pending'
  | 'rate_limited'
  | 'invalid_credentials'
  | 'email_taken'
  | 'reset_link_invalid'

const MESSAGES: Record<ApiErrorCode, string> = {
  offline: "You're offline. Check your connection and try again.",
  server_error: 'Something went wrong. Try again.',
  unauthenticated: 'Your session has expired. Please sign in again.',
  forbidden: "You don't have permission to do that.",
  not_found: 'We couldn’t find that. It may have been removed.',
  validation: 'Some details need fixing.',
  email_not_verified: 'Verify your email address before doing this.',
  seat_unavailable: 'This journey no longer has available seats.',
  duplicate_request: 'You’ve already sent a request for this journey.',
  upload_failed: 'Upload failed. Check the file and your connection.',
  verification_pending: "Your details are being reviewed. We'll notify you when there's an update.",
  rate_limited: 'Too many attempts. Please wait and try again.',
  invalid_credentials: 'That email and password don’t match.',
  email_taken: 'An account with this email already exists.',
  reset_link_invalid: 'This reset link has expired or was already used. Request a new one.',
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  /** Per-field messages for 'validation' errors, keyed by input name. */
  readonly fieldErrors: Record<string, string>

  constructor(
    code: ApiErrorCode,
    options: { message?: string; fieldErrors?: Record<string, string> } = {},
  ) {
    super(options.message ?? MESSAGES[code])
    this.name = 'ApiError'
    this.code = code
    this.fieldErrors = options.fieldErrors ?? {}
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}
