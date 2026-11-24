import {
  BellOff,
  CalendarX2,
  Check,
  CheckCheck,
  CircleCheck,
  CircleX,
  Flag,
  MessageSquare,
  ShieldCheck,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingList } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast/toastContext'
import type { AppNotification, NotificationType } from '../../lib/api/types'
import { cn } from '../../lib/cn'
import { formatWhen } from '../../lib/schedule'
import { useNotifications } from './useNotifications'

const ICONS: Record<NotificationType, LucideIcon> = {
  request_received: UserPlus,
  request_accepted: CircleCheck,
  request_rejected: CircleX,
  request_cancelled: UserMinus,
  enquiry_received: MessageSquare,
  enquiry_responded: MessageSquare,
  verification_submitted: ShieldCheck,
  verification_decision: ShieldCheck,
  journey_changed: CalendarX2,
  report_received: Flag,
}

/** S19 Notifications (PRD US12, F8). */
export function NotificationsPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const unreadOnly = params.get('filter') === 'unread'
  const { list, unread, markRead, markAllRead } = useNotifications()
  const all = list.data ?? []
  const shown = unreadOnly ? all.filter((n) => !n.isRead) : all

  return (
    <div className="mx-auto max-w-3xl px-margin-mobile py-space-xl md:px-margin">
      <header className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <h1 className="text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
            Notifications
          </h1>
          <p className="mt-space-xs text-body-lg text-on-surface-variant" aria-live="polite">
            {unread === 0 ? 'You’re all caught up.' : `${unread} unread`}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            markAllRead.mutate(undefined, {
              onError: () => toast.error('Couldn’t mark notifications as read', 'Try again.'),
            })
          }
          disabled={unread === 0}
          loading={markAllRead.isPending}
        >
          <CheckCheck aria-hidden className="size-4" />
          Mark all as read
        </Button>
      </header>

      <div
        role="group"
        aria-label="Show"
        className="mt-space-lg inline-flex rounded-lg bg-surface-container p-space-xs"
      >
        {[
          { label: `All (${all.length})`, value: false },
          { label: `Unread (${unread})`, value: true },
        ].map((f) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={unreadOnly === f.value}
            onClick={() => setParams(f.value ? { filter: 'unread' } : {}, { replace: true })}
            className={cn(
              'min-h-11 rounded-md px-space-md text-label-lg',
              unreadOnly === f.value
                ? 'bg-surface-container-lowest text-primary-container shadow-card'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-space-lg">
        {list.isPending ? (
          <LoadingList count={3} label="Loading notifications…" />
        ) : list.isError ? (
          <ErrorState onRetry={() => void list.refetch()} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
            description={
              unreadOnly
                ? 'You’re all caught up.'
                : 'Updates about your requests, journeys and enquiries will appear here.'
            }
            action={
              unreadOnly ? (
                <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                  Show all
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="flex flex-col gap-space-sm">
            {shown.map((n) => (
              <li key={n.id}>
                <NotificationItem
                  notification={n}
                  onRead={(onDone) => markRead.mutate(n.id, { onSettled: onDone })}
                  marking={markRead.isPending && markRead.variables === n.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function NotificationItem({
  notification: n,
  onRead,
  marking,
}: {
  notification: AppNotification
  onRead: (onDone?: () => void) => void
  marking: boolean
}) {
  const navigate = useNavigate()
  const Icon = ICONS[n.type] ?? CircleCheck

  return (
    <article
      className={cn(
        'relative flex gap-space-md rounded-2xl border p-space-md transition-colors',
        n.isRead
          ? 'border-border-default bg-surface-container-lowest'
          : 'border-secondary/30 bg-secondary/5',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          n.isRead
            ? 'bg-surface-container text-on-surface-variant'
            : 'bg-secondary/15 text-secondary',
        )}
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-space-sm">
          <h2 className={cn('text-title-md', n.isRead ? 'font-normal' : 'font-title-md')}>
            {/* Opening marks it read, then goes to the related page. */}
            <Link
              to={n.linkTarget}
              onClick={(e) => {
                if (n.isRead) return
                e.preventDefault()
                onRead(() => void navigate(n.linkTarget))
              }}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {!n.isRead && <span className="sr-only">Unread: </span>}
              {n.title}
            </Link>
          </h2>
          {!n.isRead && (
            <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-secondary" />
          )}
        </div>
        <p className="mt-space-xs text-body-md text-on-surface-variant">{n.body}</p>
        <div className="mt-space-xs flex flex-wrap items-center justify-between gap-space-sm">
          <time dateTime={n.createdAt} className="text-body-sm text-on-surface-variant">
            {formatWhen(n.createdAt)}
          </time>
          {!n.isRead && (
            // Above the stretched link so it can be clicked on its own.
            <Button
              variant="ghost"
              className="relative z-10 px-space-sm"
              onClick={() => onRead()}
              loading={marking}
              aria-label={`Mark “${n.title}” as read`}
            >
              <Check aria-hidden className="size-4" />
              Mark as read
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
