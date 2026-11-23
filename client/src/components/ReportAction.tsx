import { Flag } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/Button'
import { Field, Radio, Textarea } from './ui/Field'
import { Modal } from './ui/Modal'
import { REPORT_REASONS, type ReportReason, type ReportSubmission } from './reportReasons'

/**
 * "Report" button + dialog (PRD §8.3, US13). The reporter's identity is not
 * shown to the reported party; the dialog says so.
 */
export function ReportAction({
  subject,
  onSubmit,
}: {
  /** What is being reported, e.g. "this listing" or "Kabelo M." */
  subject: string
  onSubmit: (report: ReportSubmission) => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [showError, setShowError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function close() {
    setOpen(false)
    setReason(null)
    setDetails('')
    setShowError(false)
  }

  async function submit() {
    if (!reason) {
      setShowError(true)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ reason, details: details.trim() })
      close()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Flag aria-hidden className="size-4" />
        Report
      </Button>
      <Modal
        open={open}
        onClose={close}
        title={`Report ${subject}`}
        description="Reports are private. The person or operator you report won’t see who reported them."
        dismissible={!submitting}
        footer={
          <>
            <Button variant="outline" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} loading={submitting}>
              Send report
            </Button>
          </>
        }
      >
        <fieldset aria-describedby={showError && !reason ? 'report-reason-error' : undefined}>
          <legend className="mb-space-xs text-label-lg font-label-lg text-on-surface">
            What’s the problem?
          </legend>
          {REPORT_REASONS.map((r) => (
            <Radio
              key={r.value}
              name="report-reason"
              value={r.value}
              label={r.label}
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
            />
          ))}
          {showError && !reason && (
            <p id="report-reason-error" className="text-body-sm text-error">
              Choose a reason to continue.
            </p>
          )}
        </fieldset>
        <Field label="Anything else we should know?" optional className="mt-space-md">
          {(control) => (
            <Textarea
              {...control}
              value={details}
              maxLength={1000}
              onChange={(e) => setDetails(e.target.value)}
            />
          )}
        </Field>
      </Modal>
    </>
  )
}
