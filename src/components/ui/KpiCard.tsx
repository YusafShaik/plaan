import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
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
  onClick?: () => void
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
  onClick,
  className,
}: KpiCardProps) {
  const renderBody = (interactive: boolean) => (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {interactive && (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-all group-hover:text-foreground group-hover:translate-x-0.5" />
        )}
      </div>
      <div className="mt-1.5">
        <p
          className={cn(
            'text-[22px] leading-7 font-semibold tracking-tight tabular-nums',
            valueTone[tone]
          )}
        >
          {value}
        </p>
        {hint != null && hint !== '' && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group flex min-h-[84px] flex-col justify-between rounded-md border border-border bg-card px-4 py-3.5 text-left hover:bg-secondary/40 transition-colors cursor-pointer',
          className
        )}
      >
        {renderBody(true)}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'flex min-h-[84px] flex-col justify-between rounded-md border border-border bg-card px-4 py-3.5',
        className
      )}
    >
      {renderBody(false)}
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
