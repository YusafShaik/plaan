import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type AlertVariant =
  | 'default'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
}

const variantStyles: Record<AlertVariant, string> = {
  default: 'border-border bg-muted text-foreground',
  destructive:
    'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-info/30 bg-info/10 text-info',
}

export function Alert({
  variant = 'default',
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-md border p-3 text-sm',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className="flex-1">{children}</div>
    </div>
  )
}
