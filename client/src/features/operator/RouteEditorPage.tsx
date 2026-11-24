import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Lock, Plus, Save, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { TransportResultCard } from '../../components/TransportResultCard'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { Field, Input, Radio, Select, Textarea } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingList } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { ApiError, isApiError } from '../../lib/api/errors'
import type { FareType, Operator, OperatorRoute, TransportType } from '../../lib/api/types'
import { TRANSPORT_LABELS } from '../../lib/format'
import { PlacePicker } from '../search/PlacePicker'
import {
  MAX_SCHEDULE,
  MAX_STOPS,
  validateRoute,
  type RouteField,
  type RouteValues,
} from './routeSchema'

const ID: Record<RouteField, string> = {
  routeName: 'route-name',
  transportType: 'route-type',
  origin: 'route-origin',
  destination: 'route-destination',
  stops: 'route-add-stop',
  scheduleDescription: 'route-schedule',
  fareType: 'route-fare-fixed',
  fare: 'route-fare',
}
const ORDER = Object.keys(ID) as RouteField[]

const FARE_TYPES: Array<{ value: FareType; label: string; description: string }> = [
  { value: 'fixed', label: 'Fixed fare', description: 'One price for the trip.' },
  { value: 'from', label: 'Starting from', description: 'Shown as “From R …”; varies by stop.' },
  {
    value: 'contact',
    label: 'Contact for fare',
    description: 'No price shown; commuters enquire.',
  },
]

/** S14 Route Editor (PRD US8, BR10): create (`/operator/routes/new`) or edit a route. */
export function RouteEditorPage() {
  const { routeId } = useParams()
  const api = useApi()
  const operator = useQuery({ queryKey: ['operator', 'mine'], queryFn: () => api.getMyOperator() })
  const route = useQuery({
    queryKey: ['route', routeId],
    queryFn: () => api.getRoute(routeId!),
    enabled: !!routeId,
  })

  let content: ReactNode
  if (operator.isPending || (routeId && route.isPending)) {
    content = <LoadingList count={2} label="Loading route…" />
  } else if (operator.isError || route.isError) {
    content =
      isApiError(route.error) && route.error.code === 'not_found' ? (
        <EmptyState
          title="Route not found"
          action={<ButtonLink to="/operator">Back to dashboard</ButtonLink>}
        />
      ) : (
        <ErrorState
          onRetry={() => void (operator.isError ? operator.refetch() : route.refetch())}
        />
      )
  } else if (!operator.data || operator.data.verificationStatus !== 'verified') {
    content = <Locked operator={operator.data ?? null} />
  } else {
    content = <Editor key={routeId ?? 'new'} route={route.data} operator={operator.data} />
  }

  return (
    <div className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin">
      <Link
        to="/operator"
        className="mb-space-sm inline-flex min-h-11 items-center font-label-lg text-secondary hover:underline"
      >
        ← Operator dashboard
      </Link>
      <h1 className="text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
        {routeId ? 'Edit route' : 'Add a route'}
      </h1>
      <div className="mt-space-lg">{content}</div>
    </div>
  )
}

/** BR9: only verified operators can publish or change routes. */
export function Locked({ operator }: { operator: Operator | null }) {
  return (
    <EmptyState
      icon={Lock}
      title="Routes unlock once you’re verified"
      description={
        operator
          ? 'An admin needs to verify your business before your routes can be listed for commuters.'
          : 'Set up your operator profile and upload your documents to get verified.'
      }
      action={
        <ButtonLink to={operator ? '/operator/verification' : '/operator/setup'}>
          {operator ? 'Check verification status' : 'Set up operator profile'}
        </ButtonLink>
      }
    />
  )
}

function toValues(r?: OperatorRoute): RouteValues {
  return {
    routeName: r?.routeName ?? '',
    transportType: r?.transportType ?? 'minibus_taxi',
    origin: r ? { id: r.origin.id, label: r.origin.label } : null,
    destination: r ? { id: r.destination.id, label: r.destination.label } : null,
    stops: r?.stops.map((s) => ({ id: s.place.id, label: s.place.label })) ?? [],
    scheduleDescription: r?.scheduleDescription ?? '',
    fareType: r?.fareType ?? 'fixed',
    fare: r?.fareCents != null ? (r.fareCents / 100).toFixed(2) : '',
  }
}

