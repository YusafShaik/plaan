import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { StockOverviewPage } from './StockOverviewPage'
import { StockLedgerPage } from './StockLedgerPage'
import { StockTransfersPage } from './StockTransfersPage'
import { StockAdjustmentsPage } from './StockAdjustmentsPage'

export type InventoryTab = 'overview' | 'ledger' | 'transfers' | 'adjustments'

const TABS = [
  { id: 'overview', label: 'Stock overview' },
  { id: 'ledger', label: 'Stock ledger' },
  { id: 'transfers', label: 'Stock transfers' },
  { id: 'adjustments', label: 'Stock adjustments' },
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
  const [initialFocus] = useState<InventoryFocus | null>(() => readFocus())
  const [activeTab, setActiveTab] = useState<InventoryTab>(() => {
    if (!initialFocus) return 'overview'
    if (initialFocus.tab === 'ledger' || initialFocus.itemId) return 'ledger'
    if (initialFocus.tab === 'transfers' || initialFocus.tab === 'adjustments') {
      return initialFocus.tab
    }
    return 'overview'
  })
  const [ledgerItemId, setLedgerItemId] = useState<number | null>(
    () => initialFocus?.itemId ?? null
  )
  const [ledgerWarehouseId, setLedgerWarehouseId] = useState<number | null>(
    () => initialFocus?.warehouseId ?? null
  )
  const [isOpeningStockOpen, setIsOpeningStockOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)

  const handleInspectLedger = (itemId: number, warehouseId: number) => {
    setLedgerItemId(itemId)
    setLedgerWarehouseId(warehouseId)
    setActiveTab('ledger')
  }

  return (
    <ContentCanvas className="space-y-6 pt-1">
      <header className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Inventory
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Stock across warehouses.
            </p>
          </div>

          {activeTab === 'overview' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsOpeningStockOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Opening stock
            </Button>
          )}
          {activeTab === 'transfers' && (
            <Button variant="primary" size="sm" onClick={() => setIsTransferOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              New transfer
            </Button>
          )}
          {activeTab === 'adjustments' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdjustmentOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New adjustment
            </Button>
          )}
        </div>
        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as InventoryTab)}
        />
      </header>

      <div>
        {activeTab === 'overview' && (
          <StockOverviewPage
            showHeader={false}
            isModalOpen={isOpeningStockOpen}
            setIsModalOpen={setIsOpeningStockOpen}
            onInspectLedger={handleInspectLedger}
          />
        )}
        {activeTab === 'ledger' && (
          <StockLedgerPage
            initialItemId={ledgerItemId}
            initialWarehouseId={ledgerWarehouseId}
          />
        )}
        {activeTab === 'transfers' && (
          <StockTransfersPage
            isModalOpen={isTransferOpen}
            setIsModalOpen={setIsTransferOpen}
          />
        )}
        {activeTab === 'adjustments' && (
          <StockAdjustmentsPage
            isModalOpen={isAdjustmentOpen}
            setIsModalOpen={setIsAdjustmentOpen}
          />
        )}
      </div>
    </ContentCanvas>
  )
}
