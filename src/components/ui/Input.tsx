import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useState,
} from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  rightElement?: ReactNode
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      rightElement,
      hint,
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

    // Stacked/embedded label inside grayish box matching reference
    if (label) {
      return (
        <div className="w-full">
          <div
            className={`group relative flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border bg-secondary px-3.5 py-2 transition-all duration-150 focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground ${
              error
                ? 'border-destructive ring-1 ring-destructive'
                : isFocused
                ? 'border-foreground ring-1 ring-foreground'
                : 'border-border/80 hover:border-border'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
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
          {hint && !error && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
          {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
        </div>
      )
    }

    // Standard unstacked input with sharp black focus ring
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
          className={`flex h-11 w-full rounded-[10px] border bg-secondary px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
            error
              ? 'border-destructive ring-1 ring-destructive'
              : 'border-border/80 hover:border-border'
          } ${className}`}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
