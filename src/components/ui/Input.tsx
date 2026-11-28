import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useState,
} from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  fieldChrome,
  fieldChromeError,
  fieldChromeFocus,
  fieldChromeIdle,
} from './fieldStyles'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  rightElement?: ReactNode
  hint?: string
  /** Dense table-row control (h-9), label rendered outside if provided */
  dense?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      rightElement,
      hint,
      dense = false,
      type = 'text',
      onFocus,
      onBlur,
      value,
      defaultValue,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false)

    if (dense) {
      return (
        <div className="w-full">
          {label && (
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {label}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            onFocus={onFocus}
            onBlur={onBlur}
            className={cn(
              'flex h-9 w-full rounded-md border border-border/80 bg-secondary px-2.5 text-sm font-medium text-foreground',
              'placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground',
              'disabled:cursor-not-allowed disabled:opacity-60',
              error && 'border-destructive ring-1 ring-destructive',
              className
            )}
            {...props}
          />
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      )
    }

    // Stacked label — design-system default
    if (label) {
      return (
        <div className="w-full">
          <div
            className={cn(
              'group relative flex min-h-14 w-full flex-col justify-center px-3.5 py-2',
              fieldChrome,
              error
                ? fieldChromeError
                : isFocused
                  ? fieldChromeFocus
                  : fieldChromeIdle,
              disabled && 'opacity-60 cursor-not-allowed',
              className
            )}
          >
            <span className="text-xs font-medium text-muted-foreground select-none leading-none">
              {label}
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                ref={ref}
                type={type}
                value={value}
                defaultValue={defaultValue}
                disabled={disabled}
                onFocus={(e) => {
                  setIsFocused(true)
                  onFocus?.(e)
                }}
                onBlur={(e) => {
                  setIsFocused(false)
                  onBlur?.(e)
                }}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-0 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
                {...props}
              />
              {rightElement && (
                <div className="flex items-center shrink-0">{rightElement}</div>
              )}
            </div>
          </div>
          {hint && !error && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
          {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
        </div>
      )
    }

    return (
      <div className="w-full">
        <input
          type={type}
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          onFocus={onFocus}
          onBlur={onBlur}
          className={cn(
            'flex h-11 w-full px-3.5 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground/60',
            'focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground',
            'disabled:cursor-not-allowed disabled:opacity-60',
            fieldChrome,
            error ? fieldChromeError : fieldChromeIdle,
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** Standard toolbar search field (`h-10`, `text-sm`, clear button). */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: SearchInputProps) {
  return (
    <div className={cn('relative w-64 sm:w-72', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-border bg-card pl-9 pr-8 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
