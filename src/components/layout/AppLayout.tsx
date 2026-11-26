import { useEffect, useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
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
import type { PlaanNavigateDetail } from '../../lib/navigate'

export interface AppLayoutProps {
  children?: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [navReportId, setNavReportId] = useState<string | null>(null)
  const [navSection, setNavSection] = useState<string | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PlaanNavigateDetail>).detail
      if (!detail?.tab) return
      setActiveTab(detail.tab)
      setNavReportId(detail.reportId ?? null)
      setNavSection(detail.section ?? null)
    }
    window.addEventListener('plaan_navigate', handler)
    return () => window.removeEventListener('plaan_navigate', handler)
  }, [])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setNavReportId(null)
    setNavSection(null)
  }

  const clearNavHints = () => {
    setNavReportId(null)
    setNavSection(null)
  }

  const getPageTitle = (tab: string) => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      'master-data': 'Master Data',
      procurement: 'Procurement',
      inventory: 'Inventory',
      manufacturing: 'Manufacturing',
      quality: 'Quality',
      sales: 'Sales',
      dispatch: 'Dispatch',
      maintenance: 'Maintenance',
      finance: 'Finance',
      reports: 'Reports',
      settings: 'Settings',
    }
    return titles[tab] || 'Dashboard'
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-card/20">
        <section className="flex-1 px-8 py-6 w-full">
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
            <div className="rounded-md border border-border bg-card p-8 shadow-xs">
              <h2 className="text-lg font-semibold text-card-foreground">
                {getPageTitle(activeTab)} View
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                This module is ready for development. Feature screens will be added iteratively.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
