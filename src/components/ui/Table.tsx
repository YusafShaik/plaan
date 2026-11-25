import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

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
          'w-full text-left border-collapse text-xs',
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
        'py-3.5 px-4 text-[11px] font-medium text-muted-foreground tracking-wide',
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
        'py-3.5 px-4 text-xs font-medium text-foreground',
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
