import { useEffect, useState } from 'react'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
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

interface InventoryFocus {
  tab?: InventoryTab
  itemId?: number
  warehouseId?: number
}

function readFocus(): InventoryFocus | null {
  try {
    const raw = sessionStorage.getItem('plaan_inventory_focus')
    if (!raw) return null
    sessionStorage.removeItem('plaan_inventory_focus')
    return JSON.parse(raw) as InventoryFocus
  } catch {
    return null
  }
}

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('overview')
  const [ledgerItemId, setLedgerItemId] = useState<number | null>(null)
  const [ledgerWarehouseId, setLedgerWarehouseId] = useState<number | null>(null)

  useEffect(() => {
    const focus = readFocus()
    if (!focus) return
    if (focus.tab === 'ledger' || focus.itemId) {
      setActiveTab('ledger')
      setLedgerItemId(focus.itemId ?? null)
      setLedgerWarehouseId(focus.warehouseId ?? null)
    }
  }, [])

  return (
    <ContentCanvas className="space-y-8 pt-2">
      <header className="space-y-5">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Inventory
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Stock across warehouses.
          </p>
        </div>
        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as InventoryTab)}
        />
      </header>

      <div>
        {activeTab === 'overview' && <StockOverviewPage showHeader={false} />}
        {activeTab === 'ledger' && (
          <StockLedgerPage
            initialItemId={ledgerItemId}
            initialWarehouseId={ledgerWarehouseId}
          />
        )}
        {activeTab === 'transfers' && <StockTransfersPage />}
        {activeTab === 'adjustments' && <StockAdjustmentsPage />}
      </div>
    </ContentCanvas>
  )
}
