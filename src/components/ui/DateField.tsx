import { type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import {
  fieldChrome,
  fieldChromeError,
  fieldChromeIdle,
} from './fieldStyles'

export interface DateFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
}

/** Stacked date input matching Input / Select chrome */
export function DateField({
  label,
  error,
  className,
  disabled,
  ...props
}: DateFieldProps) {
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
        <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
          {label}
        </span>
        <input
          type="date"
          disabled={disabled}
          className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground focus:outline-none focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  )
}
