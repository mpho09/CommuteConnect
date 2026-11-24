import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, LogIn, MailWarning } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { ReportAction } from '../../components/ReportAction'
import { ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { isApiError } from '../../lib/api/errors'
import type { Me, ReportTargetType } from '../../lib/api/types'

export function ListingPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-margin-mobile py-space-lg md:px-margin md:py-space-xl">
      <button
        type="button"
        onClick={() => history.back()}
        className="mb-space-md inline-flex min-h-11 items-center gap-space-xs font-label-lg text-secondary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back
      </button>
      {children}
    </div>
  )
}

/** Main column + sticky action panel on desktop; stacked on mobile. */
export function ListingGrid({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid gap-space-lg lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-space-lg">{main}</div>
      <aside className="flex flex-col gap-space-md lg:sticky lg:top-24">{aside}</aside>
    </div>
  )
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card md:p-space-lg"
    >
      <h2 id={id} className="text-headline-sm font-headline-sm">
        {title}
      </h2>
      <div className="mt-space-md">{children}</div>
    </section>
  )
}

/**
 * Who may act on a listing (BR1): guests are sent to log in (and back here);
 * unverified accounts get an explanation instead of the action.
 */
export function ActionGate({
  user,
  action,
  children,
}: {
  user: Me | null
  /** e.g. "send an enquiry" */
  action: string
  children: ReactNode
}) {
  const location = useLocation()
  const here = location.pathname + location.search
  if (!user) {
    return (
      <div className="flex flex-col gap-space-sm">
        <ButtonLink to={`/login?next=${encodeURIComponent(here)}`} size="lg" fullWidth>
          <LogIn aria-hidden className="size-4" />
          Log in to {action}
        </ButtonLink>
        <p className="text-center text-body-md text-on-surface-variant">
          New here?{' '}
          <Link
            to={`/signup?next=${encodeURIComponent(here)}`}
            className="font-label-lg text-secondary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    )
  }
  if (!user.emailVerified) {
    return (
      <p
        role="note"
        className="flex items-start gap-space-sm rounded-xl border border-accent/40 bg-accent/10 p-space-md text-body-md"
      >
        <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
        <span>
          <strong>Verify your email to {action}.</strong> We sent a link to {user.email}. This keeps
          requests and enquiries coming from real people.
        </span>
      </p>
    )
  }
  return <>{children}</>
}

/** Report this listing (US13). Signed-in users only, since reports need an account. */
export function ReportListing({
  user,
  targetType,
  targetId,
}: {
  user: Me | null
  targetType: ReportTargetType
  targetId: string
}) {
  const api = useApi()
  const toast = useToast()
  const report = useMutation({
    mutationFn: (r: { reason: string; details: string }) =>
      api.createReport({ targetType, targetId, reason: r.reason, description: r.details }),
  })
  if (!user) return null
  return (
    <div className="flex justify-center">
      <ReportAction
        subject="this listing"
        onSubmit={async (r) => {
          try {
            await report.mutateAsync(r)
            toast.success('Report sent', 'Thanks. An admin will review it.')
          } catch (e) {
            toast.error(
              'Report not sent',
              isApiError(e) ? e.message : 'Something went wrong. Try again.',
            )
          }
        }}
      />
    </div>
  )
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-body-sm text-on-surface-variant">{label}</dt>
      <dd className="text-body-lg text-on-surface">{children}</dd>
    </div>
  )
}

export function NotFound() {
  return (
    <EmptyState
      title="This listing isn’t available"
      description="It may have been removed, paused or suspended."
      action={<ButtonLink to="/search">Search again</ButtonLink>}
    />
  )
}
