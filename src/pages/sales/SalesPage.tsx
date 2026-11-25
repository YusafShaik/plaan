import { useState } from 'react'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { SalesOrdersPage } from './SalesOrdersPage'

export type SalesTab = 'orders'

const TABS = [{ id: 'orders', label: 'Sales Orders' }]

export function SalesPage() {
  const [activeTab, setActiveTab] = useState<SalesTab>('orders')

  return (
    <div className="space-y-4">
      <div>
        <div className="pb-3">
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Sales
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage customer orders and fulfillment.
          </p>
        </div>
        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as SalesTab)}
        />
      </div>

      <div>{activeTab === 'orders' && <SalesOrdersPage />}</div>
    </div>
  )
}
