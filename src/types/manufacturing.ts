// Bill of Materials (BOM) & Manufacturing Types

export type BomStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

export interface BomItem {
  id: number
  materialId: number
  materialCode: string
  materialName: string
  quantity: number
  unitOfMeasure: string
  notes?: string | null
}

export interface Bom {
  id: number
  bomCode: string
  productId: number
  productCode: string
  productName: string
  outputQuantity: number
  unitOfMeasure: string
  notes?: string | null
  status: BomStatus
  totalComponents: number
  createdAt: string
  updatedAt: string
  items: BomItem[]
}

export interface BomItemPayload {
  materialId: number
  quantity: number
  notes?: string
}

export interface CreateBomPayload {
  bomCode?: string
  productId: number
  outputQuantity: number
  notes?: string
  saveAndActivate?: boolean
  items: BomItemPayload[]
}

export interface UpdateBomPayload {
  productId?: number
  outputQuantity: number
  notes?: string
  saveAndActivate?: boolean
  items: BomItemPayload[]
}

export interface NextBomCodeResponse {
  nextCode: string
}

// Production Order Types

export type ProductionOrderStatus = 'DRAFT' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED'

export type OverallAvailability = 'ALL_MATERIALS_AVAILABLE' | 'MATERIAL_SHORTAGE'

export type MaterialAvailabilityStatus = 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'NOT_AVAILABLE'

export interface MaterialAvailabilityItem {
  materialId: number
  materialCode: string
  materialName: string
  bomQuantity: number
  requiredQuantity: number
  issuedQuantity?: number
  consumedQuantity?: number
  returnedQuantity?: number
  remainingQuantity?: number
  pendingQuantity?: number
  onHandQuantity: number
  shortageQuantity: number
  availabilityStatus: MaterialAvailabilityStatus
  unitOfMeasure: string
}

export interface ProductionOrderAvailability {
  productionOrderId: number
  orderNumber: string
  sourceWarehouseId: number
  sourceWarehouseCode: string
  sourceWarehouseName: string
  overallAvailability: OverallAvailability
  totalComponents: number
  shortageCount: number
  availableCount: number
  items: MaterialAvailabilityItem[]
}

export interface ProductionOrderItem {
  id: number
  materialId: number
  materialCode: string
  materialName: string
  bomQuantity: number
  requiredQuantity: number
  issuedQuantity?: number
  consumedQuantity?: number
  returnedQuantity?: number
  remainingQuantity?: number
  pendingQuantity?: number
  unitOfMeasure: string
  onHandQuantity?: number | null
  shortageQuantity?: number | null
  availabilityStatus?: MaterialAvailabilityStatus | null
}

export interface ProductionOrder {
  id: number
  orderNumber: string
  orderDate: string
  productId: number
  productCode: string
  productName: string
  bomId: number
  bomCode: string
  bomOutputQuantity: number
  productionQuantity: number
  receivedQuantity?: number
  pendingProductionQuantity?: number
  productionProgress?: number
  qualityPendingQuantity?: number
  qualityAcceptedQuantity?: number
  qualityRejectedQuantity?: number
  unitOfMeasure: string
  plannedStartDate?: string | null
  plannedEndDate?: string | null
  sourceWarehouseId: number
  sourceWarehouseCode: string
  sourceWarehouseName: string
  finishedGoodsWarehouseId: number
  finishedGoodsWarehouseCode: string
  finishedGoodsWarehouseName: string
  status: ProductionOrderStatus
  notes?: string | null
  completedDate?: string | null
  completedBy?: string | null
  closedDate?: string | null
  closedBy?: string | null
  closureNotes?: string | null
  totalComponents: number
  overallAvailability?: OverallAvailability | null
  shortageCount?: number
  createdAt: string
  updatedAt: string
  items: ProductionOrderItem[]
}

export interface CreateProductionOrderPayload {
  orderNumber?: string
  orderDate: string
  productId: number
  productionQuantity: number
  plannedStartDate?: string
  plannedEndDate?: string
  sourceWarehouseId: number
  finishedGoodsWarehouseId: number
  notes?: string
  releaseImmediately?: boolean
}

export interface UpdateProductionOrderPayload {
  orderDate: string
  productId: number
  productionQuantity: number
  plannedStartDate?: string
  plannedEndDate?: string
  sourceWarehouseId: number
  finishedGoodsWarehouseId: number
  notes?: string
  releaseImmediately?: boolean
}

export interface MaterialRequirementPreview {
  bomId: number
  bomCode: string
  bomOutputQuantity: number
  productionQuantity: number
  receivedQuantity?: number
  pendingProductionQuantity?: number
  productionProgress?: number
  unitOfMeasure: string
  items: ProductionOrderItem[]
}

export interface NextProductionOrderNumberResponse {
  nextCode: string
}

// Material Issue Types
export type MaterialIssueStatus = 'DRAFT' | 'POSTED'

export interface MaterialIssueItem {
  id: number
  materialId: number
  materialCode: string
  materialName: string
  productionOrderItemId?: number
  requiredQuantity?: number
  issuedQuantityBefore?: number
  pendingQuantityBefore?: number
  issueQuantity: number
  unitOfMeasure: string
}

export interface MaterialIssue {
  id: number
  issueNumber: string
  issueDate: string
  productionOrderId: number
  productionOrderNumber: string
  orderStatus: string
  productId: number
  productCode: string
  productName: string
  sourceWarehouseId: number
  sourceWarehouseCode: string
  sourceWarehouseName: string
  status: MaterialIssueStatus
  notes?: string | null
  totalItems: number
  totalQuantity: number
  createdAt: string
  updatedAt: string
  items: MaterialIssueItem[]
}

