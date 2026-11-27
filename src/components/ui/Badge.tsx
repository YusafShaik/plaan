import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'info'
  | 'destructive'
  | 'neutral'
  | 'brand'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  /** Show a sharp status square before the label */
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  info: 'bg-info-soft text-info border-info/20',
  destructive: 'bg-destructive-soft text-destructive border-destructive/20',
  neutral: 'bg-secondary text-muted-foreground border-border',
  brand: 'bg-brand-soft text-brand border-brand/20',
}

/** Sharp status pill — always 2px radius, design-system colors only */
export function Badge({
  variant = 'neutral',
  dot = true,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold border whitespace-nowrap',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-[1px] bg-current shrink-0"
          aria-hidden
        />
      )}
      {children}
    </span>
  )
}

export type StatusTone =
  | 'success'
  | 'warning'
  | 'info'
  | 'destructive'
  | 'neutral'

/** Compact status text for dense cells */
export function StatusText({
  tone = 'neutral',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: StatusTone }) {
  const tones: Record<StatusTone, string> = {
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info',
    destructive: 'text-destructive',
    neutral: 'text-muted-foreground',
  }
  return (
    <span
      className={cn('text-xs font-semibold', tones[tone], className)}
      {...props}
    >
      {children}
    </span>
  )
}

/** Map common domain statuses → Badge variant */
export function statusToBadgeVariant(
  status: string
): BadgeVariant {
  const s = status.toUpperCase()
  if (
    ['CONFIRMED', 'ACTIVE', 'POSTED', 'COMPLETED', 'ISSUED', 'RECEIVED'].some(
      (x) => s.includes(x)
    )
  )
    return 'success'
  if (
    ['DRAFT', 'PENDING', 'PARTIAL', 'OPEN', 'WAITING'].some((x) =>
      s.includes(x)
    )
  )
    return 'warning'
  if (
    ['IN_PROGRESS', 'RELEASED', 'IN PROGRESS', 'PROCESSING'].some((x) =>
      s.includes(x)
    )
  )
    return 'info'
  if (
    ['CANCELLED', 'CANCELED', 'INACTIVE', 'FAILED', 'REJECTED', 'VOID'].some(
      (x) => s.includes(x)
    )
  )
    return 'destructive'
  return 'neutral'
}
