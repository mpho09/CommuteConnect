import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface StyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  /** Shows a spinner, disables the button and announces busy state. */
  loading?: boolean
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

/** A router link styled as a button. Use for navigation, Button for actions. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  ...rest
}: LinkProps & StyleProps) {
  return <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest} />
}
