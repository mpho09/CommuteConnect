import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarX2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chip, StatusChip } from '../../components/ui/Chip'
import { Field, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, LoadingList } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import type { Journey, JourneyOccurrence, JourneyRequest } from '../../lib/api/types'
import { describeSchedule, formatTrip } from '../../lib/schedule'
import { useJourneyActions } from './useJourneyActions'

const OCC_STATUS: Record<JourneyOccurrence['status'], string> = {
  scheduled: 'Scheduled',
  cancelled: 'Skipped',
  completed: 'Completed',
}

/** S11 Journey Occurrence: one date of a recurring journey (US6, BR5). */
export function OccurrencePage() {
  const { journeyId = '', occurrenceId = '' } = useParams()
  const api = useApi()
  const journey = useQuery({
    queryKey: ['journey', journeyId],
    queryFn: () => api.getJourney(journeyId),
  })
  const occurrences = useQuery({
    queryKey: ['journey', journeyId, 'occurrences'],
    queryFn: () => api.listJourneyOccurrences(journeyId),
  })
  const requests = useQuery({ queryKey: ['requests', 'mine'], queryFn: () => api.listMyRequests() })

  const occurrence = occurrences.data?.find((o) => o.id === occurrenceId)
  const loading = journey.isPending || occurrences.isPending || requests.isPending
  const failed = journey.isError || occurrences.isError || requests.isError

  return (
    <div className="mx-auto max-w-3xl px-margin-mobile py-space-xl md:px-margin">
      <Link
        to="/commuter/journeys"
        className="mb-space-md inline-flex min-h-11 items-center gap-space-xs font-label-lg text-secondary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        My journeys
      </Link>
      {loading ? (
        <LoadingList count={2} label="Loading trip…" />
      ) : failed ? (
        <ErrorState
          onRetry={() => {
            void journey.refetch()
            void occurrences.refetch()
            void requests.refetch()
          }}
        />
      ) : !occurrence || !journey.data ? (
        <EmptyState
          title="Trip not found"
          description="It may belong to a journey that has ended."
        />
      ) : (
        <Details
          journey={journey.data}
          occurrence={occurrence}
          requests={(requests.data?.received ?? []).filter(
            (r) =>
              r.journeyId === journeyId &&
              (r.occurrenceId === null || r.occurrenceId === occurrenceId) &&
              (r.status === 'accepted' || r.status === 'pending'),
          )}
        />
      )}
    </div>
  )
}

function Details({
  journey: j,
  occurrence: o,
  requests,
}: {
  journey: Journey
  occurrence: JourneyOccurrence
  requests: JourneyRequest[]
}) {
  const toast = useToast()
  const { cancelOccurrence, errorMessage } = useJourneyActions()
  const [skipping, setSkipping] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => new Date().toISOString())
  const canSkip = o.status === 'scheduled' && o.departureAt > now
  const accepted = requests.filter((r) => r.status === 'accepted')

  function skip() {
    setError(null)
    cancelOccurrence.mutate(
      { id: o.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Trip skipped', 'Your other scheduled trips stay active.')
          setSkipping(false)
        },
        onError: (e) => setError(errorMessage(e)),
      },
    )
  }

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-space-sm">
          <Chip tone={o.status === 'scheduled' ? 'success' : 'neutral'}>
            {OCC_STATUS[o.status]}
          </Chip>
        </div>
        <h1 className="mt-space-sm text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
          {formatTrip(o.departureAt)}
        </h1>
        <p className="mt-space-xs text-body-lg text-on-surface-variant">
          {j.originZone} → {j.destinationZone} · part of “{describeSchedule(j)}”
        </p>
        <p className="mt-space-md text-body-md">
          {o.seatsAvailable > 0
            ? `${o.seatsAvailable} ${o.seatsAvailable === 1 ? 'seat' : 'seats'} available on this trip`
            : 'No seats available on this trip'}
        </p>

        <h2 className="mt-space-lg text-title-md font-title-md">Riders on this trip</h2>
        {requests.length === 0 ? (
          <p className="mt-space-xs text-body-md text-on-surface-variant">No riders yet.</p>
        ) : (
          <ul className="mt-space-sm flex flex-col divide-y divide-border-default">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-space-sm py-space-sm">
                <span>
                  {r.commuter.displayName}
                  <span className="block text-body-sm text-on-surface-variant">
                    {r.occurrenceId ? 'This date only' : 'Regular rider'}
                  </span>
                </span>
                <StatusChip status={r.status} />
              </li>
            ))}
          </ul>
        )}

        {canSkip && (
          <div className="mt-space-lg border-t border-border-default pt-space-lg">
            <Button variant="outline" onClick={() => setSkipping(true)}>
              <CalendarX2 aria-hidden className="size-4" />
              Skip this trip
            </Button>
            <p className="mt-space-xs text-body-sm text-on-surface-variant">
              Only this date is cancelled. Your other scheduled trips stay active.
            </p>
          </div>
        )}
      </Card>

      <Modal
        open={skipping}
        onClose={() => setSkipping(false)}
        role="alertdialog"
        dismissible={!cancelOccurrence.isPending}
        title={`Skip ${formatTrip(o.departureAt)}?`}
        description={
          accepted.length
            ? `${accepted.length === 1 ? '1 rider' : `${accepted.length} riders`} will be notified. Other dates aren’t affected.`
            : 'No riders are affected. Other dates aren’t affected.'
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setSkipping(false)}
              disabled={cancelOccurrence.isPending}
            >
              Keep trip
            </Button>
            <Button variant="destructive" onClick={skip} loading={cancelOccurrence.isPending}>
              Skip trip
            </Button>
          </>
        }
      >
        {error && (
          <p role="alert" className="mb-space-md text-body-md text-error">
            {error}
          </p>
        )}
        <Field label="Reason" optional hint="Shared with riders on this trip.">
          {(c) => (
            <Textarea
              {...c}
              maxLength={300}
              value={reason}
              placeholder="e.g. I’m working from home that day."
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
      </Modal>
    </>
  )
}
