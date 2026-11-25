import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { PurchaseOrdersPage } from './PurchaseOrdersPage'
import { GoodsReceiptsPage } from './GoodsReceiptsPage'

export type ProcurementTab = 'orders' | 'grn'

export function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<ProcurementTab>('orders')
  const [isPoModalOpen, setIsPoModalOpen] = useState(false)
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* 1. Unified Procurement Header with Segmented Navigation Tabs and Single Primary CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3.5">
        <div className="flex items-center gap-4">
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Procurement
          </h1>

          {/* Clean Segmented Tab Control: Purchase orders | Goods receipts (GRN) */}
          <div className="flex items-center rounded-[8px] bg-secondary p-1 border border-border/80">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Purchase orders
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grn')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'grn'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Goods receipts (GRN)
            </button>
          </div>
        </div>

        {/* Primary CTA Action Button */}
        {activeTab === 'orders' && (
          <Button
            onClick={() => setIsPoModalOpen(true)}
            className="gap-2 bg-[#171717] text-white hover:opacity-90 font-medium px-4 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create purchase order</span>
          </Button>
        )}
        {activeTab === 'grn' && (
          <Button
            onClick={() => setIsGrnModalOpen(true)}
            className="gap-2 bg-[#171717] text-white hover:opacity-90 font-medium px-4 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create goods receipt</span>
          </Button>
        )}
      </div>

      {/* 2. Main View: Purchase Orders vs Goods Receipts */}
      <div>
        {activeTab === 'orders' && (
          <PurchaseOrdersPage
            isModalOpen={isPoModalOpen}
            setIsModalOpen={setIsPoModalOpen}
            showHeader={false}
          />
        )}
        {activeTab === 'grn' && (
          <GoodsReceiptsPage
            isModalOpen={isGrnModalOpen}
            setIsModalOpen={setIsGrnModalOpen}
            showHeader={false}
          />
        )}
      </div>
    </div>
  )
}
