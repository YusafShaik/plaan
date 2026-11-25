import { useState } from 'react'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { StockOverviewPage } from './StockOverviewPage'
import { StockLedgerPage } from './StockLedgerPage'
import { StockTransfersPage } from './StockTransfersPage'
import { StockAdjustmentsPage } from './StockAdjustmentsPage'

export type InventoryTab = 'overview' | 'ledger' | 'transfers' | 'adjustments'

const TABS = [
  { id: 'overview', label: 'Stock Overview' },
  { id: 'ledger', label: 'Stock Ledger' },
  { id: 'transfers', label: 'Stock Transfers' },
  { id: 'adjustments', label: 'Stock Adjustments' },
]

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('overview')

  return (
    <div className="space-y-4">
      <div>
        <div className="pb-3">
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track inventory across warehouses.
          </p>
        </div>
        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as InventoryTab)}
        />
      </div>

      <div>
        {activeTab === 'overview' && <StockOverviewPage showHeader={false} />}
        {activeTab === 'ledger' && <StockLedgerPage />}
        {activeTab === 'transfers' && <StockTransfersPage />}
        {activeTab === 'adjustments' && <StockAdjustmentsPage />}
      </div>
    </div>
  )
}
