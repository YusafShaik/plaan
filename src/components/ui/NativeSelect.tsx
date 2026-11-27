import {
  type SelectHTMLAttributes,
  forwardRef,
  useId,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  fieldChrome,
  fieldChromeError,
  fieldChromeIdle,
} from './fieldStyles'

export interface NativeSelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  /** Dense table-row control */
  dense?: boolean
}

/**
 * Styled native &lt;select&gt; matching Input / Select chrome.
 * Prefer the custom Select for searchable lists; use this for simple enums.
 */
export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    { className, label, error, hint, dense = false, id, children, disabled, ...props },
    ref
  ) => {
    const autoId = useId()
    const selectId = id ?? autoId

    if (dense || !label) {
      return (
        <div className={cn('relative inline-flex w-full', className)}>
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              'h-10 w-full rounded-md border border-border/80 bg-secondary pl-3.5 pr-9 text-sm font-medium text-foreground',
              'focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground',
              'cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-destructive ring-1 ring-destructive'
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      )
    }

    return (
      <div className={cn('w-full', className)}>
        <div
          className={cn(
            'group relative flex min-h-14 w-full flex-col justify-center px-3.5 py-2',
            fieldChrome,
            error ? fieldChromeError : fieldChromeIdle,
            disabled && 'opacity-60'
          )}
        >
          <label
            htmlFor={selectId}
            className="text-xs font-medium text-muted-foreground select-none leading-none"
          >
            {label}
          </label>
          <div className="relative mt-1">
            <select
              ref={ref}
              id={selectId}
              disabled={disabled}
              className="w-full appearance-none border-0 bg-transparent p-0 pr-6 text-sm font-medium text-foreground focus:outline-none focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
              {...props}
            >
              {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        {hint && !error && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)

NativeSelect.displayName = 'NativeSelect'
