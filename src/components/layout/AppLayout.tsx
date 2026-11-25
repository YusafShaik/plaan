import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MasterDataPage } from '../../pages/master-data/MasterDataPage'
import { ProcurementPage } from '../../pages/procurement/ProcurementPage'
import { InventoryPage } from '../../pages/inventory/InventoryPage'
import { ManufacturingPage } from '../../pages/manufacturing/ManufacturingPage'
import { SalesPage } from '../../pages/sales/SalesPage'
import { DispatchPage } from '../../pages/dispatch/DispatchPage'

export interface AppLayoutProps {
  children?: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [activeTab, setActiveTab] = useState<string>('master-data')

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
      {/* Side Navigation Bar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-card/20">
        <section className="flex-1 px-8 py-6 w-full">
          {children ? (
            children
          ) : activeTab === 'master-data' ? (
            <MasterDataPage />
          ) : activeTab === 'procurement' ? (
            <ProcurementPage />
          ) : activeTab === 'inventory' ? (
            <InventoryPage />
          ) : activeTab === 'manufacturing' ? (
            <ManufacturingPage />
          ) : activeTab === 'sales' ? (
            <SalesPage />
          ) : activeTab === 'dispatch' ? (
            <DispatchPage />
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
