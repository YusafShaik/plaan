import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  width?: 'sm' | 'md' | 'lg'
}

const widthMap: Record<NonNullable<DrawerProps['width']>, string> = {
  sm: 'max-w-[480px]',
  md: 'max-w-[640px]',
  lg: 'max-w-[780px]',
}

/**
 * Ramp-style right slide-over drawer for inspecting and acting on records
 * without losing list context.
 */
export function Drawer({
  isOpen,
  onClose,
  children,
  className,
  width = 'lg',
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div
        className="fixed inset-0 bg-ink/35 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex h-full w-full flex-col border-l border-border bg-card text-foreground shadow-panel overflow-y-auto p-5 sm:p-6',
          widthMap[width],
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function DrawerCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer shrink-0"
      title="Close"
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </button>
  )
}
