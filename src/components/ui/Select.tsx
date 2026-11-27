import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  fieldChrome,
  fieldChromeError,
  fieldChromeFocus,
  fieldChromeIdle,
} from './fieldStyles'

export interface SelectOption {
  value: string | number
  label: string
}

export interface SelectProps {
  label?: string
  value?: string | number
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  actionButton?: ReactNode
  className?: string
  /** Dense table-row control (h-9) without stacked label chrome */
  dense?: boolean
  rightElement?: ReactNode
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select option...',
  disabled = false,
  error,
  actionButton,
  className,
  dense = false,
  rightElement,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(
    (opt) => String(opt.value) === String(value)
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const menu = isOpen && (
    <div
      className={cn(
        'absolute left-0 z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-md border border-border bg-card p-1 shadow-panel text-foreground',
        dense ? 'top-full min-w-[220px]' : 'top-full'
      )}
    >
      {options.length === 0 ? (
        <div className="p-3 text-center text-xs text-muted-foreground">
          No options available
        </div>
      ) : (
        options.map((opt) => {
          const isSelected = String(opt.value) === String(value)
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                onChange(String(opt.value))
                setIsOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer',
                isSelected
                  ? 'bg-secondary font-medium text-foreground'
                  : 'text-foreground hover:bg-secondary/70'
              )}
            >
              <span>{opt.label}</span>
              {isSelected && <Check className="h-4 w-4 text-brand shrink-0" />}
            </button>
          )
        })
      )}
      {actionButton && (
        <div className="border-t border-border mt-1 pt-1">{actionButton}</div>
      )}
    </div>
  )

  // Dense (table cell) variant
  if (dense || !label) {
    return (
      <div className={cn('relative w-full', className)} ref={containerRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            dense
              ? 'flex h-9 w-full items-center justify-between rounded-md border border-border/80 bg-secondary px-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              : cn(
                  'flex h-11 w-full items-center justify-between rounded-md border bg-secondary px-3.5 py-2 text-sm transition-all',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground cursor-pointer',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  error ? fieldChromeError : fieldChromeIdle,
                  isOpen && fieldChromeFocus
                ),
            selectedOption ? 'text-foreground' : 'text-muted-foreground/70'
          )}
        >
          <span className="truncate text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-150',
              isOpen && 'rotate-180'
            )}
          />
        </button>
        {menu}
        {error && !label && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    )
  }

  // Stacked label (design-system default for forms)
  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      <div
        className={cn(
          'group relative flex min-h-14 w-full flex-col justify-center px-3.5 py-2',
          fieldChrome,
          error
            ? fieldChromeError
            : isOpen
              ? fieldChromeFocus
              : fieldChromeIdle,
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground select-none leading-none">
            {label}
          </span>
          {rightElement}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="mt-1 flex w-full items-center justify-between border-0 bg-transparent p-0 text-left text-sm font-medium text-foreground focus:outline-none cursor-pointer disabled:cursor-not-allowed"
        >
          <span
            className={cn(
              'truncate',
              !selectedOption && 'text-muted-foreground/70 font-normal'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150',
              isOpen && 'rotate-180'
            )}
          />
        </button>
        {menu}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  )
}
