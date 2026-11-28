import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
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
  /** Enable search filter inside menu (defaults to true when >6 options) */
  searchable?: boolean
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
  searchable,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const showSearch = searchable ?? options.length > 6

  const selectedOption = options.find(
    (opt) => String(opt.value) === String(value)
  )

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [options, query])

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

  useEffect(() => {
    if (!isOpen) return
    const frame = requestAnimationFrame(() => {
      setQuery('')
      setActiveIdx(0)
      if (showSearch) {
        searchInputRef.current?.focus()
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [isOpen, showSearch])

  const selectOption = (opt: SelectOption) => {
    onChange(String(opt.value))
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (!disabled) setIsOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(filteredOptions.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && filteredOptions[activeIdx]) {
      e.preventDefault()
      selectOption(filteredOptions[activeIdx])
    }
  }

  const menu = isOpen && (
    <div
      role="listbox"
      className={cn(
        'absolute left-0 z-50 mt-1.5 w-full rounded-md border border-border bg-card p-1 shadow-panel text-foreground',
        dense ? 'top-full min-w-[240px]' : 'top-full'
      )}
    >
      {showSearch && (
        <div className="relative p-1 pb-1.5 border-b border-border/70 mb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIdx(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Filter..."
            className="h-8 w-full rounded-md border border-border/80 bg-secondary pl-8 pr-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
          />
        </div>
      )}
      <div className="max-h-60 overflow-auto">
        {filteredOptions.length === 0 ? (
          <div className="p-3 text-center text-xs text-muted-foreground">
            No matching options
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value)
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => selectOption(opt)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-secondary font-medium text-foreground'
                    : idx === activeIdx
                      ? 'bg-secondary/70 text-foreground'
                      : 'text-foreground hover:bg-secondary/70'
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-4 w-4 text-brand shrink-0" />}
              </button>
            )
          })
        )}
      </div>
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
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          className={cn(
            dense
              ? 'flex h-9 w-full items-center justify-between rounded-md border border-border bg-card px-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              : cn(
                  'flex h-11 w-full items-center justify-between rounded-md border bg-card px-3.5 py-2 text-sm transition-all',
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
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
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
