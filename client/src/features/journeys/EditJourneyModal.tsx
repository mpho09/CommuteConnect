import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast/toastContext'
import { isApiError } from '../../lib/api/errors'
import type { Journey } from '../../lib/api/types'
import { MAX_NOTES } from './publishSchema'
import { useJourneyActions } from './useJourneyActions'

/**
 * Edit what can change after publishing: seats still on offer and notes.
 * Route and schedule changes mean publishing a new journey, so riders who
 * already joined aren't moved without their say.
 */
export function EditJourneyModal({
  journey,
  open,
  onClose,
}: {
  journey: Journey
  open: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const { updateJourney, errorMessage } = useJourneyActions()
  const [seats, setSeats] = useState(String(journey.seatsAvailable))
  const [notes, setNotes] = useState(journey.notes)
  const [errors, setErrors] = useState<{ seats?: string; notes?: string; form?: string }>({})

  function save() {
    const n = Number(seats)
    const found: typeof errors = {}
    if (!/^\d+$/.test(seats)) found.seats = 'Enter a whole number of seats (0 or more).'
    else if (n > journey.vehicleCapacity)
      found.seats = `Your vehicle has ${journey.vehicleCapacity} passenger seats.`
    if (notes.length > MAX_NOTES) found.notes = `Use ${MAX_NOTES} characters or fewer.`
    setErrors(found)
    if (Object.keys(found).length) return

    updateJourney.mutate(
      { id: journey.id, update: { seatsAvailable: n, notes } },
      {
        onSuccess: () => {
          toast.success('Journey updated')
          onClose()
        },
        onError: (e) =>
          setErrors(
            isApiError(e) && e.fieldErrors.seatsAvailable
              ? { seats: e.fieldErrors.seatsAvailable }
              : { form: errorMessage(e) },
          ),
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!updateJourney.isPending}
      title="Edit journey"
      description="To change the route or schedule, cancel this journey and publish a new one."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={updateJourney.isPending}>
            Cancel
          </Button>
          <Button onClick={save} loading={updateJourney.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-md">
        {errors.form && (
          <p role="alert" className="text-body-md text-error">
            {errors.form}
          </p>
        )}
        <Field
          label="Seats still available"
          hint="Set to 0 to mark the journey as full."
          error={errors.seats}
          required
        >
          {(c) => (
            <Input
              {...c}
              type="number"
              inputMode="numeric"
              min={0}
              max={journey.vehicleCapacity}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          )}
        </Field>
        <Field label="Notes for riders" optional error={errors.notes}>
          {(c) => (
            <Textarea
              {...c}
              maxLength={MAX_NOTES}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Field>
      </div>
    </Modal>
  )
}
