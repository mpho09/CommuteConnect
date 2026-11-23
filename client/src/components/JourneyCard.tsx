import { ArrowRight, CalendarDays, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router'
import { Chip, StatusChip, type RequestStatus } from './ui/Chip'

export interface JourneyCardProps {
  href: string
  publisherName: string
  /** Neighbourhood-scale zone, never an exact address (BR3, BR12). */
  originZone: string
  destinationZone: string
  /** Pre-formatted, e.g. "Mon–Fri · around 06:45" or "Sat 30 Nov · 07:00" */
  scheduleSummary: string
  seatsAvailable: number
  /** Plain-language reason shown on match suggestions, e.g. "Departs within 15 min of your time". */
  matchReason?: string
  /** Viewer's request status for this journey, if any. */
  requestStatus?: RequestStatus
}

/** Community shared journey (PRD §8.3). Shows approximate zones only. */
export function JourneyCard({
  href,
  publisherName,
  originZone,
  destinationZone,
  scheduleSummary,
  seatsAvailable,
  matchReason,
  requestStatus,
}: JourneyCardProps) {
  const full = seatsAvailable <= 0
  return (
    <article className="relative flex flex-col gap-space-sm rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card transition-shadow focus-within:shadow-raised hover:border-border-strong hover:shadow-raised md:p-5">
      <div className="flex flex-wrap items-center gap-space-sm">
        <Chip tone="info" icon={Users}>
          Community shared journey
        </Chip>
        {matchReason && <Chip tone="neutral">Possible match</Chip>}
        {requestStatus && <StatusChip status={requestStatus} />}
      </div>
      <h3 className="flex flex-wrap items-center gap-x-space-xs text-title-md font-title-md text-on-surface">
        <MapPin aria-hidden className="size-4 text-secondary" />
        <Link
          to={href}
          className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
        >
          {originZone}
          <ArrowRight aria-label="to" className="mx-space-xs inline size-4 text-secondary" />
          {destinationZone}
        </Link>
      </h3>
      <p className="flex items-center gap-space-xs text-body-md text-on-surface-variant">
        <CalendarDays aria-hidden className="size-4 shrink-0" />
        {scheduleSummary}
      </p>
      {matchReason && <p className="text-body-md text-on-surface">{matchReason}</p>}
      <div className="flex items-center justify-between gap-space-md text-body-md">
        <span className="text-on-surface-variant">Shared by {publisherName}</span>
        <span className={full ? 'font-label-lg text-error' : 'font-label-lg text-on-surface'}>
          {full ? 'Full' : `${seatsAvailable} ${seatsAvailable === 1 ? 'seat' : 'seats'} left`}
        </span>
      </div>
    </article>
  )
}
