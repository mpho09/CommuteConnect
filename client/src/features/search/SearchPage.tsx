import { Bus, Users } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Card } from '../../components/ui/Card'
import { LoadingList } from '../../components/ui/States'
import { useSession } from '../../lib/session/session'
import { SearchForm } from './SearchForm'
import { parseSearchQuery } from './searchQuery'
import { usePlaceRef } from './usePlaceRef'

/**
 * S6 Search (PRD US4, F2). Opened from "Edit search" with the current
 * criteria in the URL; otherwise prefilled with a signed-in user's usual
 * commute.
 */
export function SearchPage() {
  const [params] = useSearchParams()
  const editing = parseSearchQuery(params)
  const { user, isLoading } = useSession()
  const prefs = editing ? null : user?.preferences
  const origin = usePlaceRef(prefs?.usualOriginId ?? null)
  const destination = usePlaceRef(prefs?.usualDestinationId ?? null)
  const loading = isLoading || origin.isLoading || destination.isLoading

  const initial = editing ?? {
    origin: origin.place ?? undefined,
    destination: destination.place ?? undefined,
    time: prefs?.usualDepartureTime ?? undefined,
  }

  return (
    <div className="mx-auto max-w-5xl px-margin-mobile py-space-xl md:px-margin">
      <header>
        <h1 className="text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
          {editing ? 'Edit your search' : 'Find transport'}
        </h1>
        <p className="mt-space-xs text-body-lg text-on-surface-variant">
          Compare operator services and community shared journeys between two places. Times are in
          SAST.
        </p>
      </header>

      <Card className="mt-space-lg">
        {loading ? (
          // Wait for the prefill so the form starts with the right values.
          <LoadingList count={1} label="Loading search…" />
        ) : (
          <SearchForm showFilters initial={initial} />
        )}
      </Card>

      <ul className="mt-space-lg grid gap-space-md md:grid-cols-2">
        <li className="flex gap-space-sm rounded-xl bg-surface-container-low p-space-md">
          <Bus aria-hidden className="mt-0.5 size-5 shrink-0 text-primary-container" />
          <p className="text-body-md text-on-surface-variant">
            <strong className="text-on-surface">Operator services</strong> are taxis, shuttles,
            buses and coaches with set routes. Each shows whether the operator has been verified.
          </p>
        </li>
        <li className="flex gap-space-sm rounded-xl bg-surface-container-low p-space-md">
          <Users aria-hidden className="mt-0.5 size-5 shrink-0 text-secondary" />
          <p className="text-body-md text-on-surface-variant">
            <strong className="text-on-surface">Shared journeys</strong> are trips other commuters
            offer seats on. They’re possible matches, not bookings: the driver accepts each request.
          </p>
        </li>
      </ul>
    </div>
  )
}
