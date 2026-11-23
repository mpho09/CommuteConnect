import { TriangleAlert } from 'lucide-react'
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '../../lib/cn'

/**
 * Accessible form field: wires label, hint and error to the control via
 * htmlFor / aria-describedby / aria-invalid. The render prop receives the
 * props to spread onto the control.
 */
export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  required?: boolean
}

export function Field({
  label,
  hint,
  error,
  required,
  optional,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  /** Shows "(optional)" after the label. */
  optional?: boolean
  className?: string
  children: (control: FieldControlProps) => ReactNode
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-space-sm', className)}>
      <label htmlFor={id} className="font-label-lg text-label-lg text-on-surface">
        {label}
        {optional && <span className="font-normal text-on-surface-variant"> (optional)</span>}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required,
      })}
      {hint && (
        <p id={hintId} className="text-body-sm text-on-surface-variant">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-space-xs text-body-sm text-error">
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

const controlBase =
  'w-full rounded-lg border border-border-strong bg-surface-container-lowest px-3.5 text-body-lg text-on-surface ' +
  'placeholder:text-on-surface-variant/70 transition-shadow ' +
  'focus:border-secondary focus:outline-none focus:ring-3 focus:ring-secondary/15 ' +
  'aria-invalid:border-error aria-invalid:focus:ring-error/15 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-on-surface-variant'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, 'h-11', className)} {...rest} />
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlBase, 'h-11 pr-8', className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, 'min-h-24 py-2.5', className)} {...rest} />
}

const choiceBase =
  'size-[18px] shrink-0 appearance-none border-[1.5px] border-border-strong bg-surface-container-lowest ' +
  'checked:border-primary-container checked:bg-primary-container ' +
  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-container/15 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode
  description?: ReactNode
}

function Choice({
  type,
  label,
  description,
  className,
  id,
  ...rest
}: ChoiceProps & { type: 'checkbox' | 'radio' }) {
  const autoId = useId()
  const inputId = id ?? autoId
  const descId = description ? `${inputId}-desc` : undefined
  return (
    // min-h-11 keeps the whole row a 44px touch target
    <div className={cn('flex min-h-11 items-start gap-space-sm py-2.5', className)}>
      <span className="relative mt-0.5 flex">
        <input
          id={inputId}
          type={type}
          aria-describedby={descId}
          className={cn(
            choiceBase,
            'peer',
            type === 'checkbox'
              ? 'rounded-sm'
              : 'rounded-full checked:border-[5px] checked:bg-surface-container-lowest',
          )}
          {...rest}
        />
        {type === 'checkbox' && (
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-on-primary peer-checked:block"
          >
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </svg>
        )}
      </span>
      <span className="flex flex-col">
        <label htmlFor={inputId} className="text-body-lg text-on-surface">
          {label}
        </label>
        {description && (
          <span id={descId} className="text-body-sm text-on-surface-variant">
            {description}
          </span>
        )}
      </span>
    </div>
  )
}

export function Checkbox(props: ChoiceProps) {
  return <Choice type="checkbox" {...props} />
}

export function Radio(props: ChoiceProps) {
  return <Choice type="radio" {...props} />
}
