import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CalendarSync, Eye, MailWarning, Scale, Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { useNavigate } from 'react-router'
import { DayPicker } from '../../components/DayPicker'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chip } from '../../components/ui/Chip'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { Checkbox, Field, Input, Textarea } from '../../components/ui/Field'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { ApiError, isApiError } from '../../lib/api/errors'
import type { JourneyInput, Me } from '../../lib/api/types'
import { cn } from '../../lib/cn'
import { formatFare } from '../../lib/format'
import { useSession } from '../../lib/session/session'
import { describeDays, sastToday } from '../../lib/time'
import { PlacePicker } from '../search/PlacePicker'
import {
  MAX_NOTES,
  MAX_VEHICLE_SEATS,
  validatePublish,
  type PublishField,
  type PublishValues,
} from './publishSchema'

/** Control ids in form order; the error summary links to these. */
const ID: Record<PublishField, string> = {
  journeyType: 'publish-type-once_off',
  origin: 'publish-origin',
  destination: 'publish-destination',
  date: 'publish-date',
  time: 'publish-time',
  daysOfWeek: 'publish-days',
  departureTime: 'publish-departure-time',
  validFrom: 'publish-valid-from',
  validUntil: 'publish-valid-until',
  vehicleCapacity: 'publish-capacity',
  seatsAvailable: 'publish-seats',
  contribution: 'publish-contribution',
  notes: 'publish-notes',
  eligible: 'publish-eligible',
}
const ORDER = Object.keys(ID) as PublishField[]

const dateLabel = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const ymd = (d: string) => dateLabel.format(new Date(`${d}T00:00:00Z`))

/** S9 Publish Journey (PRD US5, US6): form → preview → publish. */
export function PublishJourneyPage({ now = () => new Date() }: { now?: () => Date }) {
  const { user } = useSession()
  if (!user) return null
  return (
    <div className="mx-auto max-w-4xl px-margin-mobile py-space-xl md:px-margin">
      <header className="mb-space-lg">
        <p className="text-label-md font-label-md uppercase tracking-wider text-secondary">
          My journeys
        </p>
        <h1 className="mt-space-xs text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
          Publish a shared journey
        </h1>
        <p className="mt-space-xs text-body-lg text-on-surface-variant">
          Offer spare seats on a trip you’re already making. Others can request to join; you decide
          who to accept.
        </p>
      </header>
      {user.emailVerified ? (
        <PublishFlow user={user} now={now} />
      ) : (
        // BR1
        <p
          role="note"
          className="flex items-start gap-space-sm rounded-xl border border-accent/40 bg-accent/10 p-space-md text-body-md"
        >
          <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            <strong>Verify your email to publish journeys.</strong> We sent a link to {user.email}.
            Once verified, come back here to publish.
          </span>
        </p>
      )}
    </div>
  )
}

