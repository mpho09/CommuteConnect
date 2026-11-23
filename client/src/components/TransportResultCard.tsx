import { ArrowRight, Bus, CalendarDays, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { formatDate, formatFare } from '../lib/format'
import { Chip, VerificationChip, type VerificationStatus } from './ui/Chip'

export interface TransportResultCardProps {
  href: string
  operatorName: string
  verification: VerificationStatus
  /** e.g. "Minibus taxi", "Shuttle", "Coach" */
  transportType: string
  originLabel: string
  destinationLabel: string
  /** Pre-formatted schedule, e.g. "Weekdays · 06:30, 07:15, 08:00" */
  scheduleSummary: string
  /** ZAR cents, or null for "Contact for fare". */
  fareCents: number | null
  /** ISO timestamp the operator last confirmed this listing (BR11). */
  updatedAt: string
  /** Listing hasn't been reconfirmed within the freshness window (BR11). */
  needsConfirmation?: boolean
}

/** Operator service in search results (PRD §8.3). Status is shown, never inferred. */
export function TransportResultCard({
  href,
  operatorName,
  verification,
  transportType,
  originLabel,
  destinationLabel,
  scheduleSummary,
  fareCents,
  updatedAt,
  needsConfirmation = false,
}: TransportResultCardProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border-default bg-surface-container-lowest shadow-card transition-shadow focus-within:shadow-raised hover:border-border-strong hover:shadow-raised">
      {/* Navy strip marks regulated operator services (DESIGN.md §4). */}
      <div aria-hidden className="h-1 bg-primary-container" />
      <div className="flex flex-col gap-space-sm p-space-md md:p-5">
        <div className="flex flex-wrap items-center gap-space-sm">
          <Chip tone="primary" icon={Bus}>
            {transportType}
          </Chip>
          <VerificationChip status={verification} />
          {needsConfirmation && (
            <Chip tone="warning" icon={TriangleAlert}>
              Needs confirmation
            </Chip>
          )}
        </div>
        <div className="flex items-start justify-between gap-space-md">
          <div className="min-w-0">
            <h3 className="text-title-md font-title-md text-on-surface">
              {/* Stretched link makes the whole card clickable with one tab stop. */}
              <Link
                to={href}
                className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
              >
                {operatorName}
              </Link>
            </h3>
            <p className="mt-space-xs flex flex-wrap items-center gap-x-space-xs text-body-md text-on-surface">
              <span>{originLabel}</span>
              <ArrowRight aria-label="to" className="size-4 text-secondary" />
              <span>{destinationLabel}</span>
            </p>
          </div>
          <p className="shrink-0 text-right text-currency-fare font-currency-fare text-on-surface">
            {formatFare(fareCents)}
          </p>
        </div>
        <p className="flex items-center gap-space-xs text-body-md text-on-surface-variant">
          <CalendarDays aria-hidden className="size-4 shrink-0" />
          {scheduleSummary}
        </p>
        <p className="text-body-sm text-on-surface-variant">Updated {formatDate(updatedAt)}</p>
      </div>
    </article>
  )
}
