import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { StatusChip } from '../../components/ui/Chip'
import { Field, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast/toastContext'
import type { Journey, JourneyRequest } from '../../lib/api/types'
import { describeSchedule } from '../../lib/schedule'
import { useJourneyActions } from './useJourneyActions'

const MAX_REASON = 300

/**
 * M2 Cancel Journey: confirms, takes an optional reason, and lists the riders
 * who will be notified (their pending and accepted requests are cancelled).
 */
export function CancelJourneyModal({
  journey,
  requests,
  open,
  onClose,
}: {
  journey: Journey
  /** Requests received for this journey. */
  requests: JourneyRequest[]
  open: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const { updateJourney, errorMessage } = useJourneyActions()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const affected = requests.filter((r) => r.status === 'pending' || r.status === 'accepted')

  function close() {
    setReason('')
    setError(null)
    onClose()
  }

  function confirm() {
    setError(null)
    updateJourney.mutate(
      {
        id: journey.id,
        update: { status: 'cancelled', cancelReason: reason.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success(
            'Journey cancelled',
            affected.length ? 'Affected riders have been notified.' : undefined,
          )
          close()
        },
        onError: (e) => setError(errorMessage(e)),
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={close}
      role="alertdialog"
      dismissible={!updateJourney.isPending}
      title="Cancel this journey?"
      description="The listing closes for good and can’t be reopened. You can publish a new journey later."
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={updateJourney.isPending}>
            Keep journey
          </Button>
          <Button variant="destructive" onClick={confirm} loading={updateJourney.isPending}>
            Cancel journey
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-md">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-error/30 bg-error/5 p-space-md text-body-md text-error"
          >
            {error}
          </p>
        )}
        <div className="rounded-xl border border-border-default bg-surface p-space-md">
          <p className="text-title-md font-title-md">
            {journey.originZone} <span aria-hidden>→</span>
            <span className="sr-only">to</span> {journey.destinationZone}
          </p>
          <p className="text-body-md text-on-surface-variant">{describeSchedule(journey)}</p>
        </div>

        {affected.length > 0 ? (
          <div className="rounded-xl border border-accent/40 bg-accent/10 p-space-md">
            <p className="flex items-start gap-space-sm text-body-md font-label-lg">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
              {affected.length === 1
                ? '1 rider will be notified'
                : `${affected.length} riders will be notified`}{' '}
              and their requests cancelled.
            </p>
            <ul className="mt-space-sm flex flex-col gap-space-xs">
              {affected.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-space-sm text-body-md"
                >
                  {r.commuter.displayName}
                  <StatusChip status={r.status} />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-body-md text-on-surface-variant">
            No one has requested to join yet, so no riders are affected.
          </p>
        )}

        <Field
          label="Reason"
          optional
          hint={
            affected.length
              ? `Shared with the riders above. ${reason.length}/${MAX_REASON}`
              : `${reason.length}/${MAX_REASON}`
          }
        >
          {(control) => (
            <Textarea
              {...control}
              value={reason}
              maxLength={MAX_REASON}
              placeholder="e.g. My work schedule has changed."
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
      </div>
    </Modal>
  )
}
