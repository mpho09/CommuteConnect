import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { ToastContext, type ToastApi, type ToastInput, type ToastTone } from './toastContext'

interface ToastItem extends Required<Omit<ToastInput, 'description'>> {
  id: number
  description?: string
}

const icons = { success: CircleCheck, error: TriangleAlert, info: Info }
const accents: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-error',
  info: 'text-secondary',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const api = useMemo<ToastApi>(() => {
    const show = ({ tone = 'info', title, description, duration }: ToastInput) => {
      const id = ++nextId.current
      const ms = duration ?? (tone === 'error' ? 8000 : 5000)
      // Keep at most 3 on screen.
      setToasts((list) => [...list.slice(-2), { id, tone, title, description, duration: ms }])
    }
    return {
      show,
      success: (title, description) => show({ tone: 'success', title, description }),
      error: (title, description) => show({ tone: 'error', title, description }),
    }
  }, [])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Always mounted so screen readers pick up additions. */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-60 flex flex-col items-center gap-space-sm p-space-md sm:items-end"
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false)
  const Icon = icons[toast.tone]

  useEffect(() => {
    if (paused) return
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration)
    return () => clearTimeout(timer)
  }, [paused, toast.id, toast.duration, onDismiss])

  return (
    <div
      // The container is a polite live region; errors interrupt as alerts.
      role={toast.tone === 'error' ? 'alert' : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-space-sm rounded-xl border border-border-default bg-surface-container-lowest p-space-md shadow-raised"
    >
      <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', accents[toast.tone])} />
      <div className="flex-1">
        <p className="text-title-md font-title-md text-on-surface">{toast.title}</p>
        {toast.description && (
          <p className="text-body-md text-on-surface-variant">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}
