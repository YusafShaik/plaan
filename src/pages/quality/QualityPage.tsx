import { useState } from 'react'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
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
    <ContentCanvas className="space-y-8 pt-2">
      <header className="space-y-5">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Quality
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Templates and inspections.
          </p>
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as QualityTab)}
        />
      </header>

      <div>
        {activeTab === 'inspection-templates' && <InspectionTemplatesPage />}
        {activeTab === 'incoming-inspections' && <IncomingInspectionsPage />}
        {activeTab === 'finished-goods-inspections' && (
          <FinishedGoodsInspectionsPage />
        )}
      </div>
    </ContentCanvas>
  )
}
