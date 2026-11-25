import { type HTMLAttributes } from 'react'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'destructive' | 'default'
}

export function Alert({
  variant = 'default',
  className = '',
  children,
  ...props
}: AlertProps) {
  const variantStyles = {
    default: 'border-border bg-muted text-foreground',
    destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  }

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-[10px] border p-3 text-sm ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <div className="flex-1">{children}</div>
    </div>
  )
}
