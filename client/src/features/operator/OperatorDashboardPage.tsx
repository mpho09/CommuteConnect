import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  CircleCheck,
  MessageSquare,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Route as RouteIcon,
  TriangleAlert,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chip, VerificationChip, type ChipTone } from '../../components/ui/Chip'
import { Field, Textarea } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingList } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { isApiError } from '../../lib/api/errors'
import type { Enquiry, Operator, OperatorRoute, RouteStatus } from '../../lib/api/types'
import { describeFare, formatDate, TRANSPORT_LABELS } from '../../lib/format'
import { routeListingPath } from '../../lib/paths'

const ROUTE_STATUS: Record<RouteStatus, { label: string; tone: ChipTone }> = {
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'neutral' },
  draft: { label: 'Draft', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'error' },
}

const errorText = (e: unknown) => (isApiError(e) ? e.message : 'Something went wrong. Try again.')

/** S13 Operator Dashboard (PRD US8, F5, BR9, BR11). */
export function OperatorDashboardPage() {
  const api = useApi()
  const operator = useQuery({ queryKey: ['operator', 'mine'], queryFn: () => api.getMyOperator() })
  const routes = useQuery({ queryKey: ['routes', 'mine'], queryFn: () => api.listMyRoutes() })
  const enquiries = useQuery({
    queryKey: ['enquiries', 'mine'],
    queryFn: () => api.listMyEnquiries(),
  })

  let body: ReactNode
  if (operator.isPending || routes.isPending || enquiries.isPending) {
    body = <LoadingList count={3} label="Loading your dashboard…" />
  } else if (operator.isError || routes.isError || enquiries.isError) {
    body = (
      <ErrorState
        onRetry={() => {
          void operator.refetch()
          void routes.refetch()
          void enquiries.refetch()
        }}
      />
    )
  } else if (!operator.data) {
    body = (
      <EmptyState
        title="Set up your operator profile"
        description="Tell us about your business and upload documents to get verified."
        action={<ButtonLink to="/operator/setup">Set up operator profile</ButtonLink>}
      />
    )
  } else {
    body = (
      <Dashboard
        operator={operator.data}
        routes={routes.data}
        enquiries={enquiries.data.received}
      />
    )
  }

  return <div className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin">{body}</div>
}

