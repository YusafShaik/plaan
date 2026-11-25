import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react'

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
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => String(opt.value) === String(value))

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-foreground mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`flex h-11 w-full items-center justify-between rounded-[10px] border bg-secondary px-3.5 py-2 text-sm text-foreground transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? 'border-destructive ring-1 ring-destructive' : 'border-border/80 hover:border-border'
          } ${isOpen ? 'ring-1 ring-foreground border-foreground' : ''}`}
        >
          <span className={selectedOption ? 'text-foreground font-medium' : 'text-muted-foreground/70'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-[10px] border border-border bg-white p-1 shadow-panel text-foreground">
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
                    className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-secondary font-medium text-foreground'
                        : 'text-foreground hover:bg-secondary/70'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-accent" />}
                  </button>
                )
              })
            )}

            {actionButton && (
              <div className="border-t border-border mt-1 pt-1">
                {actionButton}
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
