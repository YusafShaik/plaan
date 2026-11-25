import { useState } from 'react'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { BillOfMaterialsPage } from './BillOfMaterialsPage'
import { ProductionOrdersPage } from './ProductionOrdersPage'

export type ManufacturingTab = 'bom' | 'production-orders'

const TABS = [
  { id: 'bom', label: 'Bill of Materials' },
  { id: 'production-orders', label: 'Production Orders' },
]

export function ManufacturingPage() {
  const [activeTab, setActiveTab] = useState<ManufacturingTab>('bom')

  return (
    <div className="space-y-4">
      <div>
        <div className="pb-3">
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Manufacturing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage product definitions and production activities.
          </p>
        </div>
        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as ManufacturingTab)}
        />
      </div>

      <div>
        {activeTab === 'bom' && <BillOfMaterialsPage />}
        {activeTab === 'production-orders' && <ProductionOrdersPage />}
      </div>
    </div>
  )
}
