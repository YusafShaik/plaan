import { formatQuantity } from '../../lib/format'
import { qualityService } from '../../services/qualityService'
import { InspectionWorkbenchDrawer } from './InspectionWorkbenchDrawer'
import type { IncomingInspection } from '../../types/quality'

export interface IncomingInspectionFormProps {
  isOpen: boolean
  inspectionId: number | null
  onClose: () => void
  onCompleted: () => void
}

export function IncomingInspectionForm(props: IncomingInspectionFormProps) {
  return (
    <InspectionWorkbenchDrawer<IncomingInspection>
      {...props}
      title="Incoming quality inspection"
      fetchById={qualityService.getIncomingInspectionById}
      saveDraft={qualityService.updateIncomingInspection}
      completeInspection={qualityService.completeIncomingInspection}
      getMetaItems={(record) => [
        { label: 'Goods receipt', value: record.grnNumber, mono: true },
        { label: 'Supplier', value: record.supplierName },
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
