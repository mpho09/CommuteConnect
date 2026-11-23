import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

/** Progress indicator for multi-step flows (profile setup, operator onboarding). */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Progress">
      <p className="mb-space-sm text-label-md font-label-md text-on-surface-variant sm:hidden">
        Step {current + 1} of {steps.length}: {steps[current]}
      </p>
      <ol className="flex items-center gap-space-sm">
        {steps.map((label, i) => {
          const done = i < current
          const active = i === current
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className="flex flex-1 items-center gap-space-sm last:flex-none"
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-label-lg font-label-lg',
                  done && 'border-secondary bg-secondary text-on-secondary',
                  active && 'border-primary-container bg-primary-container text-on-primary',
                  !done && !active && 'border-border-strong text-on-surface-variant',
                )}
              >
                {done ? <Check aria-hidden className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-label-lg font-label-lg sm:inline',
                  active ? 'text-on-surface' : 'text-on-surface-variant',
                )}
              >
                {label}
                {done && <span className="sr-only"> (completed)</span>}
              </span>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn('h-0.5 flex-1', done ? 'bg-secondary' : 'bg-border-strong')}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
