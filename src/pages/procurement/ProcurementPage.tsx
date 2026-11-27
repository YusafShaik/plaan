import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { PurchaseOrdersPage } from './PurchaseOrdersPage'
import { GoodsReceiptsPage } from './GoodsReceiptsPage'

export type ProcurementTab = 'orders' | 'grn'

const TABS = [
  { id: 'orders', label: 'Purchase orders' },
  { id: 'grn', label: 'Goods receipts (GRN)' },
]

export function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<ProcurementTab>('orders')
  const [isPoModalOpen, setIsPoModalOpen] = useState(false)
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false)

  return (
    <ContentCanvas className="space-y-8 pt-2">
      <header className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Procurement
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
              Orders, receipts, and inbound stock.
            </p>
          </div>

          {activeTab === 'orders' && (
            <Button variant="primary" onClick={() => setIsPoModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Create purchase order
            </Button>
          )}
          {activeTab === 'grn' && (
            <Button variant="primary" onClick={() => setIsGrnModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Create goods receipt
            </Button>
          )}
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as ProcurementTab)}
        />
      </header>

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
    </ContentCanvas>
  )
}
