import { useState } from 'react'
import { StockOverviewPage } from './StockOverviewPage'
import { StockLedgerPage } from './StockLedgerPage'
import { StockTransfersPage } from './StockTransfersPage'
import { StockAdjustmentsPage } from './StockAdjustmentsPage'

export type InventoryTab = 'overview' | 'ledger' | 'transfers' | 'adjustments'

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('overview')

  return (
    <div className="space-y-4">
      {/* 1. Unified Inventory Header with Segmented Tabs: Stock Overview | Stock Ledger | Stock Transfers | Stock Adjustments */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3.5">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Inventory
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage and track inventory across warehouses.
            </p>
          </div>

          {/* Clean Segmented Tab Control: Stock Overview | Stock Ledger | Stock Transfers | Stock Adjustments */}
          <div className="flex items-center rounded-[8px] bg-secondary p-1 border border-border/80">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Stock Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Stock Ledger
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transfers')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'transfers'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Stock Transfers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('adjustments')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'adjustments'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Stock Adjustments
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main View: Stock Overview vs Stock Ledger vs Stock Transfers vs Stock Adjustments */}
      <div>
        {activeTab === 'overview' && <StockOverviewPage showHeader={false} />}
        {activeTab === 'ledger' && <StockLedgerPage />}
        {activeTab === 'transfers' && <StockTransfersPage />}
        {activeTab === 'adjustments' && <StockAdjustmentsPage />}
      </div>
    </div>
  )
}
