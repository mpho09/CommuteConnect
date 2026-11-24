import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Checkbox, Field, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { ApiError, isApiError } from '../../lib/api/errors'
import type { Journey, JourneyOccurrence } from '../../lib/api/types'
import { formatTime } from '../../lib/format'

const MAX = 500

const occurrenceLabel = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Johannesburg',
  weekday: 'long',
  day: 'numeric',
  month: 'short',
})

/**
 * S17 Request to join (US10). The match caveat (BR13) is shown and must be
 * acknowledged before the request can be sent.
 */
export function JoinRequestDialog({
  journey,
  occurrences,
  open,
  onClose,
}: {
  journey: Journey
  /** Upcoming scheduled dates for a recurring journey. */
  occurrences: JourneyOccurrence[]
  open: boolean
  onClose: () => void
}) {
  const api = useApi()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [occurrenceId, setOccurrenceId] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCaveatError, setShowCaveatError] = useState(false)

  const send = useMutation({
    mutationFn: () =>
      api.requestToJoin(journey.id, {
        message: message.trim(),
        occurrenceId: occurrenceId || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['requests', 'mine'] })
      toast.success(
        'Request sent',
        `${journey.publisher.displayName} will accept or decline it. Track it in My requests.`,
      )
      onClose()
    },
    onError: (e) => {
      const err = isApiError(e) ? e : new ApiError('server_error')
      setError(err.fieldErrors.message ?? err.message)
      // The journey may have filled up or changed; show its latest state.
      if (err.code === 'seat_unavailable')
        void queryClient.invalidateQueries({ queryKey: ['journey', journey.id] })
    },
  })

  function submit() {
    if (!understood) {
      setShowCaveatError(true)
      return
    }
    if (message.length > MAX) {
      setError(`Use ${MAX} characters or fewer.`)
      return
    }
    setError(null)
    send.mutate()
  }

  const scheduled = occurrences.filter((o) => o.status === 'scheduled' && o.seatsAvailable > 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!send.isPending}
      title="Request to join this journey"
      description={`${journey.publisher.displayName} will see your first name and initial, and your message.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={send.isPending}>
            Send request
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

        {journey.journeyType === 'recurring' && (
          <Field label="Which trips?" hint="Ask for the regular commute, or one specific date.">
            {(control) => (
              <Select
                {...control}
                value={occurrenceId}
                onChange={(e) => setOccurrenceId(e.target.value)}
              >
                <option value="">The regular commute (all scheduled days)</option>
                {scheduled.map((o) => (
                  <option key={o.id} value={o.id}>
                    Only {occurrenceLabel.format(new Date(o.departureAt))} at{' '}
                    {formatTime(o.departureAt)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <Field label="Message" optional hint={`${message.length}/${MAX} characters`}>
          {(control) => (
            <Textarea
              {...control}
              value={message}
              maxLength={MAX}
              placeholder="e.g. Hi, I work near Midrand Gautrain and travel on weekdays."
              onChange={(e) => setMessage(e.target.value)}
            />
          )}
        </Field>

        <div className="rounded-xl bg-surface-container-low p-space-md">
          <p className="flex items-start gap-space-sm text-body-md text-on-surface">
            <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            <span id="join-caveat">
              <strong>This is a possible match, not a booking or a safety guarantee.</strong> The
              driver decides whether to accept, and the exact pickup point is only shared once they
              do. Meet in a public place.
            </span>
          </p>
          <Checkbox
            className="mt-space-xs"
            label="I understand"
            checked={understood}
            aria-invalid={showCaveatError && !understood ? true : undefined}
            onChange={(e) => {
              setUnderstood(e.target.checked)
              setShowCaveatError(false)
            }}
          />
          {showCaveatError && !understood && (
            <p className="text-body-sm text-error">
              Confirm you understand this isn’t a booking to send your request.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
