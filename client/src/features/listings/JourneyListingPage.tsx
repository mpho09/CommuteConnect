import { useQuery } from '@tanstack/react-query'
import { MapPin, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Chip, StatusChip } from '../../components/ui/Chip'
import { ErrorState, LoadingList } from '../../components/ui/States'
import { useApi } from '../../lib/api/apiContext'
import { isApiError } from '../../lib/api/errors'
import type { Journey, JourneyOccurrence, Me } from '../../lib/api/types'
import { formatFare, formatTime } from '../../lib/format'
import { describeSchedule } from '../../lib/schedule'
import { useSession } from '../../lib/session/session'
import { describeDays } from '../../lib/time'
import { JoinRequestDialog } from './JoinRequestDialog'
import {
  ActionGate,
  DetailSection,
  Fact,
  ListingGrid,
  ListingPage,
  NotFound,
  ReportListing,
} from './ListingParts'

const UPCOMING_SHOWN = 5

const dayDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Johannesburg',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const plainDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const ymd = (d: string) => plainDate.format(new Date(`${d}T00:00:00Z`))

/** S8 Listing Details for a community shared journey (US10). */
export function JourneyListingPage() {
  const { journeyId = '' } = useParams()
  const api = useApi()
  const journey = useQuery({
    queryKey: ['journey', journeyId],
    queryFn: () => api.getJourney(journeyId),
  })
  const occurrences = useQuery({
    queryKey: ['journey', journeyId, 'occurrences'],
    queryFn: () => api.listJourneyOccurrences(journeyId),
    enabled: journey.data?.journeyType === 'recurring',
  })

  return (
    <ListingPage>
      {journey.isPending ? (
        <LoadingList count={2} label="Loading journey…" />
      ) : journey.isError ? (
        isApiError(journey.error) && journey.error.code === 'not_found' ? (
          <NotFound />
        ) : (
          <ErrorState onRetry={() => void journey.refetch()} />
        )
      ) : (
        <JourneyDetails journey={journey.data} occurrences={occurrences.data ?? []} />
      )}
    </ListingPage>
  )
}

