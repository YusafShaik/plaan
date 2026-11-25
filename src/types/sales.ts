export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PARTIALLY_DISPATCHED'
  | 'FULLY_DISPATCHED'
  | 'CANCELLED'

export interface SalesOrderItem {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  orderedQuantity: number
  unitPrice: number
  lineAmount: number
  dispatchedQuantity?: number
  pendingQuantity?: number
}

export interface SalesOrder {
  id: number
  orderNumber: string
  customerId: number
  customerCode: string
  customerName: string
  dispatchWarehouseId: number
  warehouseCode: string
  warehouseName: string
  orderDate: string
  expectedDeliveryDate?: string
  customerPoReference?: string
  billingAddress?: string
  shippingAddress?: string
  notes?: string
  status: SalesOrderStatus
  totalAmount: number
  currency: string
  itemsCount: number
  items: SalesOrderItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateSalesOrderItemPayload {
  id?: number
  itemId: number
  orderedQuantity: number
  unitPrice: number
}

export interface CreateSalesOrderPayload {
  orderNumber?: string
  customerId: number
  dispatchWarehouseId: number
  orderDate: string
  expectedDeliveryDate?: string
  customerPoReference?: string
  billingAddress?: string
  shippingAddress?: string
  notes?: string
  status?: SalesOrderStatus
  items: CreateSalesOrderItemPayload[]
}

export interface UpdateSalesOrderPayload {
  customerId: number
  dispatchWarehouseId: number
  orderDate: string
  expectedDeliveryDate?: string
  customerPoReference?: string
  billingAddress?: string
  shippingAddress?: string
  notes?: string
  items: CreateSalesOrderItemPayload[]
}

export interface SalesOrderFilterParams {
  search?: string
  status?: SalesOrderStatus | ''
  customerId?: number | null
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export interface SalesOrderSummary {
  totalOrders: number
  draftOrders: number
  confirmedOrders: number
  cancelledOrders: number
  totalValue: number
}

export type StockAvailabilityStatus = 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'NOT_AVAILABLE'

export interface SalesOrderStockAvailabilityItem {
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  orderedQuantity: number
  onHandQuantity: number
  shortageQuantity: number
  status: StockAvailabilityStatus
}

export interface SalesOrderStockAvailability {
  salesOrderId: number
  orderNumber: string
  dispatchWarehouseId: number
  dispatchWarehouseCode: string
  dispatchWarehouseName: string
  overallStatus: 'AVAILABLE' | 'STOCK_SHORTAGE'
  totalItems: number
  availableItems: number
  shortageItems: number
  items: SalesOrderStockAvailabilityItem[]
}

