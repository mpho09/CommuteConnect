import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Field, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { ApiError, isApiError } from '../../lib/api/errors'
import type { OperatorRoute } from '../../lib/api/types'

const MAX = 1000
const enquirySchema = z
  .string()
  .trim()
  .min(1, 'Write your question for the operator.')
  .max(MAX, `Use ${MAX} characters or fewer.`)

/** S17 Enquiry (US11): a question to an operator about a route. */
export function EnquiryDialog({
  route,
  open,
  onClose,
}: {
  route: OperatorRoute
  open: boolean
  onClose: () => void
}) {
  const api = useApi()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: (text: string) => api.sendEnquiry(route.id, text),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['enquiries', 'mine'] })
      toast.success('Enquiry sent', `${route.operator.businessName} will reply in My requests.`)
      setMessage('')
      onClose()
    },
    onError: (e) => {
      const err = isApiError(e) ? e : new ApiError('server_error')
      setError(err.fieldErrors.message ?? err.message)
    },
  })

  function submit() {
    const parsed = enquirySchema.safeParse(message)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError(null)
    send.mutate(parsed.data)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!send.isPending}
      title={`Send an enquiry to ${route.operator.businessName}`}
      description="Ask about times, fares or pickup points. Don’t share your ID number or bank details."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={send.isPending}>
            Send enquiry
          </Button>
        </>
      }
    >
      <Field
        label="Your question"
        hint={`${message.length}/${MAX} characters`}
        error={error ?? undefined}
        required
      >
        {(control) => (
          <Textarea
            {...control}
            value={message}
            maxLength={MAX}
            placeholder="e.g. Is there a pickup near the Tembisa Plaza entrance before 06:30?"
            onChange={(e) => setMessage(e.target.value)}
          />
        )}
      </Field>
    </Modal>
  )
}
