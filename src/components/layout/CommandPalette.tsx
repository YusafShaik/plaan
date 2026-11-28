import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Database,
  Factory,
  LayoutGrid,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wallet,
  Wrench,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { navigatePlaan } from '../../lib/navigate'
import { REPORTS } from '../../pages/reports/reportCatalog'
import { cn } from '../../lib/cn'

interface CommandItem {
  id: string
  group: 'Modules' | 'Reports'
  label: string
  hint?: string
  icon: ComponentType<{ className?: string }>
  action: () => void
}

const MODULE_COMMANDS: CommandItem[] = [
  { id: 'mod-dashboard', group: 'Modules', label: 'Dashboard', hint: 'Business overview', icon: LayoutGrid, action: () => navigatePlaan({ tab: 'dashboard' }) },
  { id: 'mod-procurement', group: 'Modules', label: 'Procurement', hint: 'Purchase orders & goods receipts', icon: ShoppingCart, action: () => navigatePlaan({ tab: 'procurement' }) },
  { id: 'mod-inventory', group: 'Modules', label: 'Inventory', hint: 'Stock overview, ledger & transfers', icon: Package, action: () => navigatePlaan({ tab: 'inventory' }) },
  { id: 'mod-manufacturing', group: 'Modules', label: 'Manufacturing', hint: 'BOMs & production orders', icon: Factory, action: () => navigatePlaan({ tab: 'manufacturing' }) },
  { id: 'mod-quality', group: 'Modules', label: 'Quality', hint: 'Templates & inspections', icon: ShieldCheck, action: () => navigatePlaan({ tab: 'quality' }) },
  { id: 'mod-sales', group: 'Modules', label: 'Sales', hint: 'Sales orders', icon: CircleDollarSign, action: () => navigatePlaan({ tab: 'sales' }) },
  { id: 'mod-dispatch', group: 'Modules', label: 'Dispatch', hint: 'Outbound shipments', icon: Truck, action: () => navigatePlaan({ tab: 'dispatch' }) },
  { id: 'mod-finance', group: 'Modules', label: 'Finance', hint: 'Invoices, payments, receipts & expenses', icon: Wallet, action: () => navigatePlaan({ tab: 'finance' }) },
  { id: 'mod-maintenance', group: 'Modules', label: 'Maintenance', hint: 'Equipment, plans & work orders', icon: Wrench, action: () => navigatePlaan({ tab: 'maintenance' }) },
  { id: 'mod-master-data', group: 'Modules', label: 'Master Data', hint: 'Items, suppliers, customers & warehouses', icon: Database, action: () => navigatePlaan({ tab: 'master-data' }) },
  { id: 'mod-reports', group: 'Modules', label: 'Reports', hint: 'Operational & financial reports', icon: BarChart3, action: () => navigatePlaan({ tab: 'reports' }) },
  { id: 'mod-settings', group: 'Modules', label: 'Settings', hint: 'Workspace & appearance', icon: Settings, action: () => navigatePlaan({ tab: 'settings' }) },
]

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

/** Global Cmd/Ctrl+K command palette for instant module & report navigation. */
export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allItems = useMemo<CommandItem[]>(() => {
    const reportItems: CommandItem[] = REPORTS.filter((r) => r.available).map((r) => ({
      id: `rep-${r.id}`,
      group: 'Reports',
      label: r.name,
      hint: r.description,
      icon: BarChart3,
      action: () => navigatePlaan({ tab: 'reports', reportId: r.id }),
    }))
    return [...MODULE_COMMANDS, ...reportItems]
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allItems.slice(0, 14)
    return allItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          (item.hint && item.hint.toLowerCase().includes(q)) ||
          item.group.toLowerCase().includes(q)
      )
      .slice(0, 16)
  }, [allItems, query])

  const grouped = useMemo(() => {
    const groups: Array<{ label: string; items: Array<{ item: CommandItem; idx: number }> }> = []
    filtered.forEach((item, idx) => {
      let grp = groups.find((g) => g.label === item.group)
      if (!grp) {
        grp = { label: item.group, items: [] }
        groups.push(grp)
      }
      grp.items.push({ item, idx })
    })
    return groups
  }, [filtered])

  useEffect(() => {
    if (!isOpen) return
    const frame = requestAnimationFrame(() => {
      setQuery('')
      setActiveIdx(0)
      inputRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [isOpen])

  const runItem = (item: CommandItem) => {
    item.action()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-[560px] p-0 overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIdx(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIdx((i) => Math.min(filtered.length - 1, i + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIdx((i) => Math.max(0, i - 1))
            } else if (e.key === 'Enter' && filtered[activeIdx]) {
              e.preventDefault()
              runItem(filtered[activeIdx])
            }
          }}
          placeholder="Jump to module or report..."
          className="h-7 w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <kbd className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
          ESC
        </kbd>
      </div>

      <div className="max-h-96 overflow-y-auto p-2 space-y-3">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            No matching modules or reports.
          </p>
        ) : (
          grouped.map((grp) => (
            <div key={grp.label}>
              <p className="px-2.5 pb-1 text-section">{grp.label}</p>
              <div className="space-y-0.5">
                {grp.items.map(({ item, idx }) => {
                  const Icon = item.icon
                  const active = idx === activeIdx
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => runItem(item)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors cursor-pointer',
                        active
                          ? 'bg-secondary text-foreground'
                          : 'text-foreground hover:bg-secondary/60'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="block text-sm font-medium leading-5">{item.label}</span>
                          {item.hint && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.hint}
                            </span>
                          )}
                        </div>
                      </div>
                      {active && <ArrowRight className="h-3.5 w-3.5 text-foreground shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-surface-subtle px-3.5 py-2 text-xs text-muted-foreground">
        <span>↑↓ Navigate · ↵ Open</span>
        <span>ESC Close</span>
      </div>
    </Modal>
  )
}
