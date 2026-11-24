import { TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface SummaryError {
  /** id of the control to jump to; omit for form-level errors. */
  fieldId?: string
  message: ReactNode
}

/**
 * Lists a form's errors at the top, each linking to its field. Takes focus
 * when it appears (and each time `focusKey` changes) so screen-reader and
 * keyboard users land on it after a failed submit.
 */
export function ErrorSummary({
  title = 'There is a problem',
  errors,
  focusKey,
  className,
}: {
  title?: string
  errors: SummaryError[]
  /** Change this (e.g. a submit counter) to move focus back to the summary. */
  focusKey?: unknown
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const visible = errors.length > 0

  useEffect(() => {
    if (visible) ref.current?.focus()
  }, [visible, focusKey])

  if (!visible) return null

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby={titleId}
      className={cn(
        'rounded-xl border border-error/30 bg-error/5 p-space-md focus:outline-none focus-visible:ring-3 focus-visible:ring-error/25',
        className,
      )}
    >
      <h2
        id={titleId}
        className="flex items-center gap-space-sm text-title-md font-title-md text-on-surface"
      >
        <TriangleAlert aria-hidden className="size-4 shrink-0 text-error" />
        {title}
      </h2>
      <ul className="mt-space-sm flex flex-col gap-space-xs pl-6 text-body-md">
        {errors.map((e, i) => (
          <li key={e.fieldId ?? i} className="text-error">
            {e.fieldId ? (
              <a
                href={`#${e.fieldId}`}
                onClick={(ev) => {
                  ev.preventDefault()
                  document.getElementById(e.fieldId!)?.focus()
                }}
                className="underline underline-offset-2 hover:no-underline"
              >
                {e.message}
              </a>
            ) : (
              e.message
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
