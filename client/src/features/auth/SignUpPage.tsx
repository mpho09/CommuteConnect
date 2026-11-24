import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Bus, CarFront, Check, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { Checkbox, Field, Input } from '../../components/ui/Field'
import { useApi } from '../../lib/api/apiContext'
import { isApiError } from '../../lib/api/errors'
import type { Me } from '../../lib/api/types'
import { cn } from '../../lib/cn'
import { useSession } from '../../lib/session/session'
import { AuthHeading, AuthLayout } from './AuthLayout'
import { PasswordInput } from './PasswordInput'
import { homeFor, safeNext } from './redirects'
import {
  PASSWORD_RULES,
  signUpSchema,
  toFieldErrors,
  type FieldErrors,
  type SignUpValues,
} from './schemas'
import { useSetSessionUser } from './useSetSessionUser'

type FieldName = keyof SignUpValues

/** Control ids, in form order; the error summary links to these. */
const ID: Record<FieldName, string> = {
  fullName: 'signup-full-name',
  email: 'signup-email',
  roles: 'signup-role-commuter',
  password: 'signup-password',
  confirmPassword: 'signup-confirm-password',
  acceptedTerms: 'signup-terms',
}
const ORDER = Object.keys(ID) as FieldName[]

const ROLES = [
  {
    value: 'commuter',
    icon: CarFront,
    label: 'Commuter',
    description: 'Find transport options and shared rides, or offer seats on your own trips.',
  },
  {
    value: 'operator',
    icon: Bus,
    label: 'Transport operator',
    description: 'List your routes and timetables. Listings go live after verification.',
  },
] as const

const linkClass = 'font-label-lg text-secondary underline underline-offset-2 hover:no-underline'

