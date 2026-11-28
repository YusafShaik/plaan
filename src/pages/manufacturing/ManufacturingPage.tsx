import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { BillOfMaterialsPage } from './BillOfMaterialsPage'
import { ProductionOrdersPage } from './ProductionOrdersPage'

export type ManufacturingTab = 'bom' | 'production-orders'

const TABS = [
  { id: 'bom', label: 'Bill of materials' },
  { id: 'production-orders', label: 'Production orders' },
]

export interface ManufacturingPageProps {
  initialSection?: string | null
  onInitialSectionConsumed?: () => void
}

export function ManufacturingPage({
  initialSection = null,
  onInitialSectionConsumed,
}: ManufacturingPageProps = {}) {
  const [activeTab, setActiveTab] = useState<ManufacturingTab>(() =>
    initialSection === 'production-orders' ? 'production-orders' : 'bom'
  )
  const [isBomModalOpen, setIsBomModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)

  useEffect(() => {
    if (initialSection !== 'production-orders' && initialSection !== 'bom') return
    const timer = setTimeout(() => {
      setActiveTab(initialSection)
      onInitialSectionConsumed?.()
    }, 0)
    return () => clearTimeout(timer)
  }, [initialSection, onInitialSectionConsumed])

  return (
    <ContentCanvas className="space-y-6 pt-1">
      <header className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Manufacturing
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              BOMs and production orders.
            </p>
          </div>

          {activeTab === 'bom' && (
            <Button variant="primary" size="sm" onClick={() => setIsBomModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create BOM
            </Button>
          )}
          {activeTab === 'production-orders' && (
            <Button variant="primary" size="sm" onClick={() => setIsOrderModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create production order
            </Button>
          )}
        </div>
        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as ManufacturingTab)}
        />
      </header>

      <div>
        {activeTab === 'bom' && (
          <BillOfMaterialsPage
            isModalOpen={isBomModalOpen}
            setIsModalOpen={setIsBomModalOpen}
          />
        )}
        {activeTab === 'production-orders' && (
          <ProductionOrdersPage
            isModalOpen={isOrderModalOpen}
            setIsModalOpen={setIsOrderModalOpen}
          />
        )}
      </div>
    </ContentCanvas>
  )
}
