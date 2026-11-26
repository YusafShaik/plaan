export type InspectionType = 'INCOMING' | 'FINISHED_GOODS'
export type InspectionTemplateStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

export interface InspectionTemplateParameter {
  id: number
  parameterName: string
  acceptanceCriteria: string
  sortOrder: number
}

export interface InspectionTemplate {
  id: number
  templateCode: string
  templateName: string
  itemId: number
  itemCode: string
  itemName: string
  inspectionType: InspectionType
  status: InspectionTemplateStatus
  notes?: string
  parametersCount: number
  parameters: InspectionTemplateParameter[]
  createdAt: string
  updatedAt: string
}

export interface InspectionTemplateParameterPayload {
  parameterName: string
  acceptanceCriteria: string
}

export interface CreateInspectionTemplatePayload {
  templateCode?: string
  templateName: string
  itemId: number
  inspectionType: InspectionType
  notes?: string
  activate?: boolean
  parameters: InspectionTemplateParameterPayload[]
}

export interface UpdateInspectionTemplatePayload {
  templateName: string
  itemId: number
  inspectionType: InspectionType
  notes?: string
  activate?: boolean
  parameters: InspectionTemplateParameterPayload[]
}

export interface InspectionTemplateFilterParams {
  search?: string
  status?: InspectionTemplateStatus
  inspectionType?: InspectionType
  page?: number
  size?: number
}

export type IncomingInspectionStatus = 'PENDING' | 'DRAFT' | 'COMPLETED'
export type InspectionParameterResult = 'PASS' | 'FAIL'

export interface IncomingInspectionParameter {
  id: number
  parameterName: string
  acceptanceCriteria: string
  result: InspectionParameterResult | null
  sortOrder: number
}

export interface IncomingInspection {
  id: number
  inspectionNumber: string
  goodsReceiptId: number
  grnNumber: string
  goodsReceiptItemId: number
  supplierId: number
  supplierCode: string
  supplierName: string
  itemId: number
  itemCode: string
  itemName: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  receivedQuantity: number
  unitOfMeasure: string
  templateId: number | null
  templateCode: string | null
  templateName: string | null
  inspectionDate: string | null
  acceptedQuantity: number | null
  rejectedQuantity: number | null
  remarks: string | null
  inspectedById: number | null
  inspectedByName: string | null
  status: IncomingInspectionStatus
  parameters: IncomingInspectionParameter[]
  createdAt: string
  updatedAt: string
}

export interface IncomingInspectionParameterResultPayload {
  parameterId: number
  result: InspectionParameterResult | null
}

export interface UpdateIncomingInspectionPayload {
  inspectionDate?: string | null
  acceptedQuantity?: number | null
  remarks?: string | null
  complete?: boolean
  parameterResults?: IncomingInspectionParameterResultPayload[]
}

export interface IncomingInspectionFilterParams {
  search?: string
  status?: IncomingInspectionStatus
  page?: number
  size?: number
}

export type FinishedGoodsInspectionStatus = 'PENDING' | 'DRAFT' | 'COMPLETED'

export interface FinishedGoodsInspectionParameter {
  id: number
  parameterName: string
  acceptanceCriteria: string
  result: InspectionParameterResult | null
  sortOrder: number
}

export interface FinishedGoodsInspection {
  id: number
  inspectionNumber: string
  productionOrderId: number
  productionOrderNumber: string
  productionReceiptId: number
  productionReceiptNumber: string
  itemId: number
  itemCode: string
  itemName: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  receivedQuantity: number
  unitOfMeasure: string
  templateId: number | null
  templateCode: string | null
  templateName: string | null
  inspectionDate: string | null
  acceptedQuantity: number | null
  rejectedQuantity: number | null
  remarks: string | null
  inspectedById: number | null
  inspectedByName: string | null
  status: FinishedGoodsInspectionStatus
  parameters: FinishedGoodsInspectionParameter[]
  createdAt: string
  updatedAt: string
}

export interface UpdateFinishedGoodsInspectionPayload {
  inspectionDate?: string | null
  acceptedQuantity?: number | null
  remarks?: string | null
  complete?: boolean
  parameterResults?: IncomingInspectionParameterResultPayload[]
}

export interface FinishedGoodsInspectionFilterParams {
  search?: string
  status?: FinishedGoodsInspectionStatus
  page?: number
  size?: number
}
