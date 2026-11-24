import { useQueries, useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CarFront,
  Check,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Chip, StatusChip, type ChipTone } from '../../components/ui/Chip'
import { EmptyState, ErrorState, LoadingList } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import type { Journey, JourneyOccurrence, JourneyRequest } from '../../lib/api/types'
import { cn } from '../../lib/cn'
import { journeyListingPath } from '../../lib/paths'
import { describeSchedule, formatTrip } from '../../lib/schedule'
import { CancelJourneyModal } from './CancelJourneyModal'
import { EditJourneyModal } from './EditJourneyModal'
import { useJourneyActions } from './useJourneyActions'

type Tab = 'active' | 'paused' | 'ended' | 'riding'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'ended', label: 'Ended' },
  { id: 'riding', label: 'Rides I’ve joined' },
]

const inTab = (j: Journey, tab: Tab) =>
  tab === 'active'
    ? j.status === 'open' || j.status === 'full'
    : tab === 'paused'
      ? j.status === 'paused' || j.status === 'draft'
      : j.status === 'cancelled' || j.status === 'completed'

const STATUS: Record<Journey['status'], { label: string; tone: ChipTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  open: { label: 'Open', tone: 'success' },
  full: { label: 'Full', tone: 'warning' },
  paused: { label: 'Paused', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  completed: { label: 'Completed', tone: 'neutral' },
}

/** S10 Journey Management (PRD F3, F7): the publisher's workspace. */
export function JourneyManagementPage() {
  const api = useApi()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'active') as Tab
  const journeys = useQuery({ queryKey: ['journeys', 'mine'], queryFn: () => api.listMyJourneys() })
  const requests = useQuery({ queryKey: ['requests', 'mine'], queryFn: () => api.listMyRequests() })

  const received = requests.data?.received ?? []
  const pending = received.filter((r) => r.status === 'pending')
  const all = journeys.data ?? []

  return (
    <div className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <h1 className="text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
            My journeys
          </h1>
          <p className="mt-space-xs text-body-lg text-on-surface-variant">
            Manage the journeys you publish and answer requests to join. Times are in SAST.
          </p>
        </div>
        <ButtonLink to="/commuter/journeys/new">
          <Plus aria-hidden className="size-4" />
          Publish a journey
        </ButtonLink>
      </header>

      {journeys.isPending || requests.isPending ? (
        <div className="mt-space-lg">
          <LoadingList count={3} label="Loading your journeys…" />
        </div>
      ) : journeys.isError || requests.isError ? (
        <ErrorState
          className="mt-space-lg"
          onRetry={() => {
            void journeys.refetch()
            void requests.refetch()
          }}
        />
      ) : (
        <>
          <PendingRequests requests={pending} journeys={all} />

          <div className="mt-space-xl">
            <div
              role="tablist"
              aria-label="Journeys"
              className="flex flex-wrap gap-space-xs border-b border-border-default"
            >
              {TABS.map((t) => {
                const count =
                  t.id === 'riding'
                    ? (requests.data?.sent ?? []).filter((r) => r.status === 'accepted').length
                    : all.filter((j) => inTab(j, t.id)).length
                return (
                  <button
                    key={t.id}
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={tab === t.id}
                    aria-controls={`panel-${t.id}`}
                    onClick={() => setParams({ tab: t.id }, { replace: true })}
                    className={cn(
                      '-mb-px min-h-11 border-b-2 px-space-md text-label-lg font-label-lg',
                      tab === t.id
                        ? 'border-primary-container text-on-surface'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    {t.label} <span className="text-on-surface-variant">({count})</span>
                  </button>
                )
              })}
            </div>
            <div
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              className="mt-space-lg"
            >
              {tab === 'riding' ? (
                <RidingList requests={requests.data?.sent ?? []} />
              ) : (
                <PublishedList
                  journeys={all.filter((j) => inTab(j, tab))}
                  received={received}
                  tab={tab}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PendingRequests({
  requests,
  journeys,
}: {
  requests: JourneyRequest[]
  journeys: Journey[]
}) {
  const { respond } = useJourneyActions()
  if (requests.length === 0) return null
  const byId = new Map(journeys.map((j) => [j.id, j]))
  return (
    <section
      aria-labelledby="pending-requests"
      className="mt-space-lg rounded-2xl border border-secondary/25 bg-secondary/5 p-space-md md:p-space-lg"
    >
      <h2
        id="pending-requests"
        className="flex items-center gap-space-sm text-headline-sm font-headline-sm"
      >
        <UserCheck aria-hidden className="size-5 text-secondary" />
        Requests waiting for you ({requests.length})
      </h2>
      <p className="mt-space-xs text-body-md text-on-surface-variant">
        Accepting takes a seat. Share the exact meeting point with the rider once you’ve accepted.
      </p>
      <ul className="mt-space-md grid gap-space-md md:grid-cols-2">
        {requests.map((r) => {
          const j = byId.get(r.journeyId)
          const busy = respond.isPending && respond.variables?.id === r.id
          const full = !!j && j.seatsAvailable <= 0
          return (
            <li
              key={r.id}
              className="flex flex-col gap-space-sm rounded-xl border border-border-default bg-surface-container-lowest p-space-md shadow-card"
            >
              <p className="text-title-md font-title-md">{r.commuter.displayName}</p>
              {j && (
                <p className="text-body-md text-on-surface-variant">
                  {j.originZone} → {j.destinationZone} · {describeSchedule(j)}
                </p>
              )}
              {r.message && (
                <blockquote className="rounded-lg bg-surface-container-low p-space-sm text-body-md">
                  “{r.message}”
                </blockquote>
              )}
              {full && (
                <p className="text-body-sm text-warning">
                  This journey is full. Free up a seat before accepting.
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-space-sm">
                <Button
                  onClick={() => respond.mutate({ id: r.id, action: { action: 'accept' } })}
                  disabled={respond.isPending || full}
                  loading={busy && respond.variables?.action.action === 'accept'}
                  aria-label={`Accept ${r.commuter.displayName}`}
                >
                  <Check aria-hidden className="size-4" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => respond.mutate({ id: r.id, action: { action: 'reject' } })}
                  disabled={respond.isPending}
                  loading={busy && respond.variables?.action.action === 'reject'}
                  aria-label={`Decline ${r.commuter.displayName}`}
                >
                  <X aria-hidden className="size-4" />
                  Decline
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PublishedList({
  journeys,
  received,
  tab,
}: {
  journeys: Journey[]
  received: JourneyRequest[]
  tab: Exclude<Tab, 'riding'>
}) {
  if (journeys.length === 0) {
    return (
      <EmptyState
        icon={CarFront}
        title={
          tab === 'active'
            ? 'No active journeys'
            : tab === 'paused'
              ? 'No paused journeys'
              : 'No ended journeys'
        }
        description={
          tab === 'active'
            ? 'Publish a journey to offer your spare seats to commuters going your way.'
            : undefined
        }
        action={
          tab === 'active' ? (
            <ButtonLink to="/commuter/journeys/new">
              <Plus aria-hidden className="size-4" />
              Publish a journey
            </ButtonLink>
          ) : undefined
        }
      />
    )
  }
  return (
    <ul className="grid gap-space-md lg:grid-cols-2">
      {journeys.map((j) => (
        <li key={j.id}>
          <ManagedJourneyCard journey={j} requests={received.filter((r) => r.journeyId === j.id)} />
        </li>
      ))}
    </ul>
  )
}

function ManagedJourneyCard({
  journey: j,
  requests,
}: {
  journey: Journey
  requests: JourneyRequest[]
}) {
  const api = useApi()
  const toast = useToast()
  const { updateJourney, errorMessage } = useJourneyActions()
  const [editing, setEditing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const live = j.status === 'open' || j.status === 'full' || j.status === 'paused'
  const occurrences = useQuery({
    queryKey: ['journey', j.id, 'occurrences'],
    queryFn: () => api.listJourneyOccurrences(j.id),
    enabled: j.journeyType === 'recurring' && live,
  })
  const accepted = requests.filter((r) => r.status === 'accepted')
  const pending = requests.filter((r) => r.status === 'pending')
  const status = STATUS[j.status]

  function setStatus(next: 'paused' | 'open') {
    updateJourney.mutate(
      { id: j.id, update: { status: next } },
      {
        onSuccess: () =>
          toast.success(
            next === 'paused' ? 'Journey paused' : 'Journey resumed',
            next === 'paused' ? 'It’s hidden from search until you resume it.' : undefined,
          ),
        onError: (e) => toast.error('Couldn’t update the journey', errorMessage(e)),
      },
    )
  }

  return (
    <article className="flex h-full flex-col gap-space-sm rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card md:p-space-lg">
      <div className="flex flex-wrap items-center gap-space-sm">
        <Chip tone={status.tone}>{status.label}</Chip>
        <Chip tone="neutral">{j.journeyType === 'recurring' ? 'Recurring' : 'Once-off'}</Chip>
        {pending.length > 0 && <Chip tone="info">{pending.length} pending</Chip>}
      </div>
      <h3 className="text-title-md font-title-md">
        <Link to={journeyListingPath(j.id)} className="hover:underline">
          {j.originZone} <span aria-hidden>→</span>
          <span className="sr-only">to</span> {j.destinationZone}
        </Link>
      </h3>
      <p className="text-body-md text-on-surface-variant">{describeSchedule(j)}</p>
      <p className="text-body-md">
        <Users aria-hidden className="mr-space-xs inline size-4 text-secondary" />
        {j.seatsAvailable > 0
          ? `${j.seatsAvailable} of ${j.vehicleCapacity} seats still available`
          : 'Full: no seats available'}
        {accepted.length > 0 &&
          ` · riders: ${accepted.map((r) => r.commuter.displayName).join(', ')}`}
      </p>

      {j.journeyType === 'recurring' && live && (occurrences.data?.length ?? 0) > 0 && (
        <NextTrips journeyId={j.id} occurrences={occurrences.data!} />
      )}

      {live && (
        <div className="mt-auto flex flex-wrap gap-space-sm border-t border-border-default pt-space-md">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil aria-hidden className="size-4" />
            Edit
          </Button>
          {j.status === 'paused' ? (
            <Button
              variant="outline"
              onClick={() => setStatus('open')}
              loading={updateJourney.isPending}
            >
              <Play aria-hidden className="size-4" />
              Resume
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setStatus('paused')}
              loading={updateJourney.isPending}
            >
              <Pause aria-hidden className="size-4" />
              Pause
            </Button>
          )}
          <Button variant="ghost" className="text-error" onClick={() => setCancelling(true)}>
            <XCircle aria-hidden className="size-4" />
            Cancel journey
          </Button>
        </div>
      )}

      {editing && <EditJourneyModal journey={j} open onClose={() => setEditing(false)} />}
      <CancelJourneyModal
        journey={j}
        requests={requests}
        open={cancelling}
        onClose={() => setCancelling(false)}
      />
    </article>
  )
}

function NextTrips({
  journeyId,
  occurrences,
}: {
  journeyId: string
  occurrences: JourneyOccurrence[]
}) {
  const [now] = useState(() => new Date().toISOString())
  const next = occurrences.filter((o) => o.departureAt >= now).slice(0, 4)
  if (next.length === 0) return null
  return (
    <div>
      <h4 className="text-label-lg font-label-lg">Next trips</h4>
      <ul className="mt-space-xs flex flex-wrap gap-space-sm">
        {next.map((o) => (
          <li key={o.id}>
            <Link
              to={`/commuter/journeys/${journeyId}/occurrences/${o.id}`}
              className={cn(
                'inline-flex min-h-11 items-center gap-space-xs rounded-lg border px-space-sm text-body-md hover:border-primary-container',
                o.status === 'cancelled'
                  ? 'border-border-default text-on-surface-variant line-through'
                  : 'border-border-strong',
              )}
            >
              {formatTrip(o.departureAt)}
              {o.status === 'cancelled' && <span className="sr-only"> (skipped)</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Journeys the user has been accepted on, as a rider. */
function RidingList({ requests }: { requests: JourneyRequest[] }) {
  const api = useApi()
  const accepted = requests.filter((r) => r.status === 'accepted')
  const journeys = useQueries({
    queries: accepted.map((r) => ({
      queryKey: ['journey', r.journeyId],
      queryFn: () => api.getJourney(r.journeyId),
    })),
  })
  if (accepted.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="You haven’t joined any rides yet"
        description="Find a shared journey going your way and request to join. Accepted rides show here."
        action={
          <ButtonLink to="/commuter/matches">
            <Search aria-hidden className="size-4" />
            See possible matches
          </ButtonLink>
        }
      />
    )
  }
  if (journeys.some((q) => q.isPending)) return <LoadingList count={2} label="Loading rides…" />
  return (
    <ul className="grid gap-space-md lg:grid-cols-2">
      {accepted.map((r, i) => {
        const j = journeys[i].data
        if (!j) return null
        return (
          <li key={r.id}>
            <RideCard journey={j}>
              <StatusChip status={r.status} />
            </RideCard>
          </li>
        )
      })}
    </ul>
  )
}

function RideCard({ journey: j, children }: { journey: Journey; children: ReactNode }) {
  return (
    <article className="flex h-full flex-col gap-space-sm rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card">
      <div className="flex flex-wrap items-center gap-space-sm">
        {children}
        <Chip tone="neutral">{STATUS[j.status].label}</Chip>
      </div>
      <h3 className="text-title-md font-title-md">
        {j.originZone} <span aria-hidden>→</span>
        <span className="sr-only">to</span> {j.destinationZone}
      </h3>
      <p className="text-body-md text-on-surface-variant">
        {describeSchedule(j)} · with {j.publisher.displayName}
      </p>
      <Link
        to={journeyListingPath(j.id)}
        className="mt-auto inline-flex items-center gap-space-xs font-label-lg text-secondary hover:underline"
      >
        View journey
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </article>
  )
}
