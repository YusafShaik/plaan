import { useState } from 'react'
import { BillOfMaterialsPage } from './BillOfMaterialsPage'
import { ProductionOrdersPage } from './ProductionOrdersPage'

export type ManufacturingTab = 'bom' | 'production-orders'

export function ManufacturingPage() {
  const [activeTab, setActiveTab] = useState<ManufacturingTab>('bom')

  return (
    <div className="space-y-4">
      {/* 1. Header with Segmented Tabs: Bill of Materials | Production Orders */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3.5">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Manufacturing
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage product definitions and production activities.
            </p>
          </div>

          {/* Segmented Tab Control */}
          <div className="flex items-center rounded-[8px] bg-secondary p-1 border border-border/80">
            <button
              type="button"
              onClick={() => setActiveTab('bom')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'bom'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bill of Materials
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('production-orders')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'production-orders'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Production Orders
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main View */}
      <div>
        {activeTab === 'bom' && <BillOfMaterialsPage />}
        {activeTab === 'production-orders' && <ProductionOrdersPage />}
      </div>
    </div>
  )
}
