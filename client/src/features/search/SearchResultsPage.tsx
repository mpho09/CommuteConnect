import { useQuery } from '@tanstack/react-query'
import {
  Bookmark,
  BookmarkCheck,
  Bus,
  Info,
  Pencil,
  SearchX,
  SlidersHorizontal,
  Users,
  WifiOff,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { JourneyCard } from '../../components/JourneyCard'
import { TransportResultCard } from '../../components/TransportResultCard'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Checkbox, Field, Select } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingList } from '../../components/ui/States'
import { useApi } from '../../lib/api/apiContext'
import { isApiError } from '../../lib/api/errors'
import { TRANSPORT_LABELS } from '../../lib/format'
import { journeyListingPath, routeListingPath } from '../../lib/paths'
import { describeSchedule } from '../../lib/schedule'
import { useSession } from '../../lib/session/session'
import { applyView } from './applyView'
import { useSavedSearches } from './savedSearches'
import {
  DEFAULT_WINDOW,
  parseResultsView,
  parseSearchQuery,
  toSearchParams,
  toSearchUrl,
  TYPE_FILTERS,
  typeLabel,
  WINDOWS,
  type ResultsView,
  type SearchQuery,
  type SortOrder,
  type TypeFilter,
} from './searchQuery'

const SORTS: Array<{ value: SortOrder; label: string }> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'earliest', label: 'Earliest departure' },
  { value: 'fare', label: 'Lowest fare' },
]

const dateLabel = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/** "Tue 1 Dec · around 07:00 (± 1 hour) · Once-off trip" */
function describeQuery(q: SearchQuery): string {
  const parts: string[] = []
  if (q.date) parts.push(dateLabel.format(new Date(`${q.date}T00:00:00Z`)))
  if (q.time) {
    const w = q.window ?? DEFAULT_WINDOW
    parts.push(`around ${q.time} (± ${w < 60 ? `${w} min` : `${w / 60} h`})`)
  } else parts.push('any time')
  parts.push(q.frequency === 'recurring' ? 'Recurring commute' : 'Once-off trip')
  return parts.join(' · ')
}

/** S7 Search Results (PRD US4, §8.2): operator services and shared journeys, kept separate. */
export function SearchResultsPage() {
  const [params] = useSearchParams()
  const query = parseSearchQuery(params)
  if (!query) {
    return (
      <Page>
        <EmptyState
          title="Start a search"
          description="Choose where you’re travelling from and to, and we’ll show the options."
          action={<ButtonLink to="/search">Find transport</ButtonLink>}
        />
      </Page>
    )
  }
  return <Results query={query} view={parseResultsView(params)} />
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin">{children}</div>
  )
}

