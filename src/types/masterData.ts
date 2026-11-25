export interface ItemType {
  id: number
  name: string
  description?: string
}

export interface Item {
  id: number
  itemCode: string
  name: string
  itemType: ItemType
  unitOfMeasure: string
  description?: string
  active: boolean
  createdAt: string
}

export interface CreateItemPayload {
  itemCode: string
  name: string
  itemTypeId?: number
  newItemTypeName?: string
  prefixId?: number
  newPrefix?: string
  unitOfMeasure: string
  description?: string
  active?: boolean
}

export interface ItemPrefix {
  id: number
  prefix: string
  description?: string
  lastNumber: number
  paddingDigits: number
  nextCode: string
}

export interface CreateItemPrefixPayload {
  prefix: string
  description?: string
  initialNumber?: number
  paddingDigits?: number
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface ItemFilterParams {
  search?: string
  typeId?: number | null
  active?: boolean | null
  page?: number
  size?: number
}

export interface ItemSummary {
  totalItems: number
  activeItems: number
  inactiveItems: number
}

// =================== SUPPLIER TYPES ===================

export interface Supplier {
  id: number
  supplierCode: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  taxId?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSupplierPayload {
  supplierCode?: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  taxId?: string
  active?: boolean
}

export interface UpdateSupplierPayload {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  taxId?: string
  active?: boolean
}

export interface SupplierFilterParams {
  search?: string
  active?: boolean | null
  page?: number
  size?: number
}

export interface SupplierSummary {
  totalSuppliers: number
  activeSuppliers: number
  inactiveSuppliers: number
}

// =================== WAREHOUSE TYPES ===================

export interface Warehouse {
  id: number
  warehouseCode: string
  name: string
  address?: string
  description?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateWarehousePayload {
  warehouseCode?: string
  name: string
  address?: string
  description?: string
  active?: boolean
}

export interface UpdateWarehousePayload {
  name: string
  address?: string
  description?: string
  active?: boolean
}

export interface WarehouseFilterParams {
  search?: string
  active?: boolean | null
  page?: number
  size?: number
}

export interface WarehouseSummary {
  totalWarehouses: number
  activeWarehouses: number
  inactiveWarehouses: number
}

// =================== CUSTOMER TYPES ===================

export interface Customer {
  id: number
  customerCode: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  billingAddress?: string
  shippingAddress?: string
  taxId?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerPayload {
  customerCode?: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  billingAddress?: string
  shippingAddress?: string
  taxId?: string
  active?: boolean
}

export interface UpdateCustomerPayload {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  billingAddress?: string
  shippingAddress?: string
  taxId?: string
  active?: boolean
}

export interface CustomerFilterParams {
  search?: string
  active?: boolean | null
  page?: number
  size?: number
}

export interface CustomerSummary {
  totalCustomers: number
  activeCustomers: number
  inactiveCustomers: number
}
