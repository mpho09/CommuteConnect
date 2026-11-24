import { TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import { cn } from '../lib/cn'

const WEEKDAYS = [
  { day: 1, short: 'Mon', long: 'Monday' },
  { day: 2, short: 'Tue', long: 'Tuesday' },
  { day: 3, short: 'Wed', long: 'Wednesday' },
  { day: 4, short: 'Thu', long: 'Thursday' },
  { day: 5, short: 'Fri', long: 'Friday' },
  { day: 6, short: 'Sat', long: 'Saturday' },
  { day: 7, short: 'Sun', long: 'Sunday' },
]

/**
 * Weekday toggle chips (ISO weekdays, 1 = Monday). Each chip is a real
 * checkbox named with the full day, so it works with keyboards and screen
 * readers. `firstId` lets an error summary link to the first chip.
 */
export function DayPicker({
  legend,
  value,
  onChange,
  error,
  firstId,
}: {
  legend: string
  value: number[]
  onChange: (days: number[]) => void
  error?: string
  firstId?: string
}) {
  const errorId = useId()
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="font-label-lg text-label-lg">{legend}</legend>
      <div className="mt-space-sm flex flex-wrap gap-space-sm">
        {WEEKDAYS.map(({ day, short, long }, i) => {
          const on = value.includes(day)
          return (
            <label
              key={day}
              className={cn(
                'flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-full border px-space-md text-label-lg',
                'has-focus-visible:ring-3 has-focus-visible:ring-secondary/30',
                on
                  ? 'border-primary-container bg-primary-container text-on-primary'
                  : error
                    ? 'border-error bg-surface-container-lowest text-on-surface'
                    : 'border-border-strong bg-surface-container-lowest text-on-surface hover:border-primary-container',
              )}
            >
              <input
                id={i === 0 ? firstId : undefined}
                type="checkbox"
                className="sr-only"
                checked={on}
                aria-label={long}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...value, day].sort((a, b) => a - b)
                      : value.filter((d) => d !== day),
                  )
                }
              />
              <span aria-hidden>{short}</span>
            </label>
          )
        })}
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-space-sm flex items-start gap-space-xs text-body-sm text-error"
        >
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  )
}