function JourneyDetails({
  journey: j,
  occurrences,
}: {
  journey: Journey
  occurrences: JourneyOccurrence[]
}) {
  const { user } = useSession()
  const [requesting, setRequesting] = useState(false)
  // Fixed at mount so the list doesn't shift between renders.
  const [now] = useState(() => new Date().toISOString())
  const upcoming = occurrences
    .filter((o) => o.status !== 'completed' && o.departureAt >= now)
    .slice(0, UPCOMING_SHOWN)

  return (
    <>
      <ListingGrid
        main={
          <>
            <header className="rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card md:p-space-lg">
              <div className="flex flex-wrap items-center gap-space-sm">
                <Chip tone="info" icon={Users}>
                  Community shared journey
                </Chip>
                <Chip tone="neutral">
                  {j.journeyType === 'recurring' ? 'Recurring' : 'Once-off'}
                </Chip>
                {j.status !== 'open' && <JourneyStatusChip status={j.status} />}
              </div>
              <h1 className="mt-space-sm flex flex-wrap items-center gap-x-space-sm text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
                {j.originZone} <span aria-hidden>→</span>
                <span className="sr-only">to</span> {j.destinationZone}
              </h1>
              <p className="mt-space-xs text-body-lg text-on-surface-variant">
                {describeSchedule(j)}
              </p>
              <p className="mt-space-md flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-md text-body-md text-on-surface-variant">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-secondary" />
                Pickup and drop-off are shown as areas. The driver shares the exact meeting point
                once they accept a request.
              </p>
            </header>

            <DetailSection title="Schedule">
              <dl className="grid gap-space-md sm:grid-cols-2">
                {j.schedule ? (
                  <>
                    <Fact label="Days">{describeDays(j.schedule.daysOfWeek)}</Fact>
                    <Fact label="Departs">{j.schedule.departureTime} SAST</Fact>
                    <Fact label="Runs from">{ymd(j.schedule.validFrom)}</Fact>
                    <Fact label="Until">
                      {j.schedule.validUntil ? ymd(j.schedule.validUntil) : 'No end date'}
                    </Fact>
                  </>
                ) : (
                  j.departureAt && (
                    <>
                      <Fact label="Date">{dayDate.format(new Date(j.departureAt))}</Fact>
                      <Fact label="Departs">{formatTime(j.departureAt)} SAST</Fact>
                    </>
                  )
                )}
              </dl>
              {upcoming.length > 0 && (
                <>
                  <h3 className="mt-space-lg text-title-md font-title-md">Next trips</h3>
                  <ul className="mt-space-sm flex flex-col divide-y divide-border-default">
                    {upcoming.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center justify-between gap-space-sm py-space-sm"
                      >
                        <span>
                          {dayDate.format(new Date(o.departureAt))} · {formatTime(o.departureAt)}
                        </span>
                        {o.status === 'cancelled' ? (
                          <Chip tone="neutral">Cancelled</Chip>
                        ) : (
                          <span className="text-body-md text-on-surface-variant">
                            {seatsText(o.seatsAvailable)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </DetailSection>

            <DetailSection title="About this journey">
              <dl className="grid gap-space-md sm:grid-cols-2">
                <Fact label="Shared by">{j.publisher.displayName}</Fact>
                <Fact label="Vehicle seats">{j.vehicleCapacity}</Fact>
              </dl>
              {j.notes && (
                <p className="mt-space-md rounded-xl bg-surface-container-low p-space-md text-body-md">
                  {j.notes}
                </p>
              )}
            </DetailSection>
          </>
        }
        aside={
          <>
            <div className="rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card">
              <dl className="flex flex-col gap-space-md">
                <Fact label="Seats available">
                  <span className="text-title-md font-title-md">{seatsText(j.seatsAvailable)}</span>
                </Fact>
                <Fact label="Cost-sharing contribution">
                  {j.costSharingCents === null
                    ? 'None requested'
                    : `${formatFare(j.costSharingCents)} per trip`}
                </Fact>
              </dl>
              <div className="mt-space-lg">
                <JoinAction user={user} journey={j} onRequest={() => setRequesting(true)} />
              </div>
            </div>
            <ReportListing user={user} targetType="journey" targetId={j.id} />
          </>
        }
      />
      {user && (
        <JoinRequestDialog
          journey={j}
          occurrences={occurrences}
          open={requesting}
          onClose={() => setRequesting(false)}
        />
      )}
    </>
  )
}

function seatsText(n: number) {
  if (n <= 0) return 'Full'
  return `${n} ${n === 1 ? 'seat' : 'seats'} left`
}

function JourneyStatusChip({ status }: { status: Journey['status'] }) {
  const label: Record<Journey['status'], string> = {
    draft: 'Draft',
    open: 'Open',
    full: 'Full',
    paused: 'Paused',
    cancelled: 'Cancelled',
    completed: 'Completed',
  }
  return (
    <Chip tone={status === 'full' || status === 'paused' ? 'warning' : 'neutral'}>
      {label[status]}
    </Chip>
  )
}

function JoinAction({
  user,
  journey: j,
  onRequest,
}: {
  user: Me | null
  journey: Journey
  onRequest: () => void
}) {
  const api = useApi()
  const requests = useQuery({
    queryKey: ['requests', 'mine'],
    queryFn: () => api.listMyRequests(),
    enabled: !!user,
  })

  if (user && j.publisher.id === user.id) {
    return (
      <div className="flex flex-col gap-space-sm">
        <p className="text-body-md text-on-surface-variant">This is your journey.</p>
        <ButtonLink to="/commuter/journeys" variant="outline" fullWidth>
          Manage journey
        </ButtonLink>
      </div>
    )
  }

  const existing = requests.data?.sent.find(
    (r) => r.journeyId === j.id && (r.status === 'pending' || r.status === 'accepted'),
  )
  if (existing) {
    return (
      <div className="flex flex-col gap-space-sm">
        <p className="flex items-center gap-space-sm text-body-md">
          Your request: <StatusChip status={existing.status} />
        </p>
        <Link to="/requests" className="font-label-lg text-secondary hover:underline">
          View in My requests
        </Link>
      </div>
    )
  }

  if (j.status !== 'open' || j.seatsAvailable <= 0) {
    return (
      <p role="note" className="rounded-xl bg-surface-container p-space-md text-body-md">
        {j.status === 'paused'
          ? 'The driver has paused this journey. Check back later or search for other options.'
          : j.status === 'cancelled' || j.status === 'completed'
            ? 'This journey is no longer running.'
            : 'This journey has no seats available right now.'}
      </p>
    )
  }

  return (
    <ActionGate user={user} action="request to join">
      <Button size="lg" fullWidth onClick={onRequest} disabled={!!user && requests.isPending}>
        <UserPlus aria-hidden className="size-4" />
        Request to join
      </Button>
      <p className="mt-space-sm text-center text-body-sm text-on-surface-variant">
        The driver accepts or declines. Nothing is booked until they accept.
      </p>
    </ActionGate>
  )
}
