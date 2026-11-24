import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Clock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { Field, Input } from '../../components/ui/Field'
import { useApi } from '../../lib/api/apiContext'
import { ApiError, isApiError } from '../../lib/api/errors'
import { useSession } from '../../lib/session/session'
import { AuthHeading, AuthLayout } from './AuthLayout'
import { PasswordInput } from './PasswordInput'
import { homeFor, safeNext } from './redirects'
import { logInSchema, toFieldErrors, type FieldErrors } from './schemas'
import { useSetSessionUser } from './useSetSessionUser'

type FieldName = 'email' | 'password'

const ID: Record<FieldName, string> = { email: 'login-email', password: 'login-password' }

const linkClass = 'font-label-lg text-secondary underline-offset-2 hover:underline'

/**
 * S3 Log In (PRD US2). Sends the user back to `?next=` (set by the route
 * guard) or to the dashboard for their role. `?reason=expired` explains why
 * they're here.
 */
export function LoginPage() {
  const api = useApi()
  const { user, isLoading } = useSession()
  const setSessionUser = useSetSessionUser()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const expired = params.get('reason') === 'expired'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<FieldName>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const signIn = useMutation({
    mutationFn: () => api.signIn(email.trim(), password),
    // The session update re-renders this page, which redirects below.
    onSuccess: (me) => setSessionUser(me),
    onError: (e) => {
      // Invalid credentials stay generic: never say whether the email exists.
      setFormError((isApiError(e) ? e : new ApiError('server_error')).message)
      setPassword('')
      setAttempt((n) => n + 1)
    },
  })

  if (isLoading) return null
  if (user) return <Navigate to={next ?? homeFor(user)} replace />

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const parsed = logInSchema.safeParse({ email, password })
    if (!parsed.success) {
      setErrors(toFieldErrors<FieldName>(parsed.error))
      setAttempt((n) => n + 1)
      return
    }
    setErrors({})
    signIn.mutate()
  }

  const signupHref = `/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`
  const summary = [
    ...(formError ? [{ message: formError }] : []),
    ...(['email', 'password'] as const)
      .filter((k) => errors[k])
      .map((k) => ({ fieldId: ID[k], message: errors[k] })),
  ]

  return (
    <AuthLayout
      panelTitle="Welcome back to your daily commute."
      panelText="Pick up where you left off: your journeys, requests and saved routes."
    >
      <AuthHeading
        title="Log in to CommuteConnect"
        intro="Manage your journeys, requests and listings."
      />

      {expired && !formError && (
        <p
          role="status"
          className="mb-space-md flex items-start gap-space-sm rounded-xl border border-warning/30 bg-tertiary-fixed/40 p-space-md text-body-md text-on-surface"
        >
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          Your session has expired. Please sign in again.
        </p>
      )}

      <Card>
        <form
          onSubmit={onSubmit}
          noValidate
          aria-label="Log in"
          className="flex flex-col gap-space-lg"
        >
          <ErrorSummary errors={summary} focusKey={attempt} />

          <Field id={ID.email} label="Email address" error={errors.email} required>
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

          <div className="flex flex-col gap-space-sm">
            <Field id={ID.password} label="Password" error={errors.password} required>
              {(control) => (
                <PasswordInput
                  {...control}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            <Link to="/forgot-password" className={`self-end text-body-md ${linkClass}`}>
              Forgot password?
            </Link>
          </div>

          <Button type="submit" size="lg" fullWidth loading={signIn.isPending}>
            {signIn.isPending ? 'Logging in…' : 'Log in'}
            {!signIn.isPending && <ArrowRight aria-hidden className="size-4" />}
          </Button>

          <p className="text-center text-body-md text-on-surface-variant">
            Don’t have an account?{' '}
            <Link to={signupHref} className={linkClass}>
              Sign up as a commuter or operator
            </Link>
          </p>
        </form>
      </Card>
    </AuthLayout>
  )
}
