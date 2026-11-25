import type { ComponentType } from 'react'
import { cn } from '../../lib/cn'

export interface NavItemProps {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  isActive: boolean
  onClick: () => void
}

export function NavItem({
  label,
  icon: Icon,
  isActive,
  onClick,
}: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3.5 rounded-md px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer text-left',
        isActive
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
      )}
    >
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors',
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      <span className="truncate">{label}</span>
    </button>
  )
}
