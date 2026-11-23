import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
export type ButtonSize = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-space-sm rounded-lg font-label-lg text-label-lg ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ' +
  'disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-on-surface-variant disabled:border-transparent ' +
  'aria-disabled:cursor-not-allowed aria-disabled:bg-border-strong aria-disabled:text-on-surface-variant'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-container text-on-primary hover:bg-[#102a3e] active:bg-[#0c2030]',
  secondary: 'bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant',
  outline:
    'border border-border-strong bg-transparent text-primary-container hover:bg-surface hover:border-primary-container',
  ghost: 'bg-transparent text-primary-container hover:bg-surface-container',
  destructive: 'bg-error text-on-error hover:bg-on-error-container',
}

// Minimum touch target 44px (md) / 48px (lg), per PRD §9.
const sizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-5 py-2.5',
  lg: 'min-h-12 px-6 py-3',
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
} = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)
}
