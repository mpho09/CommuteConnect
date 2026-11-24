import { useQuery } from '@tanstack/react-query'
import { Bus, MessageSquare, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Chip, VerificationChip } from '../../components/ui/Chip'
import { ErrorState, LoadingList } from '../../components/ui/States'
import { useApi } from '../../lib/api/apiContext'
import { isApiError } from '../../lib/api/errors'
import type { OperatorRoute } from '../../lib/api/types'
import { describeFare, formatDate, TRANSPORT_LABELS } from '../../lib/format'
import { useSession } from '../../lib/session/session'
import { EnquiryDialog } from './EnquiryDialog'
import {
  ActionGate,
  DetailSection,
  Fact,
  ListingGrid,
  ListingPage,
  NotFound,
  ReportListing,
} from './ListingParts'

/** S8 Listing Details for an operator route (US8, US11). */
export function RouteListingPage() {
  const { routeId = '' } = useParams()
  const api = useApi()
  const route = useQuery({ queryKey: ['route', routeId], queryFn: () => api.getRoute(routeId) })

  return (
    <ListingPage>
      {route.isPending ? (
        <LoadingList count={2} label="Loading listing…" />
      ) : route.isError ? (
        isApiError(route.error) && route.error.code === 'not_found' ? (
          <NotFound />
        ) : (
          <ErrorState onRetry={() => void route.refetch()} />
        )
      ) : (
        <RouteDetails route={route.data} />
      )}
    </ListingPage>
  )
}

function RouteDetails({ route: r }: { route: OperatorRoute }) {
  const { user } = useSession()
  const [enquiring, setEnquiring] = useState(false)
  const verified = r.operator.verificationStatus === 'verified'
  const stops = [
    { label: r.origin.label, area: r.origin.area, time: null as string | null, kind: 'Start' },
    ...r.stops.map((s) => ({
      label: s.place.label,
      area: s.place.area,
      time: s.estimatedTime,
      kind: 'Stop',
    })),
    { label: r.destination.label, area: r.destination.area, time: null, kind: 'End' },
  ]

  return (
    <>
      <ListingGrid
        main={
          <>
            <header className="rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card md:p-space-lg">
              <div className="flex flex-wrap items-center gap-space-sm">
                <Chip tone="primary" icon={Bus}>
                  {TRANSPORT_LABELS[r.transportType]}
                </Chip>
                <VerificationChip status={r.operator.verificationStatus} />
              </div>
              <h1 className="mt-space-sm text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
                {r.routeName}
              </h1>
              <p className="mt-space-xs text-body-lg text-on-surface-variant">
                {r.origin.label} <span aria-hidden>→</span>
                <span className="sr-only">to</span> {r.destination.label}
              </p>
              {r.needsConfirmation && (
                <p
                  role="note"
                  className="mt-space-md flex items-start gap-space-sm rounded-xl border border-accent/40 bg-accent/10 p-space-md text-body-md"
                >
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                  This information may be out of date. Confirm details with the provider.
                </p>
              )}
            </header>

            <DetailSection title="Route and stops">
              <ol className="flex flex-col">
                {stops.map((s, i) => (
                  <li
                    key={`${s.label}-${i}`}
                    className="relative flex gap-space-md pb-space-md last:pb-0"
                  >
                    {i < stops.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute top-6 left-[11px] h-full w-0.5 bg-border-strong"
                      />
                    )}
                    <span
                      aria-hidden
                      className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-container text-label-sm text-on-primary"
                    >
                      {i + 1}
                    </span>
                    <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-space-md">
                      <div>
                        <p className="text-title-md font-title-md">
                          <span className="sr-only">{s.kind}: </span>
                          {s.label}
                        </p>
                        <p className="text-body-sm text-on-surface-variant">{s.area}</p>
                      </div>
                      {s.time && (
                        <p className="text-body-md text-on-surface-variant">About {s.time}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </DetailSection>

            <DetailSection title="Schedule">
              <p className="text-body-lg">{r.scheduleDescription}</p>
              <p className="mt-space-xs text-body-sm text-on-surface-variant">
                Times are in SAST and set by the operator.
              </p>
            </DetailSection>

            <DetailSection title="Operator">
              <dl className="grid gap-space-md sm:grid-cols-2">
                <Fact label="Business">{r.operator.businessName}</Fact>
                <Fact label="Verification">
                  <VerificationChip status={r.operator.verificationStatus} />
                </Fact>
              </dl>
              <p className="mt-space-md text-body-md text-on-surface-variant">
                {verified
                  ? 'An admin has checked this operator’s documents.'
                  : 'This operator hasn’t been verified yet. Confirm details before you travel.'}{' '}
                Contact details are shared through enquiries, not listed publicly.
              </p>
            </DetailSection>
          </>
        }
        aside={
          <>
            <div className="rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card">
              <dl className="flex flex-col gap-space-md">
                <Fact label="Fare">
                  <span className="text-currency-fare font-currency-fare">{describeFare(r)}</span>
                </Fact>
                <Fact label="Last updated">{formatDate(r.lastConfirmedAt)}</Fact>
              </dl>
              <div className="mt-space-lg">
                <ActionGate user={user} action="send an enquiry">
                  <Button size="lg" fullWidth onClick={() => setEnquiring(true)}>
                    <MessageSquare aria-hidden className="size-4" />
                    Send enquiry
                  </Button>
                  <p className="mt-space-sm text-center text-body-sm text-on-surface-variant">
                    Ask about times, fares or pickup points. This doesn’t reserve a seat.
                  </p>
                </ActionGate>
              </div>
            </div>
            <ReportListing user={user} targetType="route" targetId={r.id} />
          </>
        }
      />
      {user && <EnquiryDialog route={r} open={enquiring} onClose={() => setEnquiring(false)} />}
    </>
  )
}
