import {
  Ban,
  CircleCheck,
  CircleX,
  Clock,
  FileSearch,
  Lock,
  ShieldCheck,
  ShieldX,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'primary'

const tones: Record<ChipTone, string> = {
  neutral: 'bg-surface-container-high text-on-surface-variant border-border-strong',
  info: 'bg-secondary/10 text-secondary border-secondary/25',
  success: 'bg-success/12 text-success border-success/25',
  warning: 'bg-accent/15 text-warning border-accent/40',
  error: 'bg-error/10 text-error border-error/25',
  primary: 'bg-primary-container text-on-primary border-transparent',
}

/** Pill badge. Always pairs colour with text (and usually an icon). */
export function Chip({
  tone = 'neutral',
  icon: Icon,
  className,
  children,
}: {
  tone?: ChipTone
  icon?: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-space-xs rounded-full border px-2.5 py-0.5 font-label-md text-label-md whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5 shrink-0" />}
      {children}
    </span>
  )
}

export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended'

const verification: Record<
  VerificationStatus,
  { label: string; tone: ChipTone; icon: LucideIcon }
> = {
  pending: { label: 'Verification pending', tone: 'warning', icon: Clock },
  under_review: { label: 'Under review', tone: 'info', icon: FileSearch },
  verified: { label: 'Verified', tone: 'success', icon: ShieldCheck },
  rejected: { label: 'Not verified', tone: 'error', icon: ShieldX },
  suspended: { label: 'Suspended', tone: 'error', icon: Ban },
}

/** Operator verification state (PRD §8.3). Never implies trust before review. */
export function VerificationChip({
  status,
  className,
}: {
  status: VerificationStatus
  className?: string
}) {
  const { label, tone, icon } = verification[status]
  return (
    <Chip tone={tone} icon={icon} className={className}>
      {label}
    </Chip>
  )
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'closed'

const requestStatus: Record<RequestStatus, { label: string; tone: ChipTone; icon: LucideIcon }> = {
  pending: { label: 'Pending', tone: 'warning', icon: Clock },
  accepted: { label: 'Accepted', tone: 'success', icon: CircleCheck },
  rejected: { label: 'Declined', tone: 'error', icon: CircleX },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: Ban },
  closed: { label: 'Closed', tone: 'neutral', icon: Lock },
}

/** Request / listing status as reported by the server (PRD §8.3). */
export function StatusChip({ status, className }: { status: RequestStatus; className?: string }) {
  const { label, tone, icon } = requestStatus[status]
  return (
    <Chip tone={tone} icon={icon} className={className}>
      {label}
    </Chip>
  )
}