function Editor({ route, operator }: { route?: OperatorRoute; operator: Operator }) {
  const api = useApi()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<RouteValues>(() => toValues(route))
  const [errors, setErrors] = useState<Partial<Record<RouteField, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  // Stable keys so pickers keep their text when stops move.
  const [stopKeys, setStopKeys] = useState(() => values.stops.map((_, i) => i))
  const [nextKey, setNextKey] = useState(values.stops.length)
  const [today] = useState(() => new Date().toISOString())

  const save = useMutation({
    mutationFn: (input: NonNullable<ReturnType<typeof validateRoute>['input']>) =>
      route ? api.updateRoute(route.id, input) : api.createRoute(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['routes', 'mine'] })
      await queryClient.invalidateQueries({ queryKey: ['route'] })
      toast.success(route ? 'Route updated' : 'Route published', 'Commuters can find it in search.')
      await navigate('/operator')
    },
    onError: (e) => {
      const err = isApiError(e) ? e : new ApiError('server_error')
      const map: Record<string, RouteField> = {
        originId: 'origin',
        destinationId: 'destination',
        fareCents: 'fare',
      }
      const fieldErrors: Partial<Record<RouteField, string>> = {}
      for (const [k, m] of Object.entries(err.fieldErrors))
        fieldErrors[map[k] ?? (k as RouteField)] = m
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length ? null : err.message)
      setAttempt((n) => n + 1)
    },
  })

  function set<K extends RouteField>(key: K, value: RouteValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function setStop(i: number, place: RouteValues['stops'][number]) {
    set(
      'stops',
      values.stops.map((s, j) => (j === i ? place : s)),
    )
  }
  function addStop() {
    set('stops', [...values.stops, null])
    setStopKeys((k) => [...k, nextKey])
    setNextKey((n) => n + 1)
  }
  function removeStop(i: number) {
    set(
      'stops',
      values.stops.filter((_, j) => j !== i),
    )
    setStopKeys((k) => k.filter((_, j) => j !== i))
  }
  function moveStop(i: number, by: -1 | 1) {
    const swap = <T,>(xs: T[]) => {
      const out = [...xs]
      ;[out[i], out[i + by]] = [out[i + by], out[i]]
      return out
    }
    set('stops', swap(values.stops))
    setStopKeys(swap)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const { errors: found, input } = validateRoute(values)
    setErrors(found)
    if (!input) {
      setAttempt((n) => n + 1)
      return
    }
    save.mutate(input)
  }

  const summary = [
    ...(formError ? [{ message: formError }] : []),
    ...ORDER.filter((k) => errors[k]).map((k) => ({ fieldId: ID[k], message: errors[k] })),
  ]
  const previewFare =
    values.fareType === 'contact' || !/^\d+([.,]\d{1,2})?$/.test(values.fare.trim())
      ? null
      : Math.round(Number(values.fare.trim().replace(',', '.')) * 100)

  return (
    <div className="grid gap-space-lg lg:grid-cols-[1fr_22rem] lg:items-start">
      <form
        onSubmit={onSubmit}
        noValidate
        aria-label="Route details"
        className="flex flex-col gap-space-lg"
      >
        <ErrorSummary errors={summary} focusKey={attempt} />

        <Section title="Route">
          <div className="grid gap-space-md sm:grid-cols-2">
            <Field
              id={ID.routeName}
              label="Route name"
              hint="e.g. Tembisa – Midrand express"
              error={errors.routeName}
              required
            >
              {(c) => (
                <Input
                  {...c}
                  maxLength={80}
                  value={values.routeName}
                  onChange={(e) => set('routeName', e.target.value)}
                />
              )}
            </Field>
            <Field id={ID.transportType} label="Transport type" required>
              {(c) => (
                <Select
                  {...c}
                  value={values.transportType}
                  onChange={(e) => set('transportType', e.target.value as TransportType)}
                >
                  {Object.entries(TRANSPORT_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <PlacePicker
              label="Starting point"
              value={values.origin}
              onChange={(p) => set('origin', p && { id: p.id, label: p.label })}
              error={errors.origin}
            />
            <PlacePicker
              label="Destination"
              value={values.destination}
              onChange={(p) => set('destination', p && { id: p.id, label: p.label })}
              error={errors.destination}
            />
          </div>
        </Section>

        <Section
          title="Stops in between"
          intro="Optional. Add them in the order the vehicle passes them. Use public places like ranks and stations."
        >
          {values.stops.length > 0 && (
            <ol className="flex flex-col gap-space-sm">
              {values.stops.map((stop, i) => (
                <li key={stopKeys[i]} className="flex items-start gap-space-sm">
                  <span
                    aria-hidden
                    className="mt-9 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-md"
                  >
                    {i + 1}
                  </span>
                  <PlacePicker
                    className="flex-1"
                    label={`Stop ${i + 1}`}
                    value={stop}
                    onChange={(p) => setStop(i, p && { id: p.id, label: p.label })}
                  />
                  <div className="mt-7 flex">
                    <Button
                      variant="ghost"
                      onClick={() => moveStop(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move stop ${i + 1} up`}
                    >
                      <ArrowUp aria-hidden className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => moveStop(i, 1)}
                      disabled={i === values.stops.length - 1}
                      aria-label={`Move stop ${i + 1} down`}
                    >
                      <ArrowDown aria-hidden className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => removeStop(i)}
                      aria-label={`Remove stop ${i + 1}`}
                    >
                      <X aria-hidden className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {errors.stops && <p className="mt-space-sm text-body-sm text-error">{errors.stops}</p>}
          <Button
            id={ID.stops}
            variant="outline"
            className="mt-space-sm"
            onClick={addStop}
            disabled={values.stops.length >= MAX_STOPS}
          >
            <Plus aria-hidden className="size-4" />
            Add a stop
          </Button>
        </Section>

        <Section title="Schedule">
          <Field
            id={ID.scheduleDescription}
            label="When does it run?"
            hint={`Days, hours and how often, in SAST. ${values.scheduleDescription.length}/${MAX_SCHEDULE}`}
            error={errors.scheduleDescription}
            required
          >
            {(c) => (
              <Textarea
                {...c}
                maxLength={MAX_SCHEDULE}
                placeholder="e.g. Weekdays · every 20 min, 05:00–19:00. Saturdays 06:00–14:00."
                value={values.scheduleDescription}
                onChange={(e) => set('scheduleDescription', e.target.value)}
              />
            )}
          </Field>
        </Section>

        <Section
          title="Fare"
          intro="Show the real fare, or “Contact for fare”. Never an estimate you can’t honour."
        >
          <fieldset>
            <legend className="sr-only">Fare type</legend>
            <div className="grid gap-space-xs sm:grid-cols-3">
              {FARE_TYPES.map((f) => (
                <Radio
                  key={f.value}
                  id={`route-fare-${f.value}`}
                  name="fareType"
                  label={f.label}
                  description={f.description}
                  checked={values.fareType === f.value}
                  onChange={() => set('fareType', f.value)}
                />
              ))}
            </div>
          </fieldset>
          {values.fareType !== 'contact' && (
            <Field
              id={ID.fare}
              label="Fare (R)"
              hint="Per passenger, one way."
              error={errors.fare}
              className="mt-space-md sm:max-w-xs"
              required
            >
              {(c) => (
                <Input
                  {...c}
                  inputMode="decimal"
                  placeholder="e.g. 26.00"
                  value={values.fare}
                  onChange={(e) => set('fare', e.target.value)}
                />
              )}
            </Field>
          )}
        </Section>

        <div className="flex flex-wrap justify-end gap-space-sm">
          <ButtonLink to="/operator" variant="outline">
            Cancel
          </ButtonLink>
          <Button type="submit" size="lg" loading={save.isPending}>
            <Save aria-hidden className="size-4" />
            {route ? 'Save changes' : 'Publish route'}
          </Button>
        </div>
        {route && (
          <p className="text-right text-body-sm text-on-surface-variant">
            Saving also confirms the listing is up to date.
          </p>
        )}
      </form>

      <aside className="flex flex-col gap-space-sm lg:sticky lg:top-24" aria-label="Preview">
        <h2 className="text-title-md font-title-md">How commuters see it</h2>
        {/* Inert: a picture of the card, not a working link. */}
        <div inert>
          <TransportResultCard
            href="#"
            operatorName={operator.businessName}
            verification={operator.verificationStatus}
            transportType={TRANSPORT_LABELS[values.transportType]}
            originLabel={values.origin?.label ?? 'Starting point'}
            destinationLabel={values.destination?.label ?? 'Destination'}
            scheduleSummary={values.scheduleDescription.trim() || 'Schedule'}
            fareCents={previewFare}
            updatedAt={today}
          />
        </div>
        <p className="text-body-sm text-on-surface-variant">
          {values.routeName.trim() || 'Your route'}: the “Updated” date is set when you save.
        </p>
      </aside>
    </div>
  )
}

function Section({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <Card>
      <h2 className="text-headline-sm font-headline-sm">{title}</h2>
      {intro && <p className="mt-space-xs text-body-md text-on-surface-variant">{intro}</p>}
      <div className="mt-space-md">{children}</div>
    </Card>
  )
}