function PublishFlow({ user, now }: { user: Me; now: () => Date }) {
  const api = useApi()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const today = sastToday(now())

  const [values, setValues] = useState<PublishValues>({
    journeyType: 'recurring',
    origin: null,
    destination: null,
    date: today,
    time: '',
    daysOfWeek: user.preferences.travelDays,
    departureTime: user.preferences.usualDepartureTime ?? '',
    validFrom: today,
    validUntil: '',
    vehicleCapacity: '4',
    seatsAvailable: '',
    contribution: '',
    notes: '',
    eligible: false,
  })
  const [errors, setErrors] = useState<Partial<Record<PublishField, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [preview, setPreview] = useState<JourneyInput | null>(null)

  const previewHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (preview) previewHeading.current?.focus()
  }, [preview])

  const publish = useMutation({
    mutationFn: (input: JourneyInput) => api.createJourney(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['journeys', 'mine'] })
      toast.success('Journey published', 'It’s now open for requests.')
      await navigate('/commuter/journeys')
    },
    onError: (e) => {
      const err = isApiError(e) ? e : new ApiError('server_error')
      // Server field names mostly match; map the ones that don't.
      const map: Record<string, PublishField> = {
        originId: 'origin',
        destinationId: 'destination',
        departureAt: 'time',
        costSharingCents: 'contribution',
      }
      const fieldErrors: Partial<Record<PublishField, string>> = {}
      for (const [k, m] of Object.entries(err.fieldErrors))
        fieldErrors[map[k] ?? (k as PublishField)] = m
      setPreview(null)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length ? null : err.message)
      setAttempt((n) => n + 1)
    },
  })

  function set<K extends PublishField>(key: K, value: PublishValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function onPreview(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const { errors: found, input } = validatePublish(values, now())
    setErrors(found)
    if (!input) {
      setAttempt((n) => n + 1)
      return
    }
    setPreview(input)
  }

  if (preview) {
    return (
      <Preview
        input={preview}
        values={values}
        headingRef={previewHeading}
        publishing={publish.isPending}
        onBack={() => setPreview(null)}
        onPublish={() => publish.mutate(preview)}
      />
    )
  }

  const summary = [
    ...(formError ? [{ message: formError }] : []),
    ...ORDER.filter((k) => errors[k]).map((k) => ({ fieldId: ID[k], message: errors[k] })),
  ]
  const recurring = values.journeyType === 'recurring'

  return (
    <form
      onSubmit={onPreview}
      noValidate
      aria-label="Journey details"
      className="flex flex-col gap-space-lg"
    >
      <ErrorSummary errors={summary} focusKey={attempt} />

      <FormSection title="How often?">
        <fieldset>
          <legend className="sr-only">Journey type</legend>
          <div className="grid gap-space-sm sm:grid-cols-2">
            {(
              [
                [
                  'recurring',
                  CalendarSync,
                  'Recurring commute',
                  'The same trip on set days, e.g. weekdays to work.',
                ],
                ['once_off', CalendarDays, 'Once-off trip', 'A single trip on one date.'],
              ] as const
            ).map(([type, Icon, label, description]) => (
              <label
                key={type}
                className={cn(
                  'flex cursor-pointer gap-space-sm rounded-xl border p-space-md transition-colors',
                  'has-focus-visible:ring-3 has-focus-visible:ring-secondary/30',
                  values.journeyType === type
                    ? 'border-primary-container ring-1 ring-primary-container'
                    : 'border-border-default hover:border-border-strong',
                )}
              >
                <input
                  id={`publish-type-${type}`}
                  type="radio"
                  name="journeyType"
                  className="sr-only"
                  checked={values.journeyType === type}
                  onChange={() => set('journeyType', type)}
                />
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-secondary" />
                <span>
                  <span className="block text-title-md font-title-md">{label}</span>
                  <span className="block text-body-md text-on-surface-variant">{description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </FormSection>

      <FormSection
        title="Where?"
        intro="Choose public areas such as a mall, station or taxi rank, not your home address. Requesters see the area only; you share the exact meeting point after accepting."
      >
        <div className="grid gap-space-md md:grid-cols-2">
          <PlacePicker
            label="Pickup area"
            placeholder="e.g. Tembisa Plaza"
            value={values.origin}
            onChange={(p) => set('origin', p && { id: p.id, label: p.label })}
            error={errors.origin}
          />
          <PlacePicker
            label="Destination"
            placeholder="e.g. Midrand Gautrain"
            value={values.destination}
            onChange={(p) => set('destination', p && { id: p.id, label: p.label })}
            error={errors.destination}
          />
        </div>
      </FormSection>

      <FormSection title="When?" intro="Times are in SAST.">
        {recurring ? (
          <div className="flex flex-col gap-space-md">
            <DayPicker
              legend="Days"
              firstId={ID.daysOfWeek}
              value={values.daysOfWeek}
              onChange={(d) => set('daysOfWeek', d)}
              error={errors.daysOfWeek}
            />
            <div className="grid gap-space-md sm:grid-cols-3">
              <Field
                id={ID.departureTime}
                label="Departure time"
                error={errors.departureTime}
                required
              >
                {(c) => (
                  <Input
                    {...c}
                    type="time"
                    value={values.departureTime}
                    onChange={(e) => set('departureTime', e.target.value)}
                  />
                )}
              </Field>
              <Field id={ID.validFrom} label="Starting" error={errors.validFrom} required>
                {(c) => (
                  <Input
                    {...c}
                    type="date"
                    min={sastToday(now())}
                    value={values.validFrom}
                    onChange={(e) => set('validFrom', e.target.value)}
                  />
                )}
              </Field>
              <Field
                id={ID.validUntil}
                label="Ending"
                optional
                hint="Leave empty to keep it running."
                error={errors.validUntil}
              >
                {(c) => (
                  <Input
                    {...c}
                    type="date"
                    min={values.validFrom || undefined}
                    value={values.validUntil}
                    onChange={(e) => set('validUntil', e.target.value)}
                  />
                )}
              </Field>
            </div>
          </div>
        ) : (
          <div className="grid gap-space-md sm:grid-cols-2">
            <Field id={ID.date} label="Date" error={errors.date} required>
              {(c) => (
                <Input
                  {...c}
                  type="date"
                  min={sastToday(now())}
                  value={values.date}
                  onChange={(e) => set('date', e.target.value)}
                />
              )}
            </Field>
            <Field id={ID.time} label="Departure time" error={errors.time} required>
              {(c) => (
                <Input
                  {...c}
                  type="time"
                  value={values.time}
                  onChange={(e) => set('time', e.target.value)}
                />
              )}
            </Field>
          </div>
        )}
      </FormSection>

      <FormSection title="Seats and costs">
        <div className="grid gap-space-md sm:grid-cols-3">
          <Field
            id={ID.vehicleCapacity}
            label="Passenger seats in your vehicle"
            hint="Not counting the driver."
            error={errors.vehicleCapacity}
            required
          >
            {(c) => (
              <Input
                {...c}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_VEHICLE_SEATS}
                step={1}
                value={values.vehicleCapacity}
                onChange={(e) => set('vehicleCapacity', e.target.value)}
              />
            )}
          </Field>
          <Field
            id={ID.seatsAvailable}
            label="Seats to offer"
            error={errors.seatsAvailable}
            required
          >
            {(c) => (
              <Input
                {...c}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={values.seatsAvailable}
                onChange={(e) => set('seatsAvailable', e.target.value)}
              />
            )}
          </Field>
          <Field
            id={ID.contribution}
            label="Cost-sharing per trip (R)"
            optional
            hint="Fuel and tolls only."
            error={errors.contribution}
          >
            {(c) => (
              <Input
                {...c}
                inputMode="decimal"
                placeholder="e.g. 25"
                value={values.contribution}
                onChange={(e) => set('contribution', e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field
          id={ID.notes}
          label="Notes for riders"
          optional
          className="mt-space-md"
          hint={`${values.notes.length}/${MAX_NOTES}. e.g. “I wait 5 minutes at the pickup area.” Don’t include your phone number or address.`}
          error={errors.notes}
        >
          {(c) => (
            <Textarea
              {...c}
              maxLength={MAX_NOTES}
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          )}
        </Field>
      </FormSection>

      <section
        aria-labelledby="publish-eligibility"
        className="rounded-2xl border border-accent/40 bg-accent/10 p-space-md md:p-space-lg"
      >
        <h2
          id="publish-eligibility"
          className="flex items-center gap-space-sm text-title-md font-title-md"
        >
          <Scale aria-hidden className="size-5 text-warning" />
          Shared rides, not a transport service
        </h2>
        <p className="mt-space-sm text-body-md">
          Shared journeys are for commuters sharing a trip they’re already making. Any contribution
          should only cover running costs like fuel and tolls. Carrying passengers for profit needs
          an operating licence; if you run a paid service, list it as an operator instead.
        </p>
        <Checkbox
          id={ID.eligible}
          className="mt-space-xs"
          label="I’m making this trip anyway and won’t charge more than my costs."
          checked={values.eligible}
          aria-invalid={errors.eligible ? true : undefined}
          onChange={(e) => set('eligible', e.target.checked)}
        />
        {errors.eligible && <p className="text-body-sm text-error">{errors.eligible}</p>}
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          <Eye aria-hidden className="size-4" />
          Preview journey
        </Button>
      </div>
    </form>
  )
}

function FormSection({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: ReactNode
}) {
  const id = `publish-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <Card>
      <section aria-labelledby={id}>
        <h2 id={id} className="text-headline-sm font-headline-sm">
          {title}
        </h2>
        {intro && <p className="mt-space-xs text-body-md text-on-surface-variant">{intro}</p>}
        <div className="mt-space-md">{children}</div>
      </section>
    </Card>
  )
}

function Preview({
  input,
  values,
  headingRef,
  publishing,
  onBack,
  onPublish,
}: {
  input: JourneyInput
  values: PublishValues
  headingRef: RefObject<HTMLHeadingElement | null>
  publishing: boolean
  onBack: () => void
  onPublish: () => void
}) {
  const when =
    input.journeyType === 'recurring' && input.schedule
      ? `${describeDays(input.schedule.daysOfWeek)} at ${input.schedule.departureTime}, from ${ymd(input.schedule.validFrom)}${input.schedule.validUntil ? ` to ${ymd(input.schedule.validUntil)}` : ''}`
      : `${ymd(values.date)} at ${values.time}`
  const rows: Array<[string, string]> = [
    ['Type', input.journeyType === 'recurring' ? 'Recurring commute' : 'Once-off trip'],
    ['From', values.origin?.label ?? ''],
    ['To', values.destination?.label ?? ''],
    ['When (SAST)', when],
    ['Seats offered', `${input.seatsAvailable} of ${input.vehicleCapacity}`],
    [
      'Cost-sharing',
      input.costSharingCents === null ? 'None' : `${formatFare(input.costSharingCents)} per trip`,
    ],
    ['Notes', input.notes || 'None'],
  ]
  return (
    <Card>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-headline-lg font-headline-lg focus:outline-none"
      >
        Check your journey
      </h2>
      <p className="mt-space-xs text-body-md text-on-surface-variant">
        This is what you’re publishing. Riders see the areas, not exact addresses, and your first
        name and initial.
      </p>
      <div className="mt-space-sm">
        <Chip tone="info">Opens for requests when published</Chip>
      </div>
      <dl className="mt-space-md grid gap-space-sm sm:grid-cols-[10rem_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-body-md text-on-surface-variant">{label}</dt>
            <dd className="text-body-lg">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-space-lg flex flex-col-reverse gap-space-sm border-t border-border-default pt-space-lg sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onBack} disabled={publishing}>
          <ArrowLeft aria-hidden className="size-4" />
          Edit details
        </Button>
        <Button onClick={onPublish} loading={publishing}>
          <Send aria-hidden className="size-4" />
          {publishing ? 'Publishing…' : 'Publish journey'}
        </Button>
      </div>
    </Card>
  )
}
