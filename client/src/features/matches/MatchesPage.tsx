import { useQuery } from '@tanstack/react-query'
import { Info, Plus, Search, Settings2, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { JourneyCard } from '../../components/JourneyCard'
import { ButtonLink } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingList } from '../../components/ui/States'
import { useApi } from '../../lib/api/apiContext'
import type { Me } from '../../lib/api/types'
import { journeyListingPath } from '../../lib/paths'
import { describeSchedule } from '../../lib/schedule'
import { useSession } from '../../lib/session/session'
import { describeDays } from '../../lib/time'
import { usePlaceRef } from '../search/usePlaceRef'

const MIN_SEATS = [1, 2, 3]

/**
 * S12 Match Suggestions (PRD US7, F4). Suggestions come from the user's usual
 * commute. They're labelled "Possible match" with plain reasons; scores are
 * used for ordering only and never shown (BR13).
 */
export function MatchesPage() {
  const { user } = useSession()
  if (!user) return null
  return (
    <div className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin">
      <header>
        <h1 className="text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
          Possible matches
        </h1>
        <p className="mt-space-xs text-body-lg text-on-surface-variant">
          Shared journeys that may suit your usual commute.
        </p>
      </header>

      <p
        role="note"
        className="mt-space-md flex items-start gap-space-sm rounded-xl border border-secondary/25 bg-secondary/5 p-space-md text-body-md"
      >
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-secondary" />
        <span>
          <strong>A match is a suggestion, not a booking or a safety guarantee.</strong> Open a
          journey to check the details and send a request; the driver decides whether to accept.
        </span>
      </p>

      {user.preferences.usualOriginId && user.preferences.usualDestinationId ? (
        <Matches user={user} />
      ) : (
        <EmptyState
          className="mt-space-lg"
          icon={Settings2}
          title="Add your usual commute"
          description="Tell us where and when you usually travel, and we’ll suggest shared journeys going your way."
          action={<ButtonLink to="/setup">Set your usual commute</ButtonLink>}
        />
      )}
    </div>
  )
}

function Matches({ user }: { user: Me }) {
  const api = useApi()
  const [params, setParams] = useSearchParams()
  const minSeats = MIN_SEATS.includes(Number(params.get('seats'))) ? Number(params.get('seats')) : 1
  const prefs = user.preferences
  const origin = usePlaceRef(prefs.usualOriginId)
  const destination = usePlaceRef(prefs.usualDestinationId)

  // Keyed on preferences so changing the usual commute refetches.
  const matches = useQuery({ queryKey: ['matches', prefs], queryFn: () => api.listMatches() })
  const requests = useQuery({ queryKey: ['requests', 'mine'], queryFn: () => api.listMyRequests() })

  const shown = (matches.data ?? []).filter((m) => m.journey.seatsAvailable >= minSeats)
  const statusFor = (journeyId: string) =>
    requests.data?.sent.find(
      (r) => r.journeyId === journeyId && (r.status === 'pending' || r.status === 'accepted'),
    )?.status

  const basis = [
    origin.place && destination.place
      ? `${origin.place.label} to ${destination.place.label}`
      : null,
    prefs.usualDepartureTime ? `around ${prefs.usualDepartureTime}` : 'any time',
    prefs.travelDays.length ? describeDays(prefs.travelDays) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <div className="mt-space-lg flex flex-wrap items-end justify-between gap-space-md rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card">
        <div>
          <p className="text-body-sm text-on-surface-variant">Based on your usual commute</p>
          <p className="text-title-md font-title-md">{basis}</p>
          <Link to="/setup" className="text-body-md font-label-lg text-secondary hover:underline">
            Change usual commute
          </Link>
        </div>
        <label className="flex flex-col gap-space-xs">
          <span className="font-label-lg text-label-lg">Seats needed</span>
          <Select
            value={minSeats}
            onChange={(e) => {
              const n = Number(e.target.value)
              setParams(n > 1 ? { seats: String(n) } : {}, { replace: true })
            }}
            className="w-40"
          >
            {MIN_SEATS.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'Any (1+)' : `${n} or more`}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="mt-space-lg">
        {matches.isPending ? (
          <LoadingList count={3} label="Finding possible matches…" />
        ) : matches.isError ? (
          <ErrorState
            description="We couldn’t load your matches. Check your connection and try again."
            onRetry={() => void matches.refetch()}
          />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No possible matches yet"
            description={
              (matches.data?.length ?? 0) > 0
                ? 'None of the matches have that many seats. Try needing fewer seats.'
                : 'No one is offering seats on a similar journey right now. Search all transport options, or publish your own journey so others can join you.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-space-sm">
                <ButtonLink to="/search">
                  <Search aria-hidden className="size-4" />
                  Search transport
                </ButtonLink>
                <ButtonLink to="/commuter/journeys/new" variant="outline">
                  <Plus aria-hidden className="size-4" />
                  Publish a journey
                </ButtonLink>
              </div>
            }
          />
        ) : (
          <>
            <p role="status" className="mb-space-md text-body-md text-on-surface-variant">
              {shown.length} possible {shown.length === 1 ? 'match' : 'matches'}, closest first
            </p>
            <ul className="grid gap-space-md md:grid-cols-2 lg:grid-cols-3">
              {shown.map(({ journey: j, reasons }) => (
                <li key={j.id}>
                  <JourneyCard
                    href={journeyListingPath(j.id)}
                    publisherName={j.publisher.displayName}
                    originZone={j.originZone}
                    destinationZone={j.destinationZone}
                    scheduleSummary={describeSchedule(j)}
                    seatsAvailable={j.seatsAvailable}
                    matchReasons={reasons}
                    requestStatus={statusFor(j.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}
