import { useEffect, useState } from 'react'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { BillOfMaterialsPage } from './BillOfMaterialsPage'
import { ProductionOrdersPage } from './ProductionOrdersPage'

export type ManufacturingTab = 'bom' | 'production-orders'

const TABS = [
  { id: 'bom', label: 'Bill of Materials' },
  { id: 'production-orders', label: 'Production Orders' },
]

export interface ManufacturingPageProps {
  initialSection?: string | null
  onInitialSectionConsumed?: () => void
}

export function ManufacturingPage({
  initialSection = null,
  onInitialSectionConsumed,
}: ManufacturingPageProps = {}) {
  const [activeTab, setActiveTab] = useState<ManufacturingTab>('bom')

  useEffect(() => {
    if (initialSection !== 'production-orders' && initialSection !== 'bom') return
    setActiveTab(initialSection)
    onInitialSectionConsumed?.()
  }, [initialSection, onInitialSectionConsumed])

  return (
    <ContentCanvas className="space-y-8 pt-2">
      <header className="space-y-5">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Manufacturing
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            BOMs and production orders.
          </p>
        </div>
        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as ManufacturingTab)}
        />
      </header>

      <div>
        {activeTab === 'bom' && <BillOfMaterialsPage />}
        {activeTab === 'production-orders' && <ProductionOrdersPage />}
      </div>
    </ContentCanvas>
  )
}
