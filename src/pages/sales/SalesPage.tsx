import { useState } from 'react'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { SalesOrdersPage } from './SalesOrdersPage'

export type SalesTab = 'orders'

const TABS = [{ id: 'orders', label: 'Sales Orders' }]

export function SalesPage() {
  const [activeTab, setActiveTab] = useState<SalesTab>('orders')

  return (
    <ContentCanvas className="space-y-8 pt-2">
      <header className="space-y-5">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Sales
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Customer orders and fulfillment.
          </p>
        </div>
        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as SalesTab)}
        />
      </header>

      <div>{activeTab === 'orders' && <SalesOrdersPage />}</div>
    </ContentCanvas>
  )
}
