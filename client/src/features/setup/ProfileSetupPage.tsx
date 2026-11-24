import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Bus, CarFront, Pencil, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { Checkbox, Field, Input } from '../../components/ui/Field'
import { LoadingList } from '../../components/ui/States'
import { Stepper } from '../../components/ui/Stepper'
import { useApi } from '../../lib/api/apiContext'
import { ApiError, isApiError } from '../../lib/api/errors'
import type { Me, MeUpdate } from '../../lib/api/types'
import { cn } from '../../lib/cn'
import { useSession } from '../../lib/session/session'
import { homeFor } from '../auth/redirects'
import { toFieldErrors } from '../auth/schemas'
import { useSetSessionUser } from '../auth/useSetSessionUser'
import { PlacePicker, type PlaceRef } from '../search/PlacePicker'
import { usePlaceRef } from '../search/usePlaceRef'
import {
  personalSchema,
  preferencesSchema,
  type PersonalValues,
  type PreferenceValues,
} from './schemas'

const STEPS = ['Personal information', 'Account preferences', 'Confirmation']

const WEEKDAYS = [
  { day: 1, short: 'Mon', long: 'Monday' },
  { day: 2, short: 'Tue', long: 'Tuesday' },
  { day: 3, short: 'Wed', long: 'Wednesday' },
  { day: 4, short: 'Thu', long: 'Thursday' },
  { day: 5, short: 'Fri', long: 'Friday' },
  { day: 6, short: 'Sat', long: 'Saturday' },
  { day: 7, short: 'Sun', long: 'Sunday' },
]

const linkClass = 'font-label-lg text-secondary underline underline-offset-2 hover:no-underline'

/**
 * S4 Profile Setup (PRD US3): a three-step wizard. Answers are kept while
 * moving between steps and saved together on the last step.
 */
export function ProfileSetupPage() {
  const { user } = useSession()
  const prefs = user?.preferences
  // Saved usual places only store ids; fetch their names to prefill.
  const origin = usePlaceRef(prefs?.usualOriginId ?? null)
  const destination = usePlaceRef(prefs?.usualDestinationId ?? null)

  if (!user || origin.isLoading || destination.isLoading) {
    return (
      <Shell>
        <LoadingList count={2} label="Loading your profile…" />
      </Shell>
    )
  }

  return <Wizard user={user} origin={origin.place} destination={destination.place} />
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-margin-mobile py-space-xl md:px-margin">
      {children}
    </div>
  )
}