/** S2 Sign Up (PRD US1, BR2, BR18). */
export function SignUpPage() {
  const api = useApi()
  const { user, isLoading } = useSession()
  const setSessionUser = useSetSessionUser()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const [values, setValues] = useState<SignUpValues>({
    fullName: '',
    email: '',
    roles: [],
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  })
  const [errors, setErrors] = useState<FieldErrors<FieldName>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [created, setCreated] = useState<Me | null>(null)

  const signUp = useMutation({
    mutationFn: (v: SignUpValues) =>
      api.signUp({
        fullName: v.fullName.trim(),
        email: v.email.trim(),
        password: v.password,
        roles: v.roles,
        acceptedTerms: v.acceptedTerms,
      }),
    onSuccess: (me) => {
      setCreated(me)
      setSessionUser(me)
    },
    onError: (e) => {
      if (isApiError(e) && e.code === 'email_taken') {
        setEmailTaken(true)
        setErrors({ email: e.message })
      } else if (isApiError(e) && e.code === 'validation') {
        setErrors(e.fieldErrors as FieldErrors<FieldName>)
      } else {
        setFormError(isApiError(e) ? e.message : 'Something went wrong. Try again.')
      }
      setAttempt((n) => n + 1)
    },
  })

  if (created) return <VerifyEmailNotice user={created} next={next} />
  if (isLoading) return null
  if (user) return <Navigate to={next ?? homeFor(user)} replace />

  function set<K extends FieldName>(key: K, value: SignUpValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function toggleRole(role: 'commuter' | 'operator', on: boolean) {
    set('roles', on ? [...values.roles, role] : values.roles.filter((r) => r !== role))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setEmailTaken(false)
    const parsed = signUpSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(toFieldErrors<FieldName>(parsed.error))
      setAttempt((n) => n + 1)
      return
    }
    setErrors({})
    signUp.mutate(values)
  }

  const loginHref = `/login${next ? `?next=${encodeURIComponent(next)}` : ''}`
  const summary = [
    ...(formError ? [{ message: formError }] : []),
    ...ORDER.filter((k) => errors[k]).map((k) => ({ fieldId: ID[k], message: errors[k] })),
  ]

  return (
    <AuthLayout
      panelTitle="Let’s make your next journey easier."
      panelText="Compare taxi, shuttle and bus routes from operators, and find commuters already travelling your way."
    >
      <AuthHeading
        eyebrow="Create an account"
        title="Sign up for CommuteConnect"
        intro="You don’t need an account to search. Sign up to send requests, publish journeys or list your service."
      />

      <form
        onSubmit={onSubmit}
        noValidate
        aria-label="Sign up"
        className="flex flex-col gap-space-lg"
      >
        <ErrorSummary errors={summary} focusKey={attempt} />
        {emailTaken && (
          <p className="-mt-space-sm text-body-md text-on-surface-variant">
            Is it yours?{' '}
            <Link to={loginHref} className={linkClass}>
              Log in
            </Link>{' '}
            or{' '}
            <Link to="/forgot-password" className={linkClass}>
              reset your password
            </Link>
            .
          </p>
        )}

        <Field
          id={ID.fullName}
          label="Full name"
          hint="Others only see your first name and initial."
          error={errors.fullName}
          required
        >
          {(control) => (
            <Input
              {...control}
              autoComplete="name"
              placeholder="e.g. Sipho Ndlovu"
              value={values.fullName}
              onChange={(e) => set('fullName', e.target.value)}
            />
          )}
        </Field>

        <Field
          id={ID.email}
          label="Email address"
          hint="We’ll send you a link to verify it."
          error={errors.email}
          required
        >
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="name@example.com"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
            />
          )}
        </Field>

        <fieldset aria-describedby={errors.roles ? 'signup-roles-error' : 'signup-roles-hint'}>
          <legend className="font-label-lg text-label-lg text-on-surface">
            How will you use CommuteConnect?
          </legend>
          <p id="signup-roles-hint" className="mt-space-xs text-body-sm text-on-surface-variant">
            Choose one or both.
          </p>
          <div className="mt-space-sm grid gap-space-sm sm:grid-cols-2">
            {ROLES.map(({ value, icon: Icon, label, description }) => {
              const checked = values.roles.includes(value)
              return (
                <div
                  key={value}
                  className={cn(
                    'rounded-xl border bg-surface-container-lowest px-space-md pt-space-md transition-colors',
                    checked
                      ? 'border-primary-container ring-1 ring-primary-container'
                      : errors.roles
                        ? 'border-error'
                        : 'border-border-default',
                  )}
                >
                  <Icon aria-hidden className="size-5 text-secondary" />
                  <Checkbox
                    id={`signup-role-${value}`}
                    name="roles"
                    value={value}
                    label={<span className="font-title-md text-title-md">{label}</span>}
                    description={description}
                    checked={checked}
                    onChange={(e) => toggleRole(value, e.target.checked)}
                  />
                </div>
              )
            })}
          </div>
          {errors.roles && (
            <p id="signup-roles-error" className="mt-space-sm text-body-sm text-error">
              {errors.roles}
            </p>
          )}
        </fieldset>

        <Field id={ID.password} label="Password" error={errors.password} required>
          {(control) => (
            <>
              <PasswordInput
                {...control}
                aria-describedby={[control['aria-describedby'], 'signup-password-rules']
                  .filter(Boolean)
                  .join(' ')}
                autoComplete="new-password"
                value={values.password}
                onChange={(e) => set('password', e.target.value)}
              />
              <PasswordRules id="signup-password-rules" password={values.password} />
            </>
          )}
        </Field>

        <Field
          id={ID.confirmPassword}
          label="Confirm password"
          error={errors.confirmPassword}
          required
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
            />
          )}
        </Field>

        <div>
          <Checkbox
            id={ID.acceptedTerms}
            aria-invalid={errors.acceptedTerms ? true : undefined}
            aria-describedby={errors.acceptedTerms ? 'signup-terms-error' : undefined}
            checked={values.acceptedTerms}
            onChange={(e) => set('acceptedTerms', e.target.checked)}
            label={
              <>
                I accept the{' '}
                <Link to="/terms" target="_blank" className={linkClass}>
                  Terms of Service
                </Link>{' '}
                and the{' '}
                <Link to="/privacy" target="_blank" className={linkClass}>
                  Privacy Notice
                </Link>
                .
              </>
            }
          />
          {errors.acceptedTerms && (
            <p id="signup-terms-error" className="text-body-sm text-error">
              {errors.acceptedTerms}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" fullWidth loading={signUp.isPending}>
          {signUp.isPending ? 'Creating your account…' : 'Create account'}
          {!signUp.isPending && <ArrowRight aria-hidden className="size-4" />}
        </Button>

        <p className="text-center text-body-md text-on-surface-variant">
          Already have an account?{' '}
          <Link to={loginHref} className={linkClass}>
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

function PasswordRules({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} aria-label="Password requirements" className="flex flex-wrap gap-space-sm">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.label}
            className={cn(
              'inline-flex items-center gap-space-xs rounded-full px-space-sm py-0.5 text-label-md',
              met ? 'bg-success/10 text-success' : 'bg-surface-container text-on-surface-variant',
            )}
          >
            <Check aria-hidden className={cn('size-3.5', !met && 'opacity-40')} />
            {rule.label}
            <span className="sr-only">{met ? ' (done)' : ' (not yet)'}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Shown after sign-up: the account exists but the email isn't verified yet (BR1). */
function VerifyEmailNotice({ user, next }: { user: Me; next: string | null }) {
  return (
    <div className="flex justify-center px-margin-mobile py-space-xl md:px-margin">
      <Card className="w-full max-w-lg text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary-container/50 text-secondary">
          <MailCheck aria-hidden className="size-7" />
        </span>
        <h1 className="mt-space-md text-headline-lg font-headline-lg">Verify your email</h1>
        <p role="status" className="mt-space-sm text-body-lg text-on-surface-variant">
          We sent a verification link to <strong className="text-on-surface">{user.email}</strong>.
        </p>
        <p className="mt-space-sm text-body-md text-on-surface-variant">
          You can set up your profile now, but you’ll need to verify your email before sending
          requests or publishing journeys. Can’t find the email? Check your spam folder.
        </p>
        <ButtonLink to={next ?? '/setup'} size="lg" fullWidth className="mt-space-lg">
          Continue to profile setup
          <ArrowRight aria-hidden className="size-4" />
        </ButtonLink>
      </Card>
    </div>
  )
}
