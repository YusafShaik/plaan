import { useState } from 'react'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { InspectionTemplatesPage } from './InspectionTemplatesPage'
import { IncomingInspectionsPage } from './IncomingInspectionsPage'
import { FinishedGoodsInspectionsPage } from './FinishedGoodsInspectionsPage'

export type QualityTab =
  | 'inspection-templates'
  | 'incoming-inspections'
  | 'finished-goods-inspections'

const TABS = [
  { id: 'inspection-templates', label: 'Inspection Templates' },
  { id: 'incoming-inspections', label: 'Incoming Inspections' },
  { id: 'finished-goods-inspections', label: 'Finished Goods Inspections' },
]

export function QualityPage() {
  const [activeTab, setActiveTab] = useState<QualityTab>('inspection-templates')

  return (
    <div className="space-y-6">
      <div>
        <div className="pb-3">
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Quality
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage quality standards and inspections.
          </p>
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as QualityTab)}
        />
      </div>

      <div>
        {activeTab === 'inspection-templates' && <InspectionTemplatesPage />}
        {activeTab === 'incoming-inspections' && <IncomingInspectionsPage />}
        {activeTab === 'finished-goods-inspections' && <FinishedGoodsInspectionsPage />}
      </div>
    </div>
  )
}
