import { useEffect, useState } from 'react'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { EquipmentPage } from './EquipmentPage'
import { MaintenancePlansPage } from './MaintenancePlansPage'
import { WorkOrdersPage } from './WorkOrdersPage'

export type MaintenanceTab = 'equipment' | 'maintenance-plans' | 'work-orders'

const TABS = [
  { id: 'equipment', label: 'Equipment' },
  { id: 'maintenance-plans', label: 'Maintenance Plans' },
  { id: 'work-orders', label: 'Work Orders' },
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
    <div className="space-y-6">
      <div>
        <div className="pb-3">
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Maintenance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage equipment, maintenance schedules and repairs.
          </p>
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as MaintenanceTab)}
        />
      </div>

      <div>
        {activeTab === 'equipment' && <EquipmentPage />}
        {activeTab === 'maintenance-plans' && <MaintenancePlansPage />}
        {activeTab === 'work-orders' && <WorkOrdersPage />}
      </div>
    </div>
  )
}
