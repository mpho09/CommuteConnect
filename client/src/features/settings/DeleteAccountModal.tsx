import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArchiveRestore, ArrowRight, LogOut, Trash2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Checkbox, Field, Input } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { isApiError } from '../../lib/api/errors'
import type { Me } from '../../lib/api/types'

const CONFIRM_WORD = 'DELETE'

/**
 * M4 Delete Account (PRD §12.4): step 1 explains what ends and what is kept
 * in anonymised form; step 2 asks for explicit confirmation.
 */
export function DeleteAccountModal({
  user,
  open,
  onClose,
}: {
  user: Me
  open: boolean
  onClose: () => void
}) {
  const api = useApi()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [understood, setUnderstood] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Real counts make the consequences concrete.
  const journeys = useQuery({
    queryKey: ['journeys', 'mine'],
    queryFn: () => api.listMyJourneys(),
    enabled: open,
  })
  const requests = useQuery({
    queryKey: ['requests', 'mine'],
    queryFn: () => api.listMyRequests(),
    enabled: open,
  })
  const openJourneys = (journeys.data ?? []).filter((j) =>
    ['draft', 'open', 'full', 'paused'].includes(j.status),
  ).length
  const openRequests = (requests.data?.sent ?? []).filter(
    (r) => r.status === 'pending' || r.status === 'accepted',
  ).length
  const isOperator = user.roles.includes('operator')

  const remove = useMutation({
    mutationFn: () => api.deleteAccount(),
    onSuccess: async () => {
      await navigate('/', { replace: true })
      // Wipe everything cached for this user.
      await queryClient.resetQueries()
      toast.success('Your account has been deleted', 'Thanks for using CommuteConnect.')
    },
    onError: (e) =>
      setError(isApiError(e) ? e.message : 'Something went wrong. Your account was not deleted.'),
  })

  function close() {
    if (remove.isPending) return
    setStep(1)
    setUnderstood(false)
    setTyped('')
    setError(null)
    onClose()
  }

  const confirmed = understood && typed.trim() === CONFIRM_WORD

  return (
    <Modal
      open={open}
      onClose={close}
      role="alertdialog"
      size="lg"
      dismissible={!remove.isPending}
      title={step === 1 ? 'Delete your account?' : 'Confirm account deletion'}
      description={
        step === 1
          ? 'Read what happens before you continue. This can’t be undone.'
          : 'Step 2 of 2. This permanently deletes your account.'
      }
      footer={
        step === 1 ? (
          <>
            <Button variant="outline" onClick={close}>
              Keep my account
            </Button>
            <Button variant="destructive" onClick={() => setStep(2)}>
              Continue
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={close} disabled={remove.isPending}>
              Keep my account
            </Button>
            <Button
              variant="destructive"
              onClick={() => remove.mutate()}
              disabled={!confirmed}
              loading={remove.isPending}
            >
              <Trash2 aria-hidden className="size-4" />
              Delete my account
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="flex flex-col gap-space-md">
          <section
            aria-labelledby="delete-ends"
            className="rounded-xl border border-error/25 bg-error/5 p-space-md"
          >
            <h3 id="delete-ends" className="text-title-md font-title-md text-error">
              What ends straight away
            </h3>
            <ul className="mt-space-sm flex flex-col gap-space-sm text-body-md">
              <li className="flex gap-space-sm">
                <LogOut aria-hidden className="mt-0.5 size-4 shrink-0 text-error" />
                You’re signed out and can’t sign in again with this email.
              </li>
              <li className="flex gap-space-sm">
                <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-error" />
                <span>
                  {openJourneys === 1
                    ? '1 journey you publish is cancelled'
                    : `${openJourneys} journeys you publish are cancelled`}
                  , and anyone who asked to join is notified.
                </span>
              </li>
              <li className="flex gap-space-sm">
                <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-error" />
                <span>
                  {openRequests === 1
                    ? 'Your 1 open request is cancelled'
                    : `Your ${openRequests} open requests are cancelled`}
                  , and any seat you were given is released.
                </span>
              </li>
              {isOperator && (
                <li className="flex gap-space-sm">
                  <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-error" />
                  Your operator routes are taken off search.
                </li>
              )}
              <li className="flex gap-space-sm">
                <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-error" />
                Your notifications, saved preferences and usual commute are deleted.
              </li>
            </ul>
          </section>

          <section
            aria-labelledby="delete-kept"
            className="rounded-xl bg-surface-container-low p-space-md"
          >
            <h3
              id="delete-kept"
              className="flex items-center gap-space-sm text-title-md font-title-md"
            >
              <ArchiveRestore aria-hidden className="size-4 text-secondary" />
              What we keep, and why
            </h3>
            <p className="mt-space-sm text-body-md">
              Your name, email and phone number are removed. Some records other people depend on are
              kept in anonymised form, shown as “Deleted user”, for as long as the law and safety
              reviews require:
            </p>
            <ul className="mt-space-xs list-disc pl-6 text-body-md">
              <li>past requests and enquiries, so the other person’s history stays complete;</li>
              <li>safety reports you made or that involve you;</li>
              {isOperator && (
                <li>
                  your operator verification history (documents are deleted, unless the law requires
                  us to hold them);
                </li>
              )}
              <li>an audit log entry that the account was deleted.</li>
            </ul>
            <p className="mt-space-sm text-body-sm text-on-surface-variant">
              See the{' '}
              <Link to="/privacy" target="_blank" className="text-secondary underline">
                Privacy Notice
              </Link>{' '}
              for retention periods.
            </p>
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-space-md">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-error/30 bg-error/5 p-space-md text-body-md text-error"
            >
              {error}
            </p>
          )}
          <p className="text-body-md">
            Deleting <strong>{user.email}</strong>.
          </p>
          <Checkbox
            label="I understand my account will be permanently deleted, my open journeys and requests cancelled, and this can’t be undone."
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
          />
          <Field label={`Type ${CONFIRM_WORD} to confirm`}>
            {(c) => (
              <Input
                {...c}
                autoComplete="off"
                spellCheck={false}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            )}
          </Field>
        </div>
      )}
    </Modal>
  )
}
