import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CircleAlert, FileText, Lock, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chip, VerificationChip } from '../../components/ui/Chip'
import { ErrorState, LoadingList } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { isApiError } from '../../lib/api/errors'
import type { DocumentType, Operator, OperatorDocument } from '../../lib/api/types'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { ACCEPTED_TYPES, checkFile, DOCUMENTS } from './documents'

/** S16 Verification Submission (PRD US9, BR9): upload documents and track status. */
export function VerificationPage() {
  const api = useApi()
  const operator = useQuery({ queryKey: ['operator', 'mine'], queryFn: () => api.getMyOperator() })

  if (operator.isPending)
    return (
      <Shell>
        <LoadingList count={2} label="Loading your application…" />
      </Shell>
    )
  if (operator.isError)
    return (
      <Shell>
        <ErrorState onRetry={() => void operator.refetch()} />
      </Shell>
    )
  if (!operator.data) return <Navigate to="/operator/setup" replace />
  return (
    <Shell>
      <Verification operator={operator.data} />
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-margin-mobile py-space-xl md:px-margin">{children}</div>
  )
}

function Verification({ operator: op }: { operator: Operator }) {
  const byType = new Map(op.documents.map((d) => [d.documentType, d]))
  const required = DOCUMENTS.filter((d) => d.required)
  const uploaded = required.filter((d) => byType.has(d.type)).length
  const allRequired = uploaded === required.length
  const locked = op.verificationStatus === 'under_review' || op.verificationStatus === 'verified'

  return (
    <>
      <header className="mb-space-lg">
        <p className="text-label-md font-label-md uppercase tracking-wider text-secondary">
          Step 2 of 2 · Verification
        </p>
        <h1 className="mt-space-xs text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
          {op.businessName}
        </h1>
        <div className="mt-space-sm flex flex-wrap items-center gap-space-sm">
          <VerificationChip status={op.verificationStatus} />
          {op.verifiedAt && (
            <span className="text-body-md text-on-surface-variant">
              Verified on {formatDate(op.verifiedAt)}
            </span>
          )}
        </div>
      </header>

      <StatusTracker operator={op} allRequired={allRequired} />

      <section aria-labelledby="docs-heading" className="mt-space-xl">
        <div className="flex flex-wrap items-end justify-between gap-space-sm">
          <div>
            <h2 id="docs-heading" className="text-headline-sm font-headline-sm">
              Documents
            </h2>
            <p className="mt-space-xs text-body-md text-on-surface-variant">
              PDF, JPG or PNG, up to 5 MB each. Only admins reviewing your application can see them.
            </p>
          </div>
          <p className="text-label-lg font-label-lg" aria-live="polite">
            {uploaded} of {required.length} required uploaded
          </p>
        </div>
        <div
          aria-hidden
          className="mt-space-sm h-2 overflow-hidden rounded-full bg-surface-container-high"
        >
          <div
            className="h-full rounded-full bg-secondary transition-[width]"
            style={{ width: `${(uploaded / required.length) * 100}%` }}
          />
        </div>
        <ul className="mt-space-md grid gap-space-md md:grid-cols-2">
          {DOCUMENTS.map((d) => (
            <li key={d.type}>
              <DocumentCard
                operatorId={op.id}
                type={d.type}
                label={d.label}
                description={d.description}
                required={d.required}
                document={byType.get(d.type)}
                locked={locked}
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

const STEPS = ['Business profile', 'Documents', 'Admin review', 'Decision']

function StatusTracker({
  operator: op,
  allRequired,
}: {
  operator: Operator
  allRequired: boolean
}) {
  const s = op.verificationStatus
  // Index of the current step.
  const current =
    s === 'verified' || s === 'rejected' || s === 'suspended'
      ? 3
      : s === 'under_review'
        ? 2
        : allRequired
          ? 2
          : 1

  const message: Record<string, ReactNode> = {
    pending: allRequired
      ? 'Your documents are in. An admin will review your application; we’ll notify you of the decision.'
      : 'Upload the required documents below. An admin reviews your application once they’re all in.',
    under_review: 'Your details are being reviewed. We’ll notify you when there’s an update.',
    verified: 'You’re verified. Your routes can now go live for commuters.',
    rejected: (
      <>
        Your application wasn’t approved.
        {op.rejectionReason && (
          <>
            {' '}
            <strong>Reason: {op.rejectionReason}</strong>
          </>
        )}{' '}
        Upload corrected documents below to send it for review again.
      </>
    ),
    suspended:
      'Your operator account is suspended, so your routes are hidden. Contact support for help.',
  }

  return (
    <Card>
      <ol className="grid gap-space-sm sm:grid-cols-4" aria-label="Verification progress">
        {STEPS.map((label, i) => {
          const done = i < current || (i === 3 && s === 'verified')
          const active = i === current && !done
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className="flex items-center gap-space-sm"
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-label-lg',
                  done && 'border-secondary bg-secondary text-on-secondary',
                  active && 'border-primary-container bg-primary-container text-on-primary',
                  !done && !active && 'border-border-strong text-on-surface-variant',
                )}
              >
                {done ? <Check aria-hidden className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-label-lg',
                  active ? 'font-label-lg' : 'text-on-surface-variant',
                )}
              >
                {label}
                {done && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          )
        })}
      </ol>
      <p
        role="status"
        className={cn(
          'mt-space-md flex items-start gap-space-sm rounded-xl p-space-md text-body-md',
          s === 'rejected' || s === 'suspended'
            ? 'border border-error/25 bg-error/5'
            : s === 'verified'
              ? 'border border-success/25 bg-success/10'
              : 'bg-surface-container-low',
        )}
      >
        {s === 'rejected' || s === 'suspended' ? (
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-error" />
        ) : s === 'verified' ? (
          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
        ) : (
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-on-surface-variant" />
        )}
        <span>{message[s]}</span>
      </p>
      {s === 'verified' ? (
        <ButtonLink to="/operator" className="mt-space-md">
          Go to operator dashboard
        </ButtonLink>
      ) : (
        <p className="mt-space-sm text-body-sm text-on-surface-variant">
          Publishing routes unlocks once you’re verified.
        </p>
      )}
    </Card>
  )
}

function DocumentCard({
  operatorId,
  type,
  label,
  description,
  required,
  document: doc,
  locked,
}: {
  operatorId: string
  type: DocumentType
  label: string
  description: string
  required: boolean
  document?: OperatorDocument
  locked: boolean
}) {
  const api = useApi()
  const toast = useToast()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const errorId = useId()
  const [error, setError] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['operator', 'mine'] })

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadOperatorDocument(operatorId, type, file),
    onSuccess: async (d) => {
      await refresh()
      toast.success(`${label} uploaded`, d.fileName)
    },
    onError: (e) =>
      setError(isApiError(e) ? e.message : 'Upload failed. Check the file and your connection.'),
  })
  const remove = useMutation({
    mutationFn: () => api.removeOperatorDocument(operatorId, doc!.id),
    onSuccess: async () => {
      await refresh()
      toast.success(`${label} removed`)
    },
    onError: (e) => setError(isApiError(e) ? e.message : 'Something went wrong. Try again.'),
  })

  function onFile(file: File | undefined) {
    if (!file) return
    const problem = checkFile(file)
    setError(problem)
    if (!problem) upload.mutate(file)
    if (inputRef.current) inputRef.current.value = '' // allow re-choosing the same file
  }

  const rejected = doc?.status === 'rejected'

  return (
    <article
      aria-label={label}
      className={cn(
        'flex h-full flex-col gap-space-sm rounded-2xl border bg-surface-container-lowest p-space-md shadow-card',
        rejected || error ? 'border-error/40' : 'border-border-default',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <h3 className="text-title-md font-title-md">{label}</h3>
        {doc ? (
          rejected ? (
            <Chip tone="error">Needs a new copy</Chip>
          ) : doc.status === 'accepted' ? (
            <Chip tone="success">Accepted</Chip>
          ) : (
            <Chip tone="info">Uploaded</Chip>
          )
        ) : required ? (
          <Chip tone="warning">Required</Chip>
        ) : (
          <Chip tone="neutral">Recommended</Chip>
        )}
      </div>
      <p className="text-body-md text-on-surface-variant">{description}</p>

      {doc && (
        <p className="flex items-center gap-space-xs text-body-md">
          <FileText aria-hidden className="size-4 shrink-0 text-secondary" />
          <span className="min-w-0 truncate">{doc.fileName}</span>
          <span className="shrink-0 text-body-sm text-on-surface-variant">
            · {formatDate(doc.submittedAt)}
          </span>
        </p>
      )}
      {rejected && doc?.rejectionReason && (
        <p className="text-body-md text-error">Reason: {doc.rejectionReason}</p>
      )}

      {upload.isPending && (
        <div>
          <p className="text-body-sm text-on-surface-variant">Uploading…</p>
          {/* The API doesn't report progress yet, so this is indeterminate. */}
          <div
            role="progressbar"
            aria-label={`Uploading ${label}`}
            className="mt-space-xs h-1.5 overflow-hidden rounded-full bg-surface-container-high"
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-secondary" />
          </div>
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-body-sm text-error">
          {error}
        </p>
      )}

      {!locked && (
        <div className="mt-auto flex flex-wrap gap-space-sm pt-space-sm">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="peer sr-only"
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => onFile(e.target.files?.[0])}
            disabled={upload.isPending || remove.isPending}
          />
          <label
            htmlFor={inputId}
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center gap-space-sm rounded-lg px-5 font-label-lg text-label-lg',
              'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary',
              doc
                ? 'border border-border-strong text-primary-container hover:border-primary-container'
                : 'bg-primary-container text-on-primary hover:bg-[#102a3e]',
              (upload.isPending || remove.isPending) && 'pointer-events-none opacity-60',
            )}
          >
            {doc ? (
              <RefreshCw aria-hidden className="size-4" />
            ) : (
              <Upload aria-hidden className="size-4" />
            )}
            {doc ? 'Replace' : 'Upload'}
            <span className="sr-only"> {label}</span>
          </label>
          {doc && (
            <Button
              variant="ghost"
              onClick={() => remove.mutate()}
              loading={remove.isPending}
              disabled={upload.isPending}
              aria-label={`Remove ${label}`}
            >
              <Trash2 aria-hidden className="size-4" />
              Remove
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