function Wizard({
  user,
  origin,
  destination,
}: {
  user: Me
  origin: PlaceRef | null
  destination: PlaceRef | null
}) {
  const api = useApi()
  const navigate = useNavigate()
  const setSessionUser = useSetSessionUser()
  const isCommuter = user.roles.includes('commuter')
  const isOperator = user.roles.includes('operator')

  const [step, setStep] = useState(0)
  const [personal, setPersonal] = useState<PersonalValues>({
    fullName: user.fullName,
    phone: user.phone ?? '',
  })
  const [preferences, setPreferences] = useState<PreferenceValues>({
    origin,
    destination,
    departureTime: user.preferences.usualDepartureTime ?? '',
    travelDays: user.preferences.travelDays,
    notifyByEmail: user.preferences.notifyByEmail,
  })
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  // Move focus to the new step's heading so screen readers announce it.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  const save = useMutation({
    mutationFn: () => {
      const update: MeUpdate = {
        fullName: personal.fullName.trim(),
        phone: personal.phone.trim() || null,
        preferences: {
          ...user.preferences,
          notifyByEmail: preferences.notifyByEmail,
          ...(isCommuter && {
            usualOriginId: preferences.origin?.id ?? null,
            usualDestinationId: preferences.destination?.id ?? null,
            usualDepartureTime: preferences.departureTime || null,
            travelDays: [...preferences.travelDays].sort(),
          }),
        },
        profileComplete: true,
      }
      return api.updateMe(update)
    },
    onSuccess: async (me) => {
      setSessionUser(me)
      await navigate(homeFor(me), { replace: true })
    },
    onError: (e) => {
      const err = isApiError(e) ? e : new ApiError('server_error')
      if (err.code === 'validation' && (err.fieldErrors.fullName || err.fieldErrors.phone)) {
        setErrors(err.fieldErrors)
        setStep(0)
      } else {
        setFormError(err.message)
      }
      setAttempt((n) => n + 1)
    },
  })

  function goTo(next: number) {
    setErrors({})
    setFormError(null)
    setStep(next)
  }

  function onNext(e: FormEvent) {
    e.preventDefault()
    const parsed =
      step === 0 ? personalSchema.safeParse(personal) : preferencesSchema.safeParse(preferences)
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error))
      setAttempt((n) => n + 1)
      return
    }
    goTo(step + 1)
  }

  const heading = (text: string) => (
    <h2
      ref={headingRef}
      tabIndex={-1}
      className="text-headline-lg font-headline-lg focus:outline-none"
    >
      {text}
    </h2>
  )

  const summary = [
    ...(formError ? [{ message: formError }] : []),
    ...Object.entries(errors)
      .filter(([, m]) => m)
      .map(([k, m]) => ({ fieldId: `setup-${k}`, message: m })),
  ]

  return (
    <Shell>
      <header className="mb-space-lg">
        <p className="text-label-md font-label-md uppercase tracking-wider text-secondary">
          Profile setup
        </p>
        <h1 className="mt-space-xs text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
          Welcome, {user.fullName.split(' ')[0]}! Let’s set up your profile
        </h1>
        <p className="mt-space-sm text-body-lg text-on-surface-variant">
          This takes about 2 minutes. You can change these details later in Settings.
        </p>
      </header>

      <Stepper steps={STEPS} current={step} />

      <Card className="mt-space-lg">
        <form
          onSubmit={step < 2 ? onNext : (e) => (e.preventDefault(), save.mutate())}
          noValidate
          aria-label={STEPS[step]}
          className="flex flex-col gap-space-lg"
        >
          <ErrorSummary errors={summary} focusKey={attempt} />

          {step === 0 && (
            <>
              {heading('Personal information')}
              <PrivacyNote>
                Your phone number is never shown publicly. Others see only your first name and
                initial.
              </PrivacyNote>
              <Field id="setup-fullName" label="Full name" error={errors.fullName} required>
                {(control) => (
                  <Input
                    {...control}
                    autoComplete="name"
                    value={personal.fullName}
                    onChange={(e) => setPersonal((p) => ({ ...p, fullName: e.target.value }))}
                  />
                )}
              </Field>
              <Field
                id="setup-phone"
                label="Phone number"
                optional
                hint="e.g. +27 82 123 4567. Only shared through the request process, never on listings."
                error={errors.phone}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={personal.phone}
                    onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))}
                  />
                )}
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              {heading('Account preferences')}
              <AccountType roles={user.roles} />

              {isCommuter && (
                <fieldset className="flex flex-col gap-space-md">
                  <legend className="text-title-md font-title-md">Your usual commute</legend>
                  <p className="-mt-space-sm text-body-md text-on-surface-variant">
                    Optional. We use this to suggest matching journeys. Choose a public area, not
                    your home address.
                  </p>
                  <div className="grid gap-space-md md:grid-cols-2">
                    <PlacePicker
                      label="Usual pickup area"
                      placeholder="e.g. Tembisa"
                      value={preferences.origin}
                      onChange={(p) =>
                        setPreferences((v) => ({
                          ...v,
                          origin: p && { id: p.id, label: p.label },
                        }))
                      }
                      error={errors.origin}
                    />
                    <PlacePicker
                      label="Usual destination"
                      placeholder="e.g. Sandton"
                      value={preferences.destination}
                      onChange={(p) =>
                        setPreferences((v) => ({
                          ...v,
                          destination: p && { id: p.id, label: p.label },
                        }))
                      }
                      error={errors.destination}
                    />
                  </div>
                  <Field
                    id="setup-departureTime"
                    label="Usual departure time (SAST)"
                    optional
                    className="md:max-w-xs"
                  >
                    {(control) => (
                      <Input
                        {...control}
                        type="time"
                        value={preferences.departureTime}
                        onChange={(e) =>
                          setPreferences((v) => ({ ...v, departureTime: e.target.value }))
                        }
                      />
                    )}
                  </Field>
                  <fieldset>
                    <legend className="font-label-lg text-label-lg">Travel days</legend>
                    <div className="mt-space-sm flex flex-wrap gap-space-sm">
                      {WEEKDAYS.map(({ day, short, long }) => {
                        const on = preferences.travelDays.includes(day)
                        return (
                          <label
                            key={day}
                            className={cn(
                              'flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-full border px-space-md text-label-lg',
                              'has-focus-visible:ring-3 has-focus-visible:ring-secondary/30',
                              on
                                ? 'border-primary-container bg-primary-container text-on-primary'
                                : 'border-border-strong bg-surface-container-lowest text-on-surface hover:border-primary-container',
                            )}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={on}
                              aria-label={long}
                              onChange={(e) =>
                                setPreferences((v) => ({
                                  ...v,
                                  travelDays: e.target.checked
                                    ? [...v.travelDays, day]
                                    : v.travelDays.filter((d) => d !== day),
                                }))
                              }
                            />
                            <span aria-hidden>{short}</span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                </fieldset>
              )}

              <fieldset>
                <legend className="text-title-md font-title-md">Notifications</legend>
                <Checkbox
                  label="Email me about my requests and listings"
                  description="You’ll always see notifications in the app."
                  checked={preferences.notifyByEmail}
                  onChange={(e) =>
                    setPreferences((v) => ({ ...v, notifyByEmail: e.target.checked }))
                  }
                />
              </fieldset>
            </>
          )}

          {step === 2 && (
            <>
              {heading('Check your details')}
              <SummarySection title="Personal information" onEdit={() => goTo(0)}>
                <SummaryRow label="Full name" value={personal.fullName.trim()} />
                <SummaryRow label="Phone" value={personal.phone.trim() || 'Not added'} />
              </SummarySection>
              <SummarySection title="Account preferences" onEdit={() => goTo(1)}>
                <SummaryRow
                  label="Account type"
                  value={[isCommuter && 'Commuter', isOperator && 'Transport operator']
                    .filter(Boolean)
                    .join(' and ')}
                />
                {isCommuter && (
                  <>
                    <SummaryRow
                      label="Usual commute"
                      value={
                        preferences.origin && preferences.destination
                          ? `${preferences.origin.label} to ${preferences.destination.label}`
                          : (preferences.origin?.label ??
                            preferences.destination?.label ??
                            'Not set')
                      }
                    />
                    <SummaryRow
                      label="Departure time"
                      value={
                        preferences.departureTime ? `${preferences.departureTime} SAST` : 'Any time'
                      }
                    />
                    <SummaryRow
                      label="Travel days"
                      value={
                        WEEKDAYS.filter((w) => preferences.travelDays.includes(w.day))
                          .map((w) => w.short)
                          .join(', ') || 'Not set'
                      }
                    />
                  </>
                )}
                <SummaryRow
                  label="Email notifications"
                  value={preferences.notifyByEmail ? 'On' : 'Off'}
                />
              </SummarySection>
              {isOperator && (
                <p className="rounded-xl bg-surface-container-low p-space-md text-body-md text-on-surface-variant">
                  <strong className="text-on-surface">Operators:</strong> your routes go live only
                  after you submit your business details and an admin verifies them. You can{' '}
                  <Link to="/operator/setup" className={linkClass}>
                    start operator setup
                  </Link>{' '}
                  once your profile is saved.
                </p>
              )}
            </>
          )}

          <div className="flex flex-col-reverse gap-space-sm border-t border-border-default pt-space-lg sm:flex-row sm:justify-between">
            {step > 0 ? (
              <Button variant="outline" onClick={() => goTo(step - 1)} disabled={save.isPending}>
                <ArrowLeft aria-hidden className="size-4" />
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 2 ? (
              <Button type="submit">
                {step === 0 ? 'Continue to preferences' : 'Review details'}
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            ) : (
              <Button type="submit" loading={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save and go to dashboard'}
                {!save.isPending && <ArrowRight aria-hidden className="size-4" />}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </Shell>
  )
}

function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-md text-body-md text-on-surface-variant">
      <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-secondary" />
      {children}
    </p>
  )
}

/** Roles are fixed at sign-up and can't be changed through the profile API (US3). */
function AccountType({ roles }: { roles: Me['roles'] }) {
  const items = [
    roles.includes('commuter') && { icon: CarFront, label: 'Commuter' },
    roles.includes('operator') && { icon: Bus, label: 'Transport operator' },
  ].filter((x) => x !== false)
  return (
    <section aria-labelledby="setup-account-type">
      <h3 id="setup-account-type" className="text-title-md font-title-md">
        Account type
      </h3>
      <ul className="mt-space-sm flex flex-wrap gap-space-sm">
        {items.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-space-xs rounded-full bg-primary-container px-space-md py-space-xs text-label-lg text-on-primary"
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </li>
        ))}
      </ul>
      {!roles.includes('operator') && (
        <p className="mt-space-sm text-body-md text-on-surface-variant">
          Run a transport service?{' '}
          <Link to="/operator/setup" className={linkClass}>
            Set up an operator profile
          </Link>{' '}
          any time.
        </p>
      )}
    </section>
  )
}

function SummarySection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border-default p-space-md">
      <div className="flex items-center justify-between gap-space-sm">
        <h3 className="text-title-md font-title-md">{title}</h3>
        <Button variant="ghost" onClick={onEdit} aria-label={`Edit ${title.toLowerCase()}`}>
          <Pencil aria-hidden className="size-4" />
          Edit
        </Button>
      </div>
      <dl className="mt-space-sm grid gap-space-sm sm:grid-cols-[12rem_1fr]">{children}</dl>
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-body-md text-on-surface-variant">{label}</dt>
      <dd className="text-body-lg text-on-surface">{value}</dd>
    </>
  )
}
