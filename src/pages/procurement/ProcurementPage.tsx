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
  const [preselectedPoId, setPreselectedPoId] = useState<number | undefined>(undefined)

  const handleReceiveGoods = (poId: number) => {
    setPreselectedPoId(poId)
    setActiveTab('grn')
    setIsGrnModalOpen(true)
  }

  const handleGrnModalOpenChange = (open: boolean) => {
    setIsGrnModalOpen(open)
    if (!open) setPreselectedPoId(undefined)
  }

  return (
    <ContentCanvas className="space-y-6 pt-1">
      <header className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Procurement
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Orders, receipts, and inbound stock.
            </p>
          </div>

          {activeTab === 'orders' && (
            <Button variant="primary" size="sm" onClick={() => setIsPoModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create purchase order
            </Button>
          )}
          {activeTab === 'grn' && (
            <Button variant="primary" size="sm" onClick={() => setIsGrnModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create goods receipt
            </Button>
          )}
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => {
            setActiveTab(id as ProcurementTab)
            if (id !== 'grn') setPreselectedPoId(undefined)
          }}
        />
      </header>

      <div>
        {activeTab === 'orders' && (
          <PurchaseOrdersPage
            isModalOpen={isPoModalOpen}
            setIsModalOpen={setIsPoModalOpen}
            onReceiveGoods={handleReceiveGoods}
            showHeader={false}
          />
        )}
        {activeTab === 'grn' && (
          <GoodsReceiptsPage
            isModalOpen={isGrnModalOpen}
            setIsModalOpen={handleGrnModalOpenChange}
            preselectedPoId={preselectedPoId}
            showHeader={false}
          />
        )}
      </div>
    </ContentCanvas>
  )
}
