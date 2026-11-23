import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

/** Resting surface: white, hairline border, soft navy shadow, 16px radius. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-default bg-surface-container-lowest p-space-md shadow-card md:p-space-lg',
        className,
      )}
      {...rest}
    />
  )
}
