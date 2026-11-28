import { Building2, Settings, LogOut, Moon, Sun } from 'lucide-react'
import { NavItem } from './NavItem'
import { useThemeMode } from '../../hooks/useThemeMode'
import { useAuth } from '../../hooks/useAuth'

export interface PlatformSidebarProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function PlatformSidebar({ activeTab, onTabChange }: PlatformSidebarProps) {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useThemeMode()

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-background p-4 select-none">
      {/* Brand Logo & Platform Badge */}
      <div className="flex items-center justify-between px-1 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-deep text-brand-foreground text-xs font-bold">
            <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">plaan</span>
        </div>

        <span className="inline-flex items-center rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand uppercase tracking-wider">
          Platform
        </span>
      </div>

      {/* Platform Navigation */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <p className="px-3 pb-1 text-section">Administration</p>
        <NavItem
          id="organizations"
          label="Organizations"
          icon={Building2}
          isActive={activeTab === 'organizations'}
          onClick={() => onTabChange('organizations')}
        />
        <NavItem
          id="settings"
          label="Settings"
          icon={Settings}
          isActive={activeTab === 'settings'}
          onClick={() => onTabChange('settings')}
        />
      </div>

      {/* Compact Operator Footer */}
      <div className="mt-3 border-t border-border pt-3 space-y-2.5">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-brand-foreground text-xs font-semibold">
            PA
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {user?.fullName || 'Platform Admin'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email || 'platform@plaan.io'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={toggle}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