function Dashboard({
  operator: op,
  routes,
  enquiries,
}: {
  operator: Operator
  routes: OperatorRoute[]
  enquiries: Enquiry[]
}) {
  const verified = op.verificationStatus === 'verified'
  const active = routes.filter((r) => r.status === 'active')
  const stale = routes.filter((r) => r.needsConfirmation && r.status !== 'suspended')
  const waiting = enquiries.filter((e) => e.status === 'new')

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <p className="text-label-md font-label-md uppercase tracking-wider text-secondary">
            Operator dashboard
          </p>
          <h1 className="mt-space-xs text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
            {op.businessName}
          </h1>
          <div className="mt-space-sm flex flex-wrap items-center gap-space-sm text-body-md text-on-surface-variant">
            <VerificationChip status={op.verificationStatus} />
            {op.verifiedAt && <span>Verified {formatDate(op.verifiedAt)}</span>}
            <span>· {op.serviceArea}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-space-sm">
          <ButtonLink to="/operator/verification" variant="outline">
            Business profile and documents
          </ButtonLink>
          {verified && (
            <ButtonLink to="/operator/routes/new">
              <Plus aria-hidden className="size-4" />
              Add a route
            </ButtonLink>
          )}
        </div>
      </header>

      {!verified && (
        <p
          role="note"
          className="mt-space-lg flex items-start gap-space-sm rounded-xl border border-accent/40 bg-accent/10 p-space-md text-body-md"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            {op.verificationStatus === 'suspended'
              ? 'Your operator account is suspended, so your routes are hidden from commuters. Contact support for help.'
              : 'Adding and editing routes unlocks once an admin verifies your business. '}
            {op.verificationStatus !== 'suspended' && (
              <Link to="/operator/verification" className="font-label-lg text-secondary underline">
                Check your verification status
              </Link>
            )}
          </span>
        </p>
      )}

      <dl className="mt-space-lg grid gap-space-md sm:grid-cols-3">
        <Stat label="Active routes" value={active.length} icon={RouteIcon} />
        <Stat
          label="Need confirmation"
          value={stale.length}
          icon={RefreshCw}
          tone={stale.length ? 'warning' : undefined}
        />
        <Stat
          label="Enquiries awaiting reply"
          value={waiting.length}
          icon={MessageSquare}
          tone={waiting.length ? 'info' : undefined}
        />
      </dl>

      <div className="mt-space-xl grid gap-space-xl xl:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col gap-space-xl">
          <Section title="Routes" icon={RouteIcon}>
            {routes.length === 0 ? (
              <EmptyState
                icon={RouteIcon}
                title="No routes yet"
                description={
                  verified
                    ? 'Add your first route so commuters can find your service.'
                    : 'You can add routes once you’re verified.'
                }
                action={
                  verified ? (
                    <ButtonLink to="/operator/routes/new">
                      <Plus aria-hidden className="size-4" />
                      Add a route
                    </ButtonLink>
                  ) : undefined
                }
              />
            ) : (
              <ul className="grid gap-space-md lg:grid-cols-2">
                {routes.map((r) => (
                  <li key={r.id}>
                    <RouteCard route={r} canEdit={verified} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {routes.length > 0 && (
            <Section title="Scheduled services" icon={CalendarClock}>
              <ScheduleTable routes={routes} />
            </Section>
          )}
        </div>

        <Section title="Enquiries" icon={MessageSquare}>
          {enquiries.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No enquiries yet"
              description="Questions from commuters about your routes appear here."
            />
          ) : (
            <ul className="flex flex-col gap-space-md">
              {enquiries.map((e) => (
                <li key={e.id}>
                  <EnquiryItem enquiry={e} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof RouteIcon
  tone?: 'warning' | 'info'
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card">
      <div>
        <dt className="text-body-md text-on-surface-variant">{label}</dt>
        <dd className="text-headline-lg font-headline-lg">{value}</dd>
      </div>
      <Icon
        aria-hidden
        className={
          tone === 'warning'
            ? 'size-6 text-warning'
            : tone === 'info'
              ? 'size-6 text-secondary'
              : 'size-6 text-on-surface-variant'
        }
      />
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof RouteIcon
  children: ReactNode
}) {
  const id = `op-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="mb-space-md flex items-center gap-space-sm text-headline-sm font-headline-sm"
      >
        <Icon aria-hidden className="size-5 text-secondary" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function useRouteActions() {
  const api = useApi()
  const toast = useToast()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['routes', 'mine'] })
  const reconfirm = useMutation({
    mutationFn: (id: string) => api.reconfirmRoute(id),
    onSuccess: async () => {
      await refresh()
      toast.success('Listing confirmed', 'The “Updated” date is now today.')
    },
    onError: (e) => toast.error('Couldn’t confirm the listing', errorText(e)),
  })
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      api.updateRoute(id, { status }),
    onSuccess: async (r) => {
      await refresh()
      toast.success(
        r.status === 'active' ? 'Route activated' : 'Route deactivated',
        r.status === 'active' ? 'Commuters can find it again.' : 'It’s hidden from search.',
      )
    },
    onError: (e) => toast.error('Couldn’t update the route', errorText(e)),
  })
  return { reconfirm, setStatus }
}

function RouteCard({ route: r, canEdit }: { route: OperatorRoute; canEdit: boolean }) {
  const { reconfirm, setStatus } = useRouteActions()
  const status = ROUTE_STATUS[r.status]
  const suspended = r.status === 'suspended'
  return (
    <article
      aria-label={r.routeName}
      className="flex h-full flex-col gap-space-sm rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card"
    >
      <div className="flex flex-wrap items-center gap-space-sm">
        <Chip tone={status.tone}>{status.label}</Chip>
        <Chip tone="neutral">{TRANSPORT_LABELS[r.transportType]}</Chip>
        {r.needsConfirmation && !suspended && (
          <Chip tone="warning" icon={TriangleAlert}>
            Needs confirmation
          </Chip>
        )}
      </div>
      <h3 className="text-title-md font-title-md">
        <Link to={routeListingPath(r.id)} className="hover:underline">
          {r.routeName}
        </Link>
      </h3>
      <p className="text-body-md">
        {r.origin.label} → {r.destination.label}
        {r.stops.length > 0 && (
          <span className="text-on-surface-variant">
            {' '}
            · {r.stops.length} {r.stops.length === 1 ? 'stop' : 'stops'}
          </span>
        )}
      </p>
      <p className="text-body-md text-on-surface-variant">{r.scheduleDescription}</p>
      <p className="flex flex-wrap justify-between gap-space-sm text-body-md">
        <span className="font-label-lg">{describeFare(r)}</span>
        <span className="text-on-surface-variant">Updated {formatDate(r.lastConfirmedAt)}</span>
      </p>
      {r.needsConfirmation && !suspended && (
        <p className="text-body-sm text-warning">
          Commuters see a warning until you confirm this listing is still accurate.
        </p>
      )}
      {!suspended && (
        <div className="mt-auto flex flex-wrap gap-space-sm border-t border-border-default pt-space-sm">
          <Button
            variant={r.needsConfirmation ? 'primary' : 'outline'}
            onClick={() => reconfirm.mutate(r.id)}
            loading={reconfirm.isPending}
            aria-label={`Reconfirm listing ${r.routeName}`}
          >
            <CircleCheck aria-hidden className="size-4" />
            Reconfirm listing
          </Button>
          {canEdit && (
            <ButtonLink
              to={`/operator/routes/${r.id}/edit`}
              variant="ghost"
              aria-label={`Edit ${r.routeName}`}
            >
              <Pencil aria-hidden className="size-4" />
              Edit
            </ButtonLink>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              onClick={() =>
                setStatus.mutate({
                  id: r.id,
                  status: r.status === 'active' ? 'inactive' : 'active',
                })
              }
              loading={setStatus.isPending}
              aria-label={`${r.status === 'active' ? 'Deactivate' : 'Activate'} ${r.routeName}`}
            >
              <Power aria-hidden className="size-4" />
              {r.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      )}
      {suspended && (
        <p className="text-body-sm text-error">
          Suspended by an admin. Contact support to resolve.
        </p>
      )}
    </article>
  )
}

/** Timetable-style overview of every route the operator runs. */
function ScheduleTable({ routes }: { routes: OperatorRoute[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-default bg-surface-container-lowest shadow-card">
      <table className="w-full min-w-[40rem] text-left text-body-md">
        <caption className="sr-only">Scheduled services</caption>
        <thead className="bg-surface-container-low text-label-lg">
          <tr>
            <th scope="col" className="p-space-sm pl-space-md">
              Route
            </th>
            <th scope="col" className="p-space-sm">
              Runs (SAST)
            </th>
            <th scope="col" className="p-space-sm">
              Fare
            </th>
            <th scope="col" className="p-space-sm">
              Status
            </th>
            <th scope="col" className="p-space-sm pr-space-md">
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {routes.map((r) => (
            <tr key={r.id}>
              <th scope="row" className="p-space-sm pl-space-md font-label-lg">
                {r.routeName}
                <span className="block font-normal text-body-sm text-on-surface-variant">
                  {TRANSPORT_LABELS[r.transportType]} · {r.origin.label} → {r.destination.label}
                </span>
              </th>
              <td className="p-space-sm">{r.scheduleDescription}</td>
              <td className="p-space-sm whitespace-nowrap">{describeFare(r)}</td>
              <td className="p-space-sm">{ROUTE_STATUS[r.status].label}</td>
              <td className="p-space-sm pr-space-md whitespace-nowrap">
                {formatDate(r.lastConfirmedAt)}
                {r.needsConfirmation && r.status !== 'suspended' && (
                  <span className="block text-body-sm text-warning">Needs confirmation</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EnquiryItem({ enquiry: e }: { enquiry: Enquiry }) {
  const api = useApi()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [replying, setReplying] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const reply = useMutation({
    mutationFn: () => api.respondToEnquiry(e.id, text.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['enquiries', 'mine'] })
      toast.success('Reply sent', `${e.commuter.displayName} has been notified.`)
      setReplying(false)
    },
    onError: (err) => setError(errorText(err)),
  })

  function send() {
    if (!text.trim()) {
      setError('Write a reply.')
      return
    }
    setError(null)
    reply.mutate()
  }

  return (
    <Card className="md:p-space-md">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <p className="font-label-lg">
          {e.commuter.displayName}
          <span className="font-normal text-on-surface-variant"> · {e.routeName}</span>
        </p>
        {e.status === 'new' ? (
          <Chip tone="info">Awaiting reply</Chip>
        ) : e.status === 'responded' ? (
          <Chip tone="success">Replied</Chip>
        ) : (
          <Chip tone="neutral">Closed</Chip>
        )}
      </div>
      <p className="mt-space-xs text-body-sm text-on-surface-variant">{formatDate(e.createdAt)}</p>
      <blockquote className="mt-space-sm rounded-lg bg-surface-container-low p-space-sm text-body-md">
        “{e.message}”
      </blockquote>
      {e.response && (
        <p className="mt-space-sm text-body-md">
          <span className="font-label-lg">Your reply: </span>
          {e.response}
        </p>
      )}
      {e.status === 'new' &&
        (replying ? (
          <div className="mt-space-sm flex flex-col gap-space-sm">
            <Field label={`Reply to ${e.commuter.displayName}`} error={error ?? undefined}>
              {(c) => (
                <Textarea
                  {...c}
                  maxLength={1000}
                  value={text}
                  onChange={(ev) => setText(ev.target.value)}
                />
              )}
            </Field>
            <div className="flex gap-space-sm">
              <Button onClick={send} loading={reply.isPending}>
                Send reply
              </Button>
              <Button variant="ghost" onClick={() => setReplying(false)} disabled={reply.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="mt-space-sm" onClick={() => setReplying(true)}>
            <MessageSquare aria-hidden className="size-4" />
            Reply
          </Button>
        ))}
    </Card>
  )
}
