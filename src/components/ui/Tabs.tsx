import { cn } from '../../lib/cn'

export interface TabItem {
  id: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

/**
 * Underline tabs (Mercury-style) — default module navigation.
 * Active: ink text + 2px underline flush to the hairline divider.
 * Indicator width matches the label text exactly (no button padding).
 */
export function UnderlineTabs({
  items,
  value,
  onChange,
  className,
}: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-6 border-b border-border',
        className
      )}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative -mb-px inline-flex flex-col items-stretch px-0 pb-3 pt-0',
              'bg-transparent border-0 text-sm font-medium transition-colors cursor-pointer',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>{item.label}</span>
            <span
              aria-hidden
              className={cn(
                'mt-3 h-0.5 w-full',
                active ? 'bg-foreground' : 'bg-transparent'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

/**
 * @deprecated Prefer UnderlineTabs. Kept as alias so existing imports keep working.
 */
export function SegmentedTabs(props: TabsProps) {
  return <UnderlineTabs {...props} />
}
