import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { StatusChip } from '../../components/ui/Chip'
import { Field, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { ApiError, isApiError } from '../../lib/api/errors'
import type { Journey, JourneyRequest } from '../../lib/api/types'
import { describeSchedule } from '../../lib/schedule'

const MAX_REASON = 300

/**
 * M1 Cancel Request (BR14). Pending requests cancel directly (reason
 * optional); accepted ones need a reason, which the driver is told.
 */
export function CancelRequestModal({
  request,
  journey,
  open,
  onClose,
}: {
  request: JourneyRequest
  journey?: Journey
  open: boolean
  onClose: () => void
}) {
  const api = useApi()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const accepted = request.status === 'accepted'
  const driver = journey?.publisher.displayName ?? 'The driver'

  const cancel = useMutation({
    mutationFn: () =>
      api.updateRequest(request.id, { action: 'cancel', reason: reason.trim() || undefined }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['requests'] }),
        queryClient.invalidateQueries({ queryKey: ['journey', request.journeyId] }),
      ])
      toast.success('Request cancelled', accepted ? `${driver} has been notified.` : undefined)
      close()
    },
    onError: (e) => {
      const err = isApiError(e) ? e : new ApiError('server_error')
      setError(err.fieldErrors.reason ?? err.message)
    },
  })

  function close() {
    setReason('')
    setError(null)
    onClose()
  }

  function confirm() {
    if (accepted && !reason.trim()) {
      setError(`Tell ${driver} why you’re cancelling.`)
      return
    }
    setError(null)
    cancel.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      role="alertdialog"
      dismissible={!cancel.isPending}
      title="Cancel your request?"
      description={
        accepted
          ? 'You’ve been accepted on this journey. Cancelling gives up your seat.'
          : 'Your request will be withdrawn.'
      }
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={cancel.isPending}>
            Keep request
          </Button>
          <Button variant="destructive" onClick={confirm} loading={cancel.isPending}>
            Cancel request
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-md">
        {journey && (
          <div className="rounded-xl border border-border-default bg-surface p-space-md">
            <div className="flex items-center justify-between gap-space-sm">
              <p className="text-title-md font-title-md">
                {journey.originZone} <span aria-hidden>→</span>
                <span className="sr-only">to</span> {journey.destinationZone}
              </p>
              <StatusChip status={request.status} />
            </div>
            <p className="text-body-md text-on-surface-variant">
              {describeSchedule(journey)} · with {driver}
            </p>
          </div>
        )}
        <p className="flex items-start gap-space-sm rounded-xl border border-accent/40 bg-accent/10 p-space-md text-body-md">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          {accepted
            ? `${driver} will be notified, with your reason, and the seat will be released for other commuters.`
            : `${driver} won’t need to respond, and your request will no longer show on their journey.`}
        </p>
        <Field
          label="Reason"
          required={accepted}
          optional={!accepted}
          hint={
            accepted
              ? `Shared with ${driver}. ${reason.length}/${MAX_REASON}`
              : `${reason.length}/${MAX_REASON}`
          }
          error={error ?? undefined}
        >
          {(c) => (
            <Textarea
              {...c}
              maxLength={MAX_REASON}
              value={reason}
              placeholder="e.g. My shift has changed."
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
      </div>
    </Modal>
  )
}
