import { useQueries, useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Bookmark,
  CalendarClock,
  CarFront,
  MailWarning,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chip, StatusChip } from '../../components/ui/Chip'
import { EmptyState, ErrorState, LoadingList } from '../../components/ui/States'
import { useApi } from '../../lib/api/apiContext'
import type { Journey, Me } from '../../lib/api/types'
import { useSession } from '../../lib/session/session'
import { sastToday } from '../../lib/time'
import { useSavedSearches } from '../search/savedSearches'
import { SearchForm } from '../search/SearchForm'
import { toSearchUrl } from '../search/searchQuery'
import { usePlaceRef } from '../search/usePlaceRef'
import { byNextDeparture, describeSchedule, isUpcoming } from './upcoming'

const linkClass = 'font-label-lg text-secondary underline-offset-2 hover:underline'

/** S5 Commuter Dashboard (PRD §8.1): quick search, upcoming journeys, active requests, saved searches. */
export function CommuterDashboard({ now = () => new Date() }: { now?: () => Date }) {
  const { user } = useSession()
  if (!user) return null
  return <Dashboard user={user} now={now()} />
}

function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Johannesburg',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  )
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function Dashboard({ user, now }: { user: Me; now: Date }) {
  return (
    <div className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin">
      <header>
        <h1 className="text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
          {greeting(now)}, {user.fullName.split(' ')[0]}
        </h1>
        <p className="mt-space-xs text-body-lg text-on-surface-variant">
          Your trips and requests at a glance. Times are in SAST.
        </p>
      </header>

      {!user.emailVerified && (
        <p
          role="status"
          className="mt-space-md flex items-start gap-space-sm rounded-xl border border-accent/40 bg-accent/10 p-space-md text-body-md"
        >
          <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            <strong>Verify your email</strong> to send requests and publish journeys. We sent a link
            to {user.email}.
          </span>
        </p>
      )}

      <QuickSearch user={user} now={now} />

      <div className="mt-space-xl grid gap-space-xl lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-space-xl">
          <UpcomingJourneys now={now} />
          <ActiveRequests />
        </div>
        <SavedSearches userId={user.id} />
      </div>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string
  icon: typeof Search
  action?: ReactNode
  children: ReactNode
}) {
  const id = `section-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={id}>
      <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-sm">
        <h2 id={id} className="flex items-center gap-space-sm text-headline-sm font-headline-sm">
          <Icon aria-hidden className="size-5 text-secondary" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function QuickSearch({ user, now }: { user: Me; now: Date }) {
  const origin = usePlaceRef(user.preferences.usualOriginId)
  const destination = usePlaceRef(user.preferences.usualDestinationId)
  return (
    <Card className="mt-space-lg bg-gradient-to-br from-primary-container to-[#06192a] text-on-primary md:p-space-xl">
      <h2 className="text-headline-lg font-headline-lg">Where are you heading?</h2>
      <p className="mt-space-xs text-body-md text-inverse-primary">
        Compare operator routes and shared journeys for your trip.
      </p>
      <div className="mt-space-md rounded-xl bg-surface-container-lowest p-space-md text-on-surface">
        {origin.isLoading || destination.isLoading ? (
          <LoadingList count={1} label="Loading your usual commute…" />
        ) : (
          <SearchForm
            now={() => now}
            initial={{
              origin: origin.place ?? undefined,
              destination: destination.place ?? undefined,
              time: user.preferences.usualDepartureTime ?? undefined,
            }}
          />
        )}
      </div>
    </Card>
  )
}

function UpcomingJourneys({ now }: { now: Date }) {
  const api = useApi()
  const requests = useQuery({ queryKey: ['requests', 'mine'], queryFn: () => api.listMyRequests() })
  const published = useQuery({
    queryKey: ['journeys', 'mine'],
    queryFn: () => api.listMyJourneys(),
  })

  const acceptedIds = [
    ...new Set(
      (requests.data?.sent ?? []).filter((r) => r.status === 'accepted').map((r) => r.journeyId),
    ),
  ]
  const riding = useQueries({
    queries: acceptedIds.map((id) => ({
      queryKey: ['journey', id],
      queryFn: () => api.getJourney(id),
    })),
  })

  const isPending = requests.isPending || published.isPending || riding.some((q) => q.isPending)
  const isError = requests.isError || published.isError || riding.some((q) => q.isError)

  const items: Array<{ journey: Journey; role: 'riding' | 'publishing' }> = [
    ...riding.flatMap((q) => (q.data ? [{ journey: q.data, role: 'riding' as const }] : [])),
    ...(published.data ?? []).map((journey) => ({ journey, role: 'publishing' as const })),
  ]
    .filter((i) => isUpcoming(i.journey, now))
    .sort((a, b) => byNextDeparture(a.journey, b.journey))

  return (
    <Section
      title="Upcoming journeys"
      icon={CalendarClock}
      action={
        <Link to="/commuter/journeys" className={linkClass}>
          Manage my journeys
        </Link>
      }
    >
      {isPending ? (
        <LoadingList count={2} label="Loading upcoming journeys…" />
      ) : isError ? (
        <ErrorState
          description="We couldn’t load your journeys. Check your connection and try again."
          onRetry={() => {
            void requests.refetch()
            void published.refetch()
            riding.forEach((q) => void q.refetch())
          }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No upcoming journeys"
          description="When a driver accepts your request, or you publish a journey, it shows up here."
          action={
            <div className="flex flex-wrap justify-center gap-space-sm">
              <ButtonLink to="/search">
                <Search aria-hidden className="size-4" />
                Find transport
              </ButtonLink>
              <ButtonLink to="/commuter/journeys/new" variant="outline">
                <Plus aria-hidden className="size-4" />
                Publish a journey
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <ul className="grid gap-space-md md:grid-cols-2">
          {items.map(({ journey: j, role }) => (
            <li key={`${role}-${j.id}`}>
              <article className="flex h-full flex-col gap-space-sm rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card">
                <div className="flex flex-wrap items-center gap-space-sm">
                  {role === 'riding' ? (
                    <Chip tone="success" icon={Users}>
                      You’re riding
                    </Chip>
                  ) : (
                    <Chip tone="primary" icon={CarFront}>
                      You’re driving
                    </Chip>
                  )}
                  {j.status === 'full' && <Chip tone="neutral">Full</Chip>}
                  {j.status === 'paused' && <Chip tone="warning">Paused</Chip>}
                </div>
                <h3 className="text-title-md font-title-md">
                  {j.originZone} <span aria-hidden>→</span>
                  <span className="sr-only">to</span> {j.destinationZone}
                </h3>
                <p className="text-body-md text-on-surface-variant">{describeSchedule(j)}</p>
                <p className="text-body-md text-on-surface-variant">
                  {role === 'riding'
                    ? `With ${j.publisher.displayName}`
                    : `${j.seatsAvailable} of ${j.vehicleCapacity} seats open`}
                </p>
                <Link
                  to={role === 'riding' ? `/listings/${j.id}` : '/commuter/journeys'}
                  className={`mt-auto inline-flex items-center gap-space-xs ${linkClass}`}
                >
                  {role === 'riding' ? 'View journey' : 'Manage journey'}
                  <ArrowRight aria-hidden className="size-4" />
                  <span className="sr-only">
                    {' '}
                    {j.originZone} to {j.destinationZone}
                  </span>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function ActiveRequests() {
  const api = useApi()
  const requests = useQuery({ queryKey: ['requests', 'mine'], queryFn: () => api.listMyRequests() })
  const enquiries = useQuery({
    queryKey: ['enquiries', 'mine'],
    queryFn: () => api.listMyEnquiries(),
  })
  const active = (requests.data?.sent ?? []).filter((r) => r.status === 'pending')
  const journeys = useQueries({
    queries: active.map((r) => ({
      queryKey: ['journey', r.journeyId],
      queryFn: () => api.getJourney(r.journeyId),
    })),
  })
  const openEnquiries = (enquiries.data?.sent ?? []).filter((e) => e.status !== 'closed')

  const isPending = requests.isPending || enquiries.isPending || journeys.some((q) => q.isPending)
  const isError = requests.isError || enquiries.isError

  const rows = [
    ...active.map((r, i) => {
      const j = journeys[i]?.data
      return {
        key: r.id,
        kind: 'Join request',
        title: j ? `${j.originZone} → ${j.destinationZone}` : 'Shared journey',
        detail: j ? `${describeSchedule(j)} · with ${j.publisher.displayName}` : '',
        chip: <StatusChip status={r.status} />,
        createdAt: r.createdAt,
      }
    }),
    ...openEnquiries.map((e) => ({
      key: e.id,
      kind: 'Enquiry',
      title: e.routeName,
      detail: e.response ? 'The operator replied' : 'Waiting for the operator to reply',
      chip:
        e.status === 'responded' ? (
          <Chip tone="success" icon={MessageSquare}>
            Replied
          </Chip>
        ) : (
          <StatusChip status="pending" />
        ),
      createdAt: e.createdAt,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <Section
      title="Active requests"
      icon={MessageSquare}
      action={
        <Link to="/requests" className={linkClass}>
          View all requests
        </Link>
      }
    >
      {isPending ? (
        <LoadingList count={2} label="Loading your requests…" />
      ) : isError ? (
        <ErrorState
          description="We couldn’t load your requests. Check your connection and try again."
          onRetry={() => {
            void requests.refetch()
            void enquiries.refetch()
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No active requests"
          description="Requests to join shared journeys and enquiries to operators appear here while they’re waiting for a reply."
          action={
            <ButtonLink to="/search">
              <Search aria-hidden className="size-4" />
              Find transport
            </ButtonLink>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-default rounded-2xl border border-border-default bg-surface-container-lowest shadow-card">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-center justify-between gap-space-sm p-space-md"
            >
              <div className="min-w-0">
                <p className="text-label-md font-label-md uppercase text-on-surface-variant">
                  {row.kind}
                </p>
                <p className="text-title-md font-title-md">{row.title}</p>
                {row.detail && <p className="text-body-md text-on-surface-variant">{row.detail}</p>}
              </div>
              {row.chip}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function SavedSearches({ userId }: { userId: string }) {
  const { searches, remove } = useSavedSearches(userId)
  const today = sastToday()
  return (
    <Section title="Saved searches" icon={Bookmark}>
      {searches.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved searches"
          description="Save a search from the results page to run it again in one tap."
          action={
            <ButtonLink to="/search" variant="outline">
              <Search aria-hidden className="size-4" />
              Search transport
            </ButtonLink>
          }
        />
      ) : (
        <ul className="flex flex-col gap-space-sm">
          {searches.map(({ id, query }) => {
            const label = `${query.origin.label} to ${query.destination.label}`
            return (
              <li
                key={id}
                className="flex items-center gap-space-sm rounded-xl border border-border-default bg-surface-container-lowest p-space-sm pl-space-md shadow-card"
              >
                <Link
                  to={toSearchUrl({ ...query, date: today })}
                  className="min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-secondary"
                >
                  <span className="block truncate text-title-md font-title-md">{label}</span>
                  <span className="block text-body-sm text-on-surface-variant">
                    {query.frequency === 'recurring' ? 'Recurring commute' : 'Once-off trip'}
                    {query.time ? ` · around ${query.time}` : ' · any time'}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => remove(id)}
                  aria-label={`Remove saved search ${label}`}
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