function Results({ query, view }: { query: SearchQuery; view: ResultsView }) {
  const api = useApi()
  const navigate = useNavigate()
  const apiParams = toSearchParams(query)
  const search = useQuery({
    queryKey: ['search', apiParams],
    queryFn: () => api.search(apiParams),
  })

  /** Filters live in the URL so results can be shared and survive reloads. */
  function update(q: Partial<SearchQuery>, v: Partial<ResultsView> = {}) {
    void navigate(toSearchUrl({ ...query, ...q }, { ...view, ...v }), { replace: true })
  }

  const filtered = search.data ? applyView(search.data, query, view) : null
  const showRoutes = query.type !== 'shared'
  const showJourneys = query.type === undefined || query.type === 'shared'
  const total = filtered ? filtered.routes.length + filtered.journeys.length : 0
  const hasFilters = !!query.type || view.verifiedOnly

  return (
    <Page>
      <SummaryBar query={query} view={view} />

      <section
        aria-label="Filters"
        className="mt-space-lg grid gap-space-md rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_1fr] lg:items-end"
      >
        <Field label="Transport type">
          {(control) => (
            <Select
              {...control}
              value={query.type ?? ''}
              onChange={(e) => update({ type: (e.target.value || undefined) as TypeFilter })}
            >
              <option value="">All options</option>
              {TYPE_FILTERS.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Departure window" hint={query.time ? undefined : 'Add a time to narrow.'}>
          {(control) => (
            <Select
              {...control}
              value={query.window ?? DEFAULT_WINDOW}
              disabled={!query.time}
              onChange={(e) => update({ window: Number(e.target.value) })}
            >
              {WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {w < 60 ? `± ${w} min` : `± ${w / 60} hour${w > 60 ? 's' : ''}`}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Checkbox
          label="Verified operators only"
          checked={view.verifiedOnly}
          onChange={(e) => update({}, { verifiedOnly: e.target.checked })}
        />
        <Field label="Sort by">
          {(control) => (
            <Select
              {...control}
              value={view.sort}
              onChange={(e) => update({}, { sort: e.target.value as SortOrder })}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </section>

      <div className="mt-space-lg">
        {search.isPending ? (
          <LoadingList count={3} label="Searching for transport…" />
        ) : search.isError ? (
          <SearchError error={search.error} query={query} view={view} onRetry={search.refetch} />
        ) : total === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No options found for these details."
            description="Try a wider departure window, a nearby pickup area or destination, or fewer filters."
            action={
              <div className="flex flex-wrap justify-center gap-space-sm">
                {query.time && (query.window ?? DEFAULT_WINDOW) < 120 && (
                  <Button variant="outline" onClick={() => update({ window: 120 })}>
                    Widen to ± 2 hours
                  </Button>
                )}
                {hasFilters && (
                  <Button
                    variant="outline"
                    onClick={() => update({ type: undefined }, { verifiedOnly: false })}
                  >
                    Clear filters
                  </Button>
                )}
                <ButtonLink to={toSearchUrl(query, view, '/search')}>
                  <Pencil aria-hidden className="size-4" />
                  Edit search
                </ButtonLink>
              </div>
            }
          />
        ) : (
          filtered && (
            <>
              <p role="status" className="mb-space-md text-body-md text-on-surface-variant">
                {[
                  showRoutes && plural(filtered.routes.length, 'operator service'),
                  showJourneys && plural(filtered.journeys.length, 'shared journey'),
                ]
                  .filter(Boolean)
                  .join(' and ')}{' '}
                found
              </p>
              <div className="grid gap-space-xl lg:grid-cols-2">
                {showRoutes && (
                  <ResultSection
                    title="Operator services"
                    icon={Bus}
                    intro="Taxis, shuttles, buses and coaches with set routes. Check each operator’s verification status."
                    empty="No operator services match. Try clearing filters."
                  >
                    {filtered.routes.map((r) => (
                      <li key={r.id}>
                        <TransportResultCard
                          href={routeListingPath(r.id)}
                          operatorName={r.operator.businessName}
                          verification={r.operator.verificationStatus}
                          transportType={TRANSPORT_LABELS[r.transportType]}
                          originLabel={r.origin.label}
                          destinationLabel={r.destination.label}
                          scheduleSummary={r.scheduleDescription}
                          fareCents={r.fareCents}
                          updatedAt={r.lastConfirmedAt}
                          needsConfirmation={r.needsConfirmation}
                        />
                      </li>
                    ))}
                  </ResultSection>
                )}
                {showJourneys && (
                  <ResultSection
                    title="Community shared journeys"
                    icon={Users}
                    intro="Possible matches offered by other commuters, not confirmed bookings. The driver accepts each request. Pickup areas are approximate."
                    empty="No shared journeys match these details."
                  >
                    {filtered.journeys.map((j) => (
                      <li key={j.id}>
                        <JourneyCard
                          href={journeyListingPath(j.id)}
                          publisherName={j.publisher.displayName}
                          originZone={j.originZone}
                          destinationZone={j.destinationZone}
                          scheduleSummary={describeSchedule(j)}
                          seatsAvailable={j.seatsAvailable}
                        />
                      </li>
                    ))}
                  </ResultSection>
                )}
              </div>
            </>
          )
        )}
      </div>
    </Page>
  )
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function SummaryBar({ query, view }: { query: SearchQuery; view: ResultsView }) {
  const { user } = useSession()
  return (
    <header className="flex flex-wrap items-start justify-between gap-space-md">
      <div className="min-w-0">
        <p className="text-label-md font-label-md uppercase tracking-wider text-secondary">
          Search results
        </p>
        <h1 className="mt-space-xs text-headline-lg font-headline-lg md:text-headline-xl md:font-headline-xl">
          {query.origin.label} <span aria-hidden>→</span>
          <span className="sr-only">to</span> {query.destination.label}
        </h1>
        <p className="mt-space-xs text-body-lg text-on-surface-variant">{describeQuery(query)}</p>
      </div>
      <div className="flex flex-wrap gap-space-sm">
        <ButtonLink to={toSearchUrl(query, view, '/search')} variant="outline">
          <SlidersHorizontal aria-hidden className="size-4" />
          Edit search
        </ButtonLink>
        {user ? (
          <SaveSearchButton userId={user.id} query={query} />
        ) : (
          <ButtonLink
            to={`/login?next=${encodeURIComponent(toSearchUrl(query, view))}`}
            variant="ghost"
          >
            <Bookmark aria-hidden className="size-4" />
            Log in to save
          </ButtonLink>
        )}
      </div>
    </header>
  )
}

function SaveSearchButton({ userId, query }: { userId: string; query: SearchQuery }) {
  const { save, isSaved } = useSavedSearches(userId)
  const saved = isSaved(query)
  return (
    <Button variant="ghost" onClick={() => save(query)} disabled={saved} aria-live="polite">
      {saved ? (
        <>
          <BookmarkCheck aria-hidden className="size-4" />
          Saved
        </>
      ) : (
        <>
          <Bookmark aria-hidden className="size-4" />
          Save this search
        </>
      )}
    </Button>
  )
}

function ResultSection({
  title,
  icon: Icon,
  intro,
  empty,
  children,
}: {
  title: string
  icon: typeof Bus
  intro: string
  empty: string
  children: ReactNode[]
}) {
  const id = `results-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="flex items-center gap-space-sm text-headline-sm font-headline-sm">
        <Icon aria-hidden className="size-5 text-secondary" />
        {title}
        <span className="text-body-md text-on-surface-variant">({children.length})</span>
      </h2>
      <p className="mt-space-xs flex items-start gap-space-xs text-body-md text-on-surface-variant">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        {intro}
      </p>
      {children.length === 0 ? (
        <p className="mt-space-md rounded-xl border border-dashed border-border-strong p-space-md text-body-md text-on-surface-variant">
          {empty}
        </p>
      ) : (
        <ul className="mt-space-md flex flex-col gap-space-md">{children}</ul>
      )}
    </section>
  )
}

function SearchError({
  error,
  query,
  view,
  onRetry,
}: {
  error: unknown
  query: SearchQuery
  view: ResultsView
  onRetry: () => void
}) {
  // Bad criteria (e.g. a past date, BR4) can't be fixed by retrying.
  if (isApiError(error) && error.code === 'validation') {
    const detail = Object.values(error.fieldErrors)[0] ?? error.message
    return (
      <EmptyState
        icon={SearchX}
        title="These search details need changing"
        description={detail}
        action={
          <ButtonLink to={toSearchUrl(query, view, '/search')}>
            <Pencil aria-hidden className="size-4" />
            Edit search
          </ButtonLink>
        }
      />
    )
  }
  if (isApiError(error) && error.code === 'not_found') {
    return (
      <EmptyState
        icon={SearchX}
        title="We couldn’t find one of those places"
        description="Choose your pickup area and destination from the list again."
        action={<ButtonLink to="/search">New search</ButtonLink>}
      />
    )
  }
  const offline = isApiError(error) && error.code === 'offline'
  return (
    <ErrorState
      title={offline ? 'You’re offline' : 'Something went wrong'}
      description={
        <>
          {offline && <WifiOff aria-hidden className="mr-space-xs inline size-4" />}
          {isApiError(error) ? error.message : 'Something went wrong. Try again.'}{' '}
          <Link to="/search" className="underline underline-offset-2">
            Start a new search
          </Link>
        </>
      }
      onRetry={onRetry}
    />
  )
}
