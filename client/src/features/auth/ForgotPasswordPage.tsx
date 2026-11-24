import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { Field, Input } from '../../components/ui/Field'
import { useApi } from '../../lib/api/apiContext'
import { ApiError, isApiError } from '../../lib/api/errors'
import { AuthHeading } from './AuthLayout'
import { forgotPasswordSchema, toFieldErrors } from './schemas'

const EMAIL_ID = 'forgot-email'
const linkClass =
  'inline-flex items-center gap-space-xs font-label-lg text-secondary underline-offset-2 hover:underline'

/**
 * Forgot password: request a reset link (PRD US2). The confirmation is the
 * same whether or not the email has an account.
 */
export function ForgotPasswordPage() {
  const api = useApi()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const request = useMutation({
    mutationFn: (address: string) => api.requestPasswordReset(address),
    onError: (e) => {
      setFormError((isApiError(e) ? e : new ApiError('server_error')).message)
      setAttempt((n) => n + 1)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setError(toFieldErrors<'email'>(parsed.error).email ?? null)
      setAttempt((n) => n + 1)
      return
    }
    setError(null)
    request.mutate(parsed.data.email)
  }

  const summary = [
    ...(formError ? [{ message: formError }] : []),
    ...(error ? [{ fieldId: EMAIL_ID, message: error }] : []),
  ]

  return (
    <div className="flex justify-center px-margin-mobile py-space-xl md:px-margin">
      <div className="w-full max-w-lg">
        {request.isSuccess ? (
          <Card className="text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary-container/50 text-secondary">
              <MailCheck aria-hidden className="size-7" />
            </span>
            <h1 className="mt-space-md text-headline-lg font-headline-lg">Check your email</h1>
            <p role="status" className="mt-space-sm text-body-lg text-on-surface-variant">
              If an account exists for{' '}
              <strong className="text-on-surface">{request.variables}</strong>, we’ve sent a link to
              reset your password. The link expires after 1 hour.
            </p>
            <p className="mt-space-sm text-body-md text-on-surface-variant">
              Didn’t get it? Check your spam folder or{' '}
              <button
                type="button"
                onClick={() => request.reset()}
                className="font-label-lg text-secondary underline underline-offset-2 hover:no-underline"
              >
                try again
              </button>
              .
            </p>
            <Link to="/login" className={`mt-space-lg ${linkClass}`}>
              <ArrowLeft aria-hidden className="size-4" />
              Back to log in
            </Link>
          </Card>
        ) : (
          <>
            <AuthHeading
              title="Reset your password"
              intro="Enter the email you signed up with and we’ll send you a link to choose a new password."
            />
            <Card>
              <form
                onSubmit={onSubmit}
                noValidate
                aria-label="Reset your password"
                className="flex flex-col gap-space-lg"
              >
                <ErrorSummary errors={summary} focusKey={attempt} />
                <Field id={EMAIL_ID} label="Email address" error={error} required>
                  {(control) => (
                    <Input
                      {...control}
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  )}
                </Field>
                <Button type="submit" size="lg" fullWidth loading={request.isPending}>
                  {request.isPending ? 'Sending…' : 'Send reset link'}
                </Button>
                <Link to="/login" className={`self-center ${linkClass}`}>
                  <ArrowLeft aria-hidden className="size-4" />
                  Back to log in
                </Link>
              </form>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
