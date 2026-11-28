import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export function Table({
  className,
  tableClassName,
  ...props
}: HTMLAttributes<HTMLTableElement> & { tableClassName?: string }) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-md border border-border/80 bg-card',
        className
      )}
    >
      <table
        className={cn(
          'w-full text-left border-collapse text-sm',
          tableClassName
        )}
        {...props}
      />
    </div>
  )
}

export function THead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('border-b border-border bg-surface-muted', className)}
      {...props}
    />
  )
}

export function TBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn('divide-y divide-border/60', className)}
      {...props}
    />
  )
}

export function TR({
  className,
  clickable,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-secondary/50',
        clickable && 'cursor-pointer',
        className
      )}
      {...props}
    />
  )
}

/** Design-system table header cell — muted, medium, never bold/ink */
export function TH({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'py-3.5 px-4 text-xs font-medium text-muted-foreground tracking-wide',
        className
      )}
      {...props}
    />
  )
}

/** Design-system table body cell */
export function TD({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'py-3.5 px-4 text-sm font-medium text-foreground',
        className
      )}
      {...props}
    />
  )
}

/** Non-clickable reference code */
export function RefCode({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('text-ref text-foreground', className)} {...props} />
  )
}

/** Clickable reference code — opens detail */
export function RefLink({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('text-ref-link', className)} {...props} />
}

/** Sharp 2px empty state for tables and lists. */
export function TableEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Unified pagination bar for list tables. */
export function TablePagination({
  page,
  totalPages,
  totalElements,
  count,
  itemLabel = 'records',
  onPageChange,
}: {
  page: number
  totalPages: number
  totalElements: number
  count: number
  itemLabel?: string
  onPageChange: (nextPage: number) => void
}) {
  if (totalElements === 0 && totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground bg-surface-subtle">
      <span className="tabular-nums">
        Showing {count} of {totalElements} {itemLabel}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="h-7 w-7 p-0"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-2 tabular-nums text-foreground font-medium">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="h-7 w-7 p-0"
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
