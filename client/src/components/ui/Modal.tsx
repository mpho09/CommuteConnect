import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import type { ButtonVariant } from './buttonStyles'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal dialog: focus moves inside on open, Tab/Shift+Tab are
 * trapped, Esc closes, and focus returns to the trigger on close.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  role = 'dialog',
  size = 'md',
  dismissible = true,
  initialFocusRef,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  /** Use 'alertdialog' for confirmations that interrupt the user. */
  role?: 'dialog' | 'alertdialog'
  size?: 'sm' | 'md' | 'lg'
  /** When false, Esc and backdrop clicks don't close (e.g. while saving). */
  dismissible?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  // Keep the latest values without re-running the open effect.
  const latest = useRef({ onClose, dismissible })
  useEffect(() => {
    latest.current = { onClose, dismissible }
  })

  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement as HTMLElement | null
    const panel = panelRef.current!
    const target = initialFocusRef?.current ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel
    target.focus()

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (latest.current.dismissible) {
          e.stopPropagation()
          latest.current.onClose()
        }
        return
      }
      if (e.key !== 'Tab') return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      trigger?.focus?.()
    }
  }, [open, initialFocusRef])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-space-md">
      <div
        aria-hidden
        className="absolute inset-0 bg-primary/40 backdrop-blur-[2px]"
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface-container-lowest shadow-overlay sm:rounded-2xl',
          { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size],
        )}
      >
        <div className="flex items-start gap-space-md p-space-lg pb-space-md">
          <div className="flex-1">
            <h2 id={titleId} className="text-headline-sm font-headline-sm text-on-surface">
              {title}
            </h2>
            {description && (
              <div id={descId} className="mt-space-xs text-body-md text-on-surface-variant">
                {description}
              </div>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
            >
              <X aria-hidden className="size-5" />
            </button>
          )}
        </div>
        {children && <div className="overflow-y-auto px-space-lg pb-space-md">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-space-sm border-t border-border-default bg-surface px-space-lg py-space-md sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** Confirm / cancel dialog used by M1–M4. Put extra fields (e.g. a reason) in children. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Keep it',
  confirmVariant = 'primary',
  loading = false,
  confirmDisabled = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  confirmVariant?: ButtonVariant
  loading?: boolean
  confirmDisabled?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      role="alertdialog"
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
