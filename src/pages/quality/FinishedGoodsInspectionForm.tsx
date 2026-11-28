import { formatQuantity } from '../../lib/format'
import { qualityService } from '../../services/qualityService'
import { InspectionWorkbenchDrawer } from './InspectionWorkbenchDrawer'
import type { FinishedGoodsInspection } from '../../types/quality'

export interface FinishedGoodsInspectionFormProps {
  isOpen: boolean
  inspectionId: number | null
  onClose: () => void
  onCompleted: () => void
}

export function FinishedGoodsInspectionForm(props: FinishedGoodsInspectionFormProps) {
  return (
    <InspectionWorkbenchDrawer<FinishedGoodsInspection>
      {...props}
      title="Finished goods inspection"
      fetchById={qualityService.getFinishedGoodsInspectionById}
      saveDraft={qualityService.updateFinishedGoodsInspection}
      completeInspection={qualityService.completeFinishedGoodsInspection}
      getMetaItems={(record) => [
        { label: 'Production receipt', value: record.productionReceiptNumber, mono: true },
        { label: 'Production order', value: record.productionOrderNumber, mono: true },
        { label: 'Item', value: record.itemName },
        { label: 'Warehouse', value: record.warehouseName },
        {
          label: 'Received quantity',
          value: `${formatQuantity(record.receivedQuantity)} ${record.unitOfMeasure}`,
          mono: true,
        },
        {
          label: 'Template',
          value: record.templateCode ? `${record.templateCode}` : '—',
          mono: true,
        },
      ]}
    />
  )
}
