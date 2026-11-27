import { Building2, Shield, Settings, LogOut, Pencil } from 'lucide-react'
import { NavItem } from './NavItem'
import { useAuth } from '../../hooks/useAuth'

export interface PlatformSidebarProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function PlatformSidebar({ activeTab, onTabChange }: PlatformSidebarProps) {
  const { user, logout } = useAuth()

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-border bg-background p-5 select-none">
      {/* 1. Brand Logo & Platform Badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-deep text-brand-foreground text-xs font-bold">
            <svg
              className="h-3 w-3 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            plaan
          </span>
        </div>

        <span className="inline-flex items-center rounded-md bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand uppercase tracking-wider">
          Platform
        </span>
      </div>

      {/* 2. Platform Profile Summary Card */}
      <div className="my-6 flex flex-col items-center text-center">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-deep text-brand-foreground text-2xl font-semibold shadow-sm">
            PA
          </div>
          <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs">
            <Pencil className="h-2.5 w-2.5" />
          </div>
        </div>

        <h3 className="mt-3 text-sm font-semibold tracking-tight text-foreground">
          {user?.fullName || 'Platform Administrator'}
        </h3>
        <p className="max-w-[220px] truncate text-xs text-muted-foreground">
          {user?.email || 'platform@plaan.io'}
        </p>

        <span className="mt-1.5 inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          Global Operator
        </span>
      </div>

      {/* 3. Platform Navigation Items */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        <NavItem
          id="organizations"
          label="Organizations"
          icon={Building2}
          isActive={activeTab === 'organizations'}
          onClick={() => onTabChange('organizations')}
        />

        <NavItem
          id="platform-security"
          label="Access & Roles"
          icon={Shield}
          isActive={activeTab === 'platform-security'}
          onClick={() => onTabChange('platform-security')}
        />

        <div className="my-2 border-t border-border" />

        <NavItem
          id="settings"
          label="Settings"
          icon={Settings}
          isActive={activeTab === 'settings'}
          onClick={() => onTabChange('settings')}
        />
      </div>

      {/* 4. Footer Actions & Legal Links */}
      <div className="pt-4 border-t border-border flex flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between px-1">
          <button
            type="button"
            className="rounded-full bg-secondary text-secondary-foreground hover:bg-muted px-4 py-1 text-xs font-medium transition-colors cursor-pointer"
          >
            Help
          </button>

          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>

        <nav aria-label="Footer links" className="flex items-center gap-4 text-xs text-muted-foreground">
          <a href="#terms" className="hover:text-foreground transition-colors">
            Terms
          </a>
          <a href="#privacy" className="hover:text-foreground transition-colors">
            Privacy
          </a>
          <a href="#cookies" className="hover:text-foreground transition-colors">
            Cookies
          </a>
        </nav>
      </div>
    </aside>
  )
}
