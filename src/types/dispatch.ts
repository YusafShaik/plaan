export type DispatchOrderStatus = 'DRAFT' | 'POSTED'

export interface DispatchOrderItem {
  id: number
  salesOrderItemId: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  orderedQuantity: number
  previouslyDispatchedQuantity: number
  dispatchQuantity: number
  remainingQuantity: number
}

export interface DispatchOrder {
  id: number
  dispatchNumber: string
  salesOrderId: number
  salesOrderNumber: string
  customerId: number
  customerCode: string
  customerName: string
  dispatchWarehouseId: number
  dispatchWarehouseCode: string
  dispatchWarehouseName: string
  dispatchDate: string
  shippingAddress?: string
  transporterName?: string
  vehicleNumber?: string
  transportReference?: string
  notes?: string
  status: DispatchOrderStatus
  postedAt?: string
  itemsCount: number
  totalQuantityDispatched: number
  items: DispatchOrderItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateDispatchOrderItemPayload {
  salesOrderItemId: number
  itemId: number
  dispatchQuantity: number
}

export interface CreateDispatchOrderPayload {
  dispatchNumber?: string
  salesOrderId: number
  dispatchDate: string
  shippingAddress?: string
  transporterName?: string
  vehicleNumber?: string
  transportReference?: string
  notes?: string
  status?: DispatchOrderStatus
  items: CreateDispatchOrderItemPayload[]
}

export interface UpdateDispatchOrderPayload {
  dispatchDate: string
  shippingAddress?: string
  transporterName?: string
  vehicleNumber?: string
  transportReference?: string
  notes?: string
  items: CreateDispatchOrderItemPayload[]
}

export interface DispatchPrepareItem {
  salesOrderItemId: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  orderedQuantity: number
  dispatchedQuantity: number
  pendingQuantity: number
  onHandQuantity: number
}

export interface DispatchPrepareResponse {
  salesOrderId: number
  salesOrderNumber: string
  customerId: number
  customerCode: string
  customerName: string
  dispatchWarehouseId: number
  dispatchWarehouseCode: string
  dispatchWarehouseName: string
  shippingAddress?: string
  items: DispatchPrepareItem[]
}

export interface DispatchFilterParams {
  search?: string
  status?: DispatchOrderStatus | ''
  salesOrderId?: number
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}
