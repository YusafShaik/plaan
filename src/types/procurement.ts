export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface PurchaseOrderItem {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  quantity: number
  unitPrice: number
  lineAmount: number
}

export interface PurchaseOrder {
  id: number
  poNumber: string
  supplierId: number
  supplierCode: string
  supplierName: string
  receivingWarehouseId: number
  warehouseCode: string
  warehouseName: string
  orderDate: string
  expectedDeliveryDate?: string
  notes?: string
  status: PurchaseOrderStatus
  totalAmount: number
  currency: string
  itemsCount: number
  items: PurchaseOrderItem[]
  createdAt: string
  updatedAt: string
}

export interface CreatePurchaseOrderItemPayload {
  itemId: number
  quantity: number
  unitPrice: number
}

export interface CreatePurchaseOrderPayload {
  poNumber?: string
  supplierId: number
  receivingWarehouseId: number
  orderDate: string
  expectedDeliveryDate?: string
  notes?: string
  status?: PurchaseOrderStatus
  items: CreatePurchaseOrderItemPayload[]
}

export interface UpdatePurchaseOrderPayload {
  supplierId: number
  receivingWarehouseId: number
  orderDate: string
  expectedDeliveryDate?: string
  notes?: string
  status?: PurchaseOrderStatus
  items: CreatePurchaseOrderItemPayload[]
}

export interface PurchaseOrderSummary {
  totalOrders: number
  draftCount: number
  issuedCount: number
  partiallyReceivedCount?: number
  completedCount?: number
  cancelledCount: number
  totalValue: number
}

export interface PurchaseOrderFilterParams {
  search?: string
  status?: PurchaseOrderStatus
  page?: number
  size?: number
}

// ----------------- GOODS RECEIPT (GRN) TYPES -----------------

export type GoodsReceiptStatus = 'DRAFT' | 'POSTED' | 'CANCELLED'

export interface GoodsReceiptItem {
  id: number
  purchaseOrderItemId: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  orderedQuantity: number
  previouslyReceivedQuantity: number
  receivedQuantity: number
  remainingQuantity: number
}

export interface GoodsReceipt {
  id: number
  grnNumber: string
  purchaseOrderId: number
  poNumber: string
  poStatus: PurchaseOrderStatus
  supplierId: number
  supplierCode: string
  supplierName: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  receiptDate: string
  deliveryNoteNumber?: string
  notes?: string
  status: GoodsReceiptStatus
  itemsCount: number
  items: GoodsReceiptItem[]
  createdAt: string
  updatedAt: string
}

export interface GoodsReceiptItemPayload {
  purchaseOrderItemId: number
  itemId: number
  receivedQuantity: number
}

export interface CreateGoodsReceiptPayload {
  grnNumber?: string
  purchaseOrderId: number
  receiptDate: string
  deliveryNoteNumber?: string
  notes?: string
  status?: GoodsReceiptStatus
  items: GoodsReceiptItemPayload[]
}

export interface GoodsReceiptSummary {
  totalGrns: number
  draftCount: number
  postedCount: number
  totalItemsReceived: number
}

export interface GoodsReceiptFilterParams {
  search?: string
  status?: GoodsReceiptStatus
  page?: number
  size?: number
}

export interface StockMovement {
  id: number
  referenceNumber: string
  goodsReceiptId: number
  grnNumber: string
  purchaseOrderId: number
  poNumber: string
  itemId: number
  itemCode: string
  itemName: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  movementType: string
  quantity: number
  unitOfMeasure: string
  movementDate: string
  createdAt: string
}

export interface PoLineItemForGrn {
  purchaseOrderItemId: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  orderedQuantity: number
  previouslyReceivedQuantity: number
  remainingQuantity: number
}

export interface PoEligibleForGrn {
  id: number
  poNumber: string
  status: PurchaseOrderStatus
  supplierId: number
  supplierCode: string
  supplierName: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  orderDate: string
  expectedDeliveryDate?: string
  items: PoLineItemForGrn[]
}
