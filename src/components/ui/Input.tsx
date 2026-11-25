import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useState,
} from 'react'
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
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
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
              'flex h-9 w-full rounded-md border border-border/80 bg-secondary px-2.5 text-xs font-medium text-foreground',
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
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
                {label}
              </span>
              {rightElement && (
                <div className="flex items-center ml-2">{rightElement}</div>
              )}
            </div>
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
              className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-0 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
              {...props}
            />
          </div>
          {hint && !error && (
            <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
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
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        )}
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