export interface CreateMaterialIssuePayload {
  issueNumber?: string
  issueDate: string
  productionOrderId: number
  notes?: string
  postImmediately?: boolean
  items: Array<{
    materialId: number
    issueQuantity: number
  }>
}

export interface UpdateMaterialIssuePayload {
  issueDate: string
  notes?: string
  postImmediately?: boolean
  items: Array<{
    materialId: number
    issueQuantity: number
  }>
}

export interface NextMaterialIssueNumberResponse {
  nextCode: string
}

// Material Consumption Types
export type MaterialConsumptionStatus = 'DRAFT' | 'POSTED'

export interface MaterialConsumptionItem {
  id: number
  materialId: number
  materialCode: string
  materialName: string
  productionOrderItemId?: number
  availableInProduction?: number
  consumedQuantity: number
  remainingInProduction?: number
  unitOfMeasure: string
}

export interface MaterialConsumption {
  id: number
  consumptionNumber: string
  consumptionDate: string
  productionOrderId: number
  productionOrderNumber: string
  orderStatus: string
  productId: number
  productCode: string
  productName: string
  status: MaterialConsumptionStatus
  notes?: string | null
  totalItems: number
  totalQuantity: number
  createdAt: string
  updatedAt: string
  items: MaterialConsumptionItem[]
}

export interface CreateMaterialConsumptionPayload {
  consumptionNumber?: string
  consumptionDate: string
  productionOrderId: number
  notes?: string
  postImmediately?: boolean
  items: Array<{
    materialId: number
    consumedQuantity: number
  }>
}

export interface UpdateMaterialConsumptionPayload {
  consumptionDate: string
  notes?: string
  postImmediately?: boolean
  items: Array<{
    materialId: number
    consumedQuantity: number
  }>
}

export interface NextMaterialConsumptionNumberResponse {
  nextCode: string
}

// Material Return Types
export type MaterialReturnStatus = 'DRAFT' | 'POSTED'

export interface MaterialReturnItem {
  id: number
  materialId: number
  materialCode: string
  materialName: string
  productionOrderItemId?: number
  returnableQuantity?: number
  returnQuantity: number
  remainingInProduction?: number
  unitOfMeasure: string
}

export interface MaterialReturn {
  id: number
  returnNumber: string
  returnDate: string
  productionOrderId: number
  productionOrderNumber: string
  orderStatus: string
  productId: number
  productCode: string
  productName: string
  returnWarehouseId: number
  returnWarehouseCode: string
  returnWarehouseName: string
  status: MaterialReturnStatus
  notes?: string | null
  totalItems: number
  totalQuantity: number
  createdAt: string
  updatedAt: string
  items: MaterialReturnItem[]
}

export interface CreateMaterialReturnPayload {
  returnNumber?: string
  returnDate: string
  productionOrderId: number
  returnWarehouseId?: number
  notes?: string
  postImmediately?: boolean
  items: Array<{
    materialId: number
    returnQuantity: number
  }>
}

export interface UpdateMaterialReturnPayload {
  returnDate: string
  returnWarehouseId?: number
  notes?: string
  postImmediately?: boolean
  items: Array<{
    materialId: number
    returnQuantity: number
  }>
}

export interface NextMaterialReturnNumberResponse {
  nextCode: string
}

// Unified Material Transaction
export interface MaterialTransaction {
  id: number
  transactionType: 'MATERIAL_ISSUE' | 'MATERIAL_CONSUMPTION' | 'MATERIAL_RETURN'
  transactionTypeLabel: string
  referenceNumber: string
  transactionDate: string
  status: 'DRAFT' | 'POSTED'
  totalItems: number
  totalQuantity: number
  notes?: string | null
  createdAt: string
}

// Production Receipt Types
export type ProductionReceiptStatus = 'DRAFT' | 'POSTED'

export interface ProductionReceipt {
  id: number
  receiptNumber: string
  receiptDate: string
  productionOrderId: number
  productionOrderNumber: string
  productId: number
  productCode: string
  productName: string
  receivingWarehouseId: number
  receivingWarehouseCode: string
  receivingWarehouseName: string
  receiptQuantity: number
  unitOfMeasure: string
  status: ProductionReceiptStatus
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProductionReceiptPayload {
  receiptNumber?: string
  receiptDate: string
  productionOrderId: number
  receiptQuantity: number
  notes?: string
  postImmediately?: boolean
}

export interface UpdateProductionReceiptPayload {
  receiptDate: string
  receiptQuantity: number
  notes?: string
  postImmediately?: boolean
}

export interface NextProductionReceiptNumberResponse {
  nextCode: string
}

// Production Order Closure Types
export interface CloseProductionOrderPayload {
  closureNotes?: string
}

export interface MaterialReconciliationItem {
  materialId: number
  materialCode: string
  materialName: string
  issuedQuantity: number
  consumedQuantity: number
  returnedQuantity: number
  remainingQuantity: number
  unitOfMeasure: string
  reconciled: boolean
}

export interface ProductionOrderClosureValidation {
  productionOrderId: number
  orderNumber: string
  status: string
  plannedQuantity: number
  receivedQuantity: number
  unitOfMeasure: string
  productionCompleted: boolean
  allPlannedQuantitiesReceived: boolean
  allMaterialsReconciled: boolean
  noPendingDraftTransactions: boolean
  allQualityInspectionsCompleted: boolean
  canClose: boolean
  pendingDraftTransactionsCount: number
  unreconciledMaterialsCount: number
  pendingQualityInspectionsCount: number
  materials: MaterialReconciliationItem[]
}
