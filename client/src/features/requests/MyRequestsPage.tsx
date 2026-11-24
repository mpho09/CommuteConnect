import { useQueries, useQuery } from '@tanstack/react-query'
import { Check, Inbox, MessageSquare, Send, UserPlus, X, XCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Chip, StatusChip } from '../../components/ui/Chip'
import { EmptyState, ErrorState, LoadingList } from '../../components/ui/States'
import { useApi } from '../../lib/api/apiContext'
import type { Enquiry, Journey, JourneyRequest } from '../../lib/api/types'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { journeyListingPath, routeListingPath } from '../../lib/paths'
import { describeSchedule } from '../../lib/schedule'
import { useJourneyActions } from '../journeys/useJourneyActions'
import { CancelRequestModal } from './CancelRequestModal'

type Tab = 'sent' | 'received'
const ACTIVE = new Set(['pending', 'accepted', 'new'])

/** Open items first, then newest first. */
function byActivity<T extends { status: string; createdAt: string }>(a: T, b: T) {
  return (
    Number(ACTIVE.has(b.status)) - Number(ACTIVE.has(a.status)) ||
    b.createdAt.localeCompare(a.createdAt)
  )
}

/** S18 My Requests (PRD US10, US11, BR14). */
export function MyRequestsPage() {
  const api = useApi()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'received' ? 'received' : 'sent'
  const requests = useQuery({ queryKey: ['requests', 'mine'], queryFn: () => api.listMyRequests() })
  const enquiries = useQuery({
    queryKey: ['enquiries', 'mine'],
    queryFn: () => api.listMyEnquiries(),
  })

  const journeyIds = [
    ...new Set(
      [...(requests.data?.sent ?? []), ...(requests.data?.received ?? [])].map((r) => r.journeyId),
    ),
  ]
  const journeyQueries = useQueries({
    queries: journeyIds.map((id) => ({
      queryKey: ['journey', id],
      queryFn: () => api.getJourney(id),
    })),
  })
  const journeys = new Map(
    journeyQueries.flatMap((q) => (q.data ? [[q.data.id, q.data] as const] : [])),
  )

  const counts = {
    sent: (requests.data?.sent.length ?? 0) + (enquiries.data?.sent.length ?? 0),
    received: (requests.data?.received.length ?? 0) + (enquiries.data?.received.length ?? 0),
  }

  let body: ReactNode
  if (requests.isPending || enquiries.isPending) {
    body = <LoadingList count={3} label="Loading your requests…" />
  } else if (requests.isError || enquiries.isError) {
    body = (
      <ErrorState
        onRetry={() => {
          void requests.refetch()
          void enquiries.refetch()
        }}
      />
    )
  } else if (tab === 'sent') {
    body = (
      <SentList
        requests={[...requests.data.sent].sort(byActivity)}
        enquiries={[...enquiries.data.sent].sort(byActivity)}
        journeys={journeys}
      />
    )
  } else {
    body = (
      <ReceivedList
        requests={[...requests.data.received].sort(byActivity)}
        enquiries={[...enquiries.data.received].sort(byActivity)}
        journeys={journeys}
      />
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-margin-mobile py-space-xl md:px-margin">
      <h1 className="text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
        My requests
      </h1>
      <p className="mt-space-xs text-body-lg text-on-surface-variant">
        Requests to join shared journeys and enquiries to operators, in both directions.
      </p>

      <div
        role="tablist"
        aria-label="Requests"
        className="mt-space-lg flex gap-space-xs border-b border-border-default"
      >
        {(['sent', 'received'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="requests-panel"
            onClick={() => setParams(t === 'sent' ? {} : { tab: t }, { replace: true })}
            className={cn(
              '-mb-px inline-flex min-h-11 items-center gap-space-xs border-b-2 px-space-md text-label-lg font-label-lg',
              tab === t
                ? 'border-primary-container text-on-surface'
                : 'border-transparent text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t === 'sent' ? (
              <Send aria-hidden className="size-4" />
            ) : (
              <Inbox aria-hidden className="size-4" />
            )}
            {t === 'sent' ? 'Sent' : 'Received'}{' '}
            <span className="text-on-surface-variant">({counts[t]})</span>
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="requests-panel"
        aria-labelledby={`tab-${tab}`}
        className="mt-space-lg"
      >
        {body}
      </div>
    </div>
  )
}

function Item({
  icon: Icon,
  kind,
  title,
  status,
  children,
  actions,
}: {
  icon: typeof Send
  kind: string
  title: ReactNode
  status: ReactNode
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <article className="flex flex-col gap-space-sm rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <div className="min-w-0">
          <p className="flex items-center gap-space-xs text-label-md font-label-md uppercase text-on-surface-variant">
            <Icon aria-hidden className="size-3.5" />
            {kind}
          </p>
          <h3 className="mt-space-xs text-title-md font-title-md">{title}</h3>
        </div>
        {status}
      </div>
      {children}
      {actions && <div className="flex flex-wrap gap-space-sm">{actions}</div>}
    </article>
  )
}

function Quote({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="rounded-lg bg-surface-container-low p-space-sm text-body-md">
      <span className="font-label-lg">{label}: </span>
      {children}
    </p>
  )
}

function journeyTitle(j: Journey | undefined) {
  return j ? (
    <Link to={journeyListingPath(j.id)} className="hover:underline">
      {j.originZone} <span aria-hidden>→</span>
      <span className="sr-only">to</span> {j.destinationZone}
    </Link>
  ) : (
    'Shared journey'
  )
}

function EnquiryStatus({ status }: { status: Enquiry['status'] }) {
  return status === 'new' ? (
    <StatusChip status="pending" />
  ) : status === 'responded' ? (
    <Chip tone="success" icon={MessageSquare}>
      Replied
    </Chip>
  ) : (
    <StatusChip status="closed" />
  )
}

function SentList({
  requests,
  enquiries,
  journeys,
}: {
  requests: JourneyRequest[]
  enquiries: Enquiry[]
  journeys: Map<string, Journey>
}) {
  const [cancelling, setCancelling] = useState<JourneyRequest | null>(null)
  if (requests.length === 0 && enquiries.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="You haven’t sent any requests"
        description="Find transport and send an enquiry to an operator, or request to join a shared journey."
        action={<ButtonLink to="/search">Find transport</ButtonLink>}
      />
    )
  }
  return (
    <>
      <ul className="flex flex-col gap-space-md">
        {requests.map((r) => {
          const j = journeys.get(r.journeyId)
          const canCancel = r.status === 'pending' || r.status === 'accepted'
          return (
            <li key={r.id}>
              <Item
                icon={UserPlus}
                kind="Request to join"
                title={journeyTitle(j)}
                status={<StatusChip status={r.status} />}
                actions={
                  canCancel && (
                    <Button variant="outline" onClick={() => setCancelling(r)}>
                      <XCircle aria-hidden className="size-4" />
                      Cancel request
                    </Button>
                  )
                }
              >
                {j && (
                  <p className="text-body-md text-on-surface-variant">
                    {describeSchedule(j)} · with {j.publisher.displayName}
                  </p>
                )}
                <p className="text-body-sm text-on-surface-variant">
                  Sent {formatDate(r.createdAt)}
                  {r.respondedAt && ` · updated ${formatDate(r.respondedAt)}`}
                </p>
                {r.message && <Quote label="Your message">{r.message}</Quote>}
                {r.status === 'accepted' && (
                  <p className="text-body-md text-success">
                    Accepted. The driver will share the exact meeting point with you.
                  </p>
                )}
                {r.status === 'rejected' && (
                  <p className="text-body-md text-on-surface-variant">
                    The driver couldn’t take you this time.{' '}
                    <Link
                      to="/commuter/matches"
                      className="font-label-lg text-secondary hover:underline"
                    >
                      See other possible matches
                    </Link>
                  </p>
                )}
                {r.status === 'cancelled' && r.cancelReason && (
                  <Quote label="Cancelled">{r.cancelReason}</Quote>
                )}
              </Item>
            </li>
          )
        })}
        {enquiries.map((e) => (
          <li key={e.id}>
            <Item
              icon={MessageSquare}
              kind="Enquiry"
              title={
                <Link to={routeListingPath(e.routeId)} className="hover:underline">
                  {e.routeName}
                </Link>
              }
              status={<EnquiryStatus status={e.status} />}
            >
              <p className="text-body-sm text-on-surface-variant">
                Sent {formatDate(e.createdAt)}
                {e.respondedAt && ` · replied ${formatDate(e.respondedAt)}`}
              </p>
              <Quote label="You asked">{e.message}</Quote>
              {e.response ? (
                <Quote label="Operator replied">{e.response}</Quote>
              ) : (
                <p className="text-body-md text-on-surface-variant">
                  Waiting for the operator to reply.
                </p>
              )}
            </Item>
          </li>
        ))}
      </ul>
      {cancelling && (
        <CancelRequestModal
          request={cancelling}
          journey={journeys.get(cancelling.journeyId)}
          open
          onClose={() => setCancelling(null)}
        />
      )}
    </>
  )
}

function ReceivedList({
  requests,
  enquiries,
  journeys,
}: {
  requests: JourneyRequest[]
  enquiries: Enquiry[]
  journeys: Map<string, Journey>
}) {
  const { respond } = useJourneyActions()
  if (requests.length === 0 && enquiries.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Nothing received yet"
        description="Requests to join journeys you publish, and enquiries about your routes, appear here."
        action={
          <ButtonLink to="/commuter/journeys/new" variant="outline">
            Publish a journey
          </ButtonLink>
        }
      />
    )
  }
  return (
    <ul className="flex flex-col gap-space-md">
      {requests.map((r) => {
        const j = journeys.get(r.journeyId)
        const busy = respond.isPending && respond.variables?.id === r.id
        return (
          <li key={r.id}>
            <Item
              icon={UserPlus}
              kind={`Request from ${r.commuter.displayName}`}
              title={journeyTitle(j)}
              status={<StatusChip status={r.status} />}
              actions={
                r.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => respond.mutate({ id: r.id, action: { action: 'accept' } })}
                      disabled={respond.isPending || (j ? j.seatsAvailable <= 0 : false)}
                      loading={busy && respond.variables?.action.action === 'accept'}
                      aria-label={`Accept ${r.commuter.displayName}`}
                    >
                      <Check aria-hidden className="size-4" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => respond.mutate({ id: r.id, action: { action: 'reject' } })}
                      disabled={respond.isPending}
                      loading={busy && respond.variables?.action.action === 'reject'}
                      aria-label={`Decline ${r.commuter.displayName}`}
                    >
                      <X aria-hidden className="size-4" />
                      Decline
                    </Button>
                  </>
                )
              }
            >
              {j && <p className="text-body-md text-on-surface-variant">{describeSchedule(j)}</p>}
              <p className="text-body-sm text-on-surface-variant">
                Received {formatDate(r.createdAt)}
              </p>
              {r.message && <Quote label="Message">{r.message}</Quote>}
              {r.status === 'cancelled' && r.cancelReason && (
                <Quote label="Cancelled">{r.cancelReason}</Quote>
              )}
            </Item>
          </li>
        )
      })}
      {enquiries.map((e) => (
        <li key={e.id}>
          <Item
            icon={MessageSquare}
            kind={`Enquiry from ${e.commuter.displayName}`}
            title={e.routeName}
            status={<EnquiryStatus status={e.status} />}
            actions={
              e.status === 'new' && (
                <ButtonLink to="/operator" variant="outline">
                  Reply in operator dashboard
                </ButtonLink>
              )
            }
          >
            <p className="text-body-sm text-on-surface-variant">
              Received {formatDate(e.createdAt)}
            </p>
            <Quote label="Question">{e.message}</Quote>
            {e.response && <Quote label="Your reply">{e.response}</Quote>}
          </Item>
        </li>
      ))}
    </ul>
  )
}
