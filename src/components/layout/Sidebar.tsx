import {
  LayoutGrid,
  Database,
  ShoppingCart,
  Package,
  Factory,
  ShieldCheck,
  CircleDollarSign,
  Truck,
  Wrench,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import { NavItem } from './NavItem'
import { useAuth } from '../../hooks/useAuth'
import { useThemeMode } from '../../hooks/useThemeMode'
import { cn } from '../../lib/cn'

export interface SidebarProps {
  activeTab: string
  onTabChange: (tabId: string) => void
  onOpenCommandPalette?: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Supply & Production',
    items: [
      { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'manufacturing', label: 'Manufacturing', icon: Factory },
      { id: 'quality', label: 'Quality', icon: ShieldCheck },
    ],
  },
  {
    label: 'Revenue & Assets',
    items: [
      { id: 'sales', label: 'Sales', icon: CircleDollarSign },
      { id: 'dispatch', label: 'Dispatch', icon: Truck },
      { id: 'finance', label: 'Finance', icon: Wallet },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    label: 'Directory',
    items: [{ id: 'master-data', label: 'Master Data', icon: Database }],
  },
]

export function Sidebar({
  activeTab,
  onTabChange,
  onOpenCommandPalette,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const { user, organization, logout } = useAuth()
  const { isDark, toggle } = useThemeMode()

  const userInitial = user?.fullName
    ? user.fullName.trim().charAt(0).toUpperCase()
    : 'U'

  const handleSelect = (tabId: string) => {
    onTabChange(tabId)
    onMobileClose?.()
  }

  const content = (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-background p-4 select-none">
      {/* Compact Brand + Workspace Header */}
      <div className="flex items-center justify-between gap-2 px-1 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-deep text-brand-foreground text-xs font-bold">
            <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="block text-sm font-bold tracking-tight text-foreground leading-none">
              plaan
            </span>
            {organization && (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {organization.name}
              </span>
            )}
          </div>
        </div>

        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Cmd+K Quick Jump */}
      {onOpenCommandPalette && (
        <button
          type="button"
          onClick={() => {
            onMobileClose?.()
            onOpenCommandPalette()
          }}
          className="mb-3 flex h-9 w-full items-center justify-between rounded-md border border-border/80 bg-secondary px-2.5 text-xs text-muted-foreground hover:border-border hover:text-foreground transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Jump to...</span>
          </span>
          <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Grouped Navigation */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <p className="px-3 pb-1 text-section">{group.label}</p>
            {group.items.map((item) => (
              <NavItem
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                isActive={activeTab === item.id}
                onClick={() => handleSelect(item.id)}
              />
            ))}
          </div>
        ))}

        <div className="border-t border-border pt-2">
          <NavItem
            id="settings"
            label="Settings"
            icon={Settings}
            isActive={activeTab === 'settings'}
            onClick={() => handleSelect('settings')}
          />
        </div>
      </div>

      {/* Compact User & Actions Footer */}
      <div className="mt-3 border-t border-border pt-3 space-y-2.5">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-brand-foreground text-xs font-semibold">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {user?.fullName || 'User'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email || ''}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={toggle}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden lg:block h-screen shrink-0">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-[150] flex lg:hidden">
          <div
            className={cn('fixed inset-0 bg-ink/40')}
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  )
}
