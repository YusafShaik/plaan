import { useEffect, useState, type ReactNode } from 'react'
import { Menu, Search } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useThemeMode } from '../../hooks/useThemeMode'
import { CommandPalette } from './CommandPalette'
import { ContentCanvas } from './ContentCanvas'
import { Button } from '../ui/Button'
import { DashboardPage } from '../../pages/dashboard/DashboardPage'
import { MasterDataPage } from '../../pages/master-data/MasterDataPage'
import { ProcurementPage } from '../../pages/procurement/ProcurementPage'
import { InventoryPage } from '../../pages/inventory/InventoryPage'
import { ManufacturingPage } from '../../pages/manufacturing/ManufacturingPage'
import { SalesPage } from '../../pages/sales/SalesPage'
import { DispatchPage } from '../../pages/dispatch/DispatchPage'
import { FinancePage } from '../../pages/finance/FinancePage'
import { QualityPage } from '../../pages/quality/QualityPage'
import { MaintenancePage } from '../../pages/maintenance/MaintenancePage'
import { ReportsPage } from '../../pages/reports/ReportsPage'
import { useAuth } from '../../hooks/useAuth'
import type { PlaanNavigateDetail } from '../../lib/navigate'

export interface AppLayoutProps {
  children?: ReactNode
}

const VALID_TABS = new Set([
  'dashboard',
  'master-data',
  'procurement',
  'inventory',
  'manufacturing',
  'quality',
  'sales',
  'dispatch',
  'maintenance',
  'finance',
  'reports',
  'settings',
])

function readHashRoute(): { tab: string; reportId: string | null; section: string | null } {
  const raw = window.location.hash.replace(/^#\/?/, '')
  if (!raw) return { tab: 'dashboard', reportId: null, section: null }
  const [pathPart, queryPart] = raw.split('?')
  const segments = pathPart.split('/').filter(Boolean)
  const tab = segments[0] && VALID_TABS.has(segments[0]) ? segments[0] : 'dashboard'
  const params = new URLSearchParams(queryPart || '')
  return {
    tab,
    reportId: tab === 'reports' ? segments[1] ?? params.get('reportId') : null,
    section: params.get('section'),
  }
}

function writeHashRoute(tab: string, reportId?: string | null, section?: string | null) {
  let next = `#/${tab}`
  if (tab === 'reports' && reportId) next += `/${reportId}`
  if (section) next += `?section=${encodeURIComponent(section)}`
  if (window.location.hash !== next) {
    window.history.pushState(null, '', next)
  }
}

function SettingsView() {
  const { user, organization } = useAuth()
  const { isDark, toggle } = useThemeMode()

  return (
    <ContentCanvas className="space-y-8 pt-2">
      <div>
        <h1 className="text-[26px] leading-8 font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
          Workspace details and interface preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4">
        <section className="rounded-md border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Workspace</h2>
          <dl className="divide-y divide-border/70 text-sm">
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">Organization</dt>
              <dd className="font-medium text-foreground">{organization?.name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">Base currency</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {organization?.baseCurrency || 'INR'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 pt-2.5">
              <dt className="text-muted-foreground">Signed in as</dt>
              <dd className="font-medium text-foreground">{user?.email || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-md border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Appearance &amp; shortcuts</h2>
          <div className="divide-y divide-border/70">
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-sm font-medium text-foreground">Theme</p>
                <p className="text-xs text-muted-foreground">
                  Currently using {isDark ? 'Dark' : 'Light'} mode
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={toggle}>
                Switch to {isDark ? 'Light' : 'Dark'}
              </Button>
            </div>
            <div className="pt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Quick jump across modules &amp; reports</span>
              <kbd className="rounded-md border border-border bg-secondary px-2 py-0.5 font-medium text-foreground">
                ⌘K / Ctrl+K
              </kbd>
            </div>
          </div>
        </section>
      </div>
    </ContentCanvas>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  const initial = readHashRoute()
  const [activeTab, setActiveTab] = useState<string>(initial.tab)
  const [navReportId, setNavReportId] = useState<string | null>(initial.reportId)
  const [navSection, setNavSection] = useState<string | null>(initial.section)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent<PlaanNavigateDetail>).detail
      if (!detail?.tab) return
      setActiveTab(detail.tab)
      setNavReportId(detail.reportId ?? null)
      setNavSection(detail.section ?? null)
      writeHashRoute(detail.tab, detail.reportId, detail.section)
    }
    const onPopOrHash = () => {
      const next = readHashRoute()
      setActiveTab(next.tab)
      setNavReportId(next.reportId)
      setNavSection(next.section)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsPaletteOpen((open) => !open)
      }
    }

    window.addEventListener('plaan_navigate', onNavigate)
    window.addEventListener('hashchange', onPopOrHash)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('plaan_navigate', onNavigate)
      window.removeEventListener('hashchange', onPopOrHash)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setNavReportId(null)
    setNavSection(null)
    writeHashRoute(tab)
  }

  const clearNavHints = () => {
    setNavReportId(null)
    setNavSection(null)
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenCommandPalette={() => setIsPaletteOpen(true)}
        mobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-surface-subtle dark:bg-background min-w-0">
        {/* Compact mobile bar */}
        <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5 lg:hidden sticky top-0 z-20">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground cursor-pointer"
          >
            <Menu className="h-4 w-4" />
            <span>Menu</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Jump (⌘K)</span>
          </button>
        </div>

        <section className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full">
          {children ? (
            children
          ) : activeTab === 'dashboard' ? (
            <DashboardPage />
          ) : activeTab === 'master-data' ? (
            <MasterDataPage />
          ) : activeTab === 'procurement' ? (
            <ProcurementPage />
          ) : activeTab === 'inventory' ? (
            <InventoryPage />
          ) : activeTab === 'manufacturing' ? (
            <ManufacturingPage
              initialSection={navSection}
              onInitialSectionConsumed={clearNavHints}
            />
          ) : activeTab === 'sales' ? (
            <SalesPage />
          ) : activeTab === 'dispatch' ? (
            <DispatchPage />
          ) : activeTab === 'finance' ? (
            <FinancePage
              initialSection={navSection}
              onInitialSectionConsumed={clearNavHints}
            />
          ) : activeTab === 'quality' ? (
            <QualityPage />
          ) : activeTab === 'maintenance' ? (
            <MaintenancePage
              initialSection={navSection}
              onInitialSectionConsumed={clearNavHints}
            />
          ) : activeTab === 'reports' ? (
            <ReportsPage
              initialReportId={navReportId}
              onInitialReportConsumed={clearNavHints}
            />
          ) : (
            <SettingsView />
          )}
        </section>
      </main>

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
      />
    </div>
  )
}
