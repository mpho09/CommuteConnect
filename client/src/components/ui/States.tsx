import { Inbox, RefreshCw, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

/** Plain explanation + next action. Never shows fabricated records (PRD §8.3). */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-space-sm rounded-2xl border border-dashed border-border-strong px-space-lg py-space-xl text-center',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon aria-hidden className="size-6" />
      </span>
      <h2 className="text-title-md font-title-md text-on-surface">{title}</h2>
      {description && (
        <p className="max-w-md text-body-md text-on-surface-variant">{description}</p>
      )}
      {action && <div className="mt-space-sm">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We couldn’t load this. Check your connection and try again.',
  onRetry,
  className,
}: {
  title?: string
  description?: ReactNode
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-space-sm rounded-2xl border border-error/25 bg-error/5 px-space-lg py-space-xl text-center',
        className,
      )}
    >
      <TriangleAlert aria-hidden className="size-6 text-error" />
      <h2 className="text-title-md font-title-md text-on-surface">{title}</h2>
      <p className="max-w-md text-body-md text-on-surface-variant">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-space-sm">
          <RefreshCw aria-hidden className="size-4" />
          Try again
        </Button>
      )}
    </div>
  )
}

/** Grey placeholder block. Mark the surrounding region aria-busy while loading. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-lg bg-surface-container-high', className)}
    />
  )
}

/** Card-shaped skeleton list with a screen-reader loading message. */
export function LoadingList({ count = 3, label = 'Loading…' }: { count?: number; label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-space-md">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-space-sm rounded-2xl border border-border-default bg-surface-container-lowest p-space-lg"
        >
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}
