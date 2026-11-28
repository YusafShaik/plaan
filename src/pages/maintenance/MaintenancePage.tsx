import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { EquipmentPage } from './EquipmentPage'
import { MaintenancePlansPage } from './MaintenancePlansPage'
import { WorkOrdersPage } from './WorkOrdersPage'

export type MaintenanceTab = 'equipment' | 'maintenance-plans' | 'work-orders'

const TABS = [
  { id: 'equipment', label: 'Equipment' },
  { id: 'maintenance-plans', label: 'Maintenance plans' },
  { id: 'work-orders', label: 'Work orders' },
]

export interface MaintenancePageProps {
  initialSection?: string | null
  onInitialSectionConsumed?: () => void
}

export function MaintenancePage({
  initialSection = null,
  onInitialSectionConsumed,
}: MaintenancePageProps = {}) {
  const [activeTab, setActiveTab] = useState<MaintenanceTab>('equipment')
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(false)
  const [isPlanOpen, setIsPlanOpen] = useState(false)
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false)

  useEffect(() => {
    if (
      initialSection !== 'equipment' &&
      initialSection !== 'maintenance-plans' &&
      initialSection !== 'work-orders'
    ) {
      return
    }
    setActiveTab(initialSection)
    onInitialSectionConsumed?.()
  }, [initialSection, onInitialSectionConsumed])

  return (
    <ContentCanvas className="space-y-8 pt-2">
      <header className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Maintenance
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
              Equipment, plans, and work orders.
            </p>
          </div>
          {activeTab === 'equipment' && (
            <Button variant="primary" onClick={() => setIsEquipmentOpen(true)}>
              <Plus className="h-4 w-4" />
              New equipment
            </Button>
          )}
          {activeTab === 'maintenance-plans' && (
            <Button variant="primary" onClick={() => setIsPlanOpen(true)}>
              <Plus className="h-4 w-4" />
              New plan
            </Button>
          )}
          {activeTab === 'work-orders' && (
            <Button variant="primary" onClick={() => setIsWorkOrderOpen(true)}>
              <Plus className="h-4 w-4" />
              New work order
            </Button>
          )}
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as MaintenanceTab)}
        />
      </header>

      <div>
        {activeTab === 'equipment' && (
          <EquipmentPage
            isModalOpen={isEquipmentOpen}
            setIsModalOpen={setIsEquipmentOpen}
          />
        )}
        {activeTab === 'maintenance-plans' && (
          <MaintenancePlansPage
            isModalOpen={isPlanOpen}
            setIsModalOpen={setIsPlanOpen}
          />
        )}
        {activeTab === 'work-orders' && (
          <WorkOrdersPage
            isModalOpen={isWorkOrderOpen}
            setIsModalOpen={setIsWorkOrderOpen}
          />
        )}
      </div>
    </ContentCanvas>
  )
}
