export interface StockOverviewItem {
  itemId: number
  itemCode: string
  itemName: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  onHandQuantity: number
  unitOfMeasure: string
}

export interface StockOverviewSummary {
  itemsInStock: number
  warehousesWithStock: number
  totalStockRecords: number
}

export interface StockOverviewFilterParams {
  search?: string
  warehouseId?: number
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export interface StockLedgerEntry {
  id: number
  movementDate: string
  referenceNumber: string
  goodsReceiptId: number | null
  openingStockId: number | null
  stockTransferId: number | null
  stockAdjustmentId: number | null
  transactionType: string
  itemCode: string
  itemName: string
  warehouseCode: string
  warehouseName: string
  quantityIn: number | null
  quantityOut: number | null
  runningBalance: number
  unitOfMeasure: string
  createdAt: string
}

export interface StockLedgerData {
  itemId: number | null
  itemCode: string | null
  itemName: string | null
  warehouseId: number | null
  warehouseName: string
  unitOfMeasure: string | null
  totalIn: number
  totalOut: number
  closingBalance: number
  totalMovements: number
  movements: StockLedgerEntry[]
}

export type OpeningStockStatus = 'DRAFT' | 'POSTED' | 'CANCELLED'

export interface OpeningStockItem {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  quantity: number
}

export interface OpeningStock {
  id: number
  openingStockNumber: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  openingDate: string
  notes: string | null
  status: OpeningStockStatus
  totalItems: number
  items: OpeningStockItem[]
  createdAt: string
  updatedAt: string
}

export interface OpeningStockItemPayload {
  itemId: number
  quantity: number
}

export interface CreateOpeningStockPayload {
  openingStockNumber?: string
  openingDate: string
  warehouseId: number
  notes?: string
  postImmediately?: boolean
  items: OpeningStockItemPayload[]
}

export interface UpdateOpeningStockPayload {
  openingDate: string
  warehouseId: number
  notes?: string
  items: OpeningStockItemPayload[]
}

// Stock Transfer Types
export type StockTransferStatus = 'DRAFT' | 'POSTED' | 'CANCELLED'

export interface StockTransferItem {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  transferQuantity: number
  onHandInSource: number
}

export interface StockTransfer {
  id: number
  transferNumber: string
  fromWarehouseId: number
  fromWarehouseCode: string
  fromWarehouseName: string
  toWarehouseId: number
  toWarehouseCode: string
  toWarehouseName: string
  transferDate: string
  notes: string | null
  status: StockTransferStatus
  totalItems: number
  totalQuantity: number
  items: StockTransferItem[]
  createdAt: string
  updatedAt: string
}

export interface ItemOnHandStock {
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  onHandQuantity: number
}

export interface StockTransferItemPayload {
  itemId: number
  transferQuantity: number
}

export interface CreateStockTransferPayload {
  transferNumber?: string
  transferDate: string
  fromWarehouseId: number
  toWarehouseId: number
  notes?: string
  postImmediately?: boolean
  items: StockTransferItemPayload[]
}

export interface UpdateStockTransferPayload {
  transferDate: string
  fromWarehouseId: number
  toWarehouseId: number
  notes?: string
  items: StockTransferItemPayload[]
}

// Stock Adjustment Types
export type StockAdjustmentStatus = 'DRAFT' | 'POSTED' | 'CANCELLED'

export interface StockAdjustmentItem {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  systemQuantity: number
  physicalQuantity: number
  adjustmentQuantity: number
}

export interface StockAdjustment {
  id: number
  adjustmentNumber: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  adjustmentDate: string
  reason: string
  notes: string | null
  status: StockAdjustmentStatus
  totalItems: number
  totalDifference: number
  items: StockAdjustmentItem[]
  createdAt: string
  updatedAt: string
}

export interface StockAdjustmentItemPayload {
  itemId: number
  physicalQuantity: number
  systemQuantity?: number
}

export interface CreateStockAdjustmentPayload {
  adjustmentNumber?: string
  adjustmentDate: string
  warehouseId: number
  reason: string
  notes?: string
  postImmediately?: boolean
  items: StockAdjustmentItemPayload[]
}

export interface UpdateStockAdjustmentPayload {
  adjustmentDate: string
  warehouseId: number
  reason: string
  notes?: string
  items: StockAdjustmentItemPayload[]
}
