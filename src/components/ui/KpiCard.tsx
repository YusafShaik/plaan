import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type KpiTone =
  | 'default'
  | 'muted'
  | 'success'
  | 'warning'
  | 'info'
  | 'destructive'

export interface KpiCardProps {
  label: string
  value: ReactNode
  /** Optional secondary line under the label (Mercury pattern) */
  hint?: ReactNode
  /**
   * Prefer default (ink) on list pages. Status colors belong on Badges,
   * not metric strips — max 4 calm KPIs.
   */
  tone?: KpiTone
  className?: string
}

const valueTone: Record<KpiTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  destructive: 'text-destructive',
}

/**
 * Mercury-calm metric card — sharp 2px radius, hairline border,
 * ink value + muted label. Use inside `KpiCardGrid` (max 4 on lists).
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'flex min-h-[84px] flex-col justify-between rounded-md border border-border bg-card px-4 py-3.5',
        className
      )}
    >
      <p
        className={cn(
          'text-[22px] leading-7 font-semibold tracking-tight tabular-nums',
          valueTone[tone]
        )}
      >
        {value}
      </p>
      <div className="mt-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {hint != null && hint !== '' && (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  )
}

export interface KpiCardGridProps {
  children: ReactNode
  className?: string
  /** Columns from sm breakpoint upward (default 4; use 3 for three-up strips) */
  columns?: 3 | 4
}

/** Equal-gap card grid for KPI rows — keep list strips to ≤4 cards. */
export function KpiCardGrid({
  children,
  className,
  columns = 4,
}: KpiCardGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3',
        columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  )
}
