import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
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
  { id: 'inspection-templates', label: 'Inspection templates' },
  { id: 'incoming-inspections', label: 'Incoming inspections' },
  { id: 'finished-goods-inspections', label: 'Finished goods inspections' },
]

export function QualityPage() {
  const [activeTab, setActiveTab] = useState<QualityTab>('inspection-templates')
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)

  return (
    <ContentCanvas className="space-y-6 pt-2">
      <header className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Quality
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
              Templates and inspections.
            </p>
          </div>
          {activeTab === 'inspection-templates' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTemplateModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New template
            </Button>
          )}
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as QualityTab)}
        />
      </header>

      <div>
        {activeTab === 'inspection-templates' && (
          <InspectionTemplatesPage
            isModalOpen={isTemplateModalOpen}
            setIsModalOpen={setIsTemplateModalOpen}
          />
        )}
        {activeTab === 'incoming-inspections' && <IncomingInspectionsPage />}
        {activeTab === 'finished-goods-inspections' && <FinishedGoodsInspectionsPage />}
      </div>
    </ContentCanvas>
  )
}
