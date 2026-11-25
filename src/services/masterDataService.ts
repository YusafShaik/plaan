import { apiClient } from '../lib/api'
import type {
  Item,
  ItemType,
  CreateItemPayload,
  PageResponse,
  ItemFilterParams,
  ItemSummary,
  ItemPrefix,
  CreateItemPrefixPayload,
  Supplier,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  SupplierFilterParams,
  SupplierSummary,
  Warehouse,
  CreateWarehousePayload,
  UpdateWarehousePayload,
  WarehouseFilterParams,
  WarehouseSummary,
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CustomerFilterParams,
  CustomerSummary,
} from '../types/masterData'

export const masterDataService = {
  // =================== ITEM TYPES ===================
  getItemTypes: async (): Promise<ItemType[]> => {
    return apiClient<ItemType[]>('/master-data/item-types')
  },

  createItemType: async (name: string, description?: string): Promise<ItemType> => {
    return apiClient<ItemType>('/master-data/item-types', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    })
  },

  // =================== ITEMS ===================
  getItems: async (params: ItemFilterParams = {}): Promise<PageResponse<Item>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.typeId) query.set('typeId', String(params.typeId))
    if (params.active !== undefined && params.active !== null) {
      query.set('active', String(params.active))
    }
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<Item>>(`/master-data/items${queryString}`)
  },

  createItem: async (payload: CreateItemPayload): Promise<Item> => {
    return apiClient<Item>('/master-data/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  toggleStatus: async (id: number): Promise<Item> => {
    return apiClient<Item>(`/master-data/items/${id}/status`, {
      method: 'PATCH',
    })
  },

  getSummary: async (): Promise<ItemSummary> => {
    return apiClient<ItemSummary>('/master-data/items/summary')
  },

  getItemPrefixes: async (): Promise<ItemPrefix[]> => {
    return apiClient<ItemPrefix[]>('/master-data/item-prefixes')
  },

  createItemPrefix: async (payload: CreateItemPrefixPayload): Promise<ItemPrefix> => {
    return apiClient<ItemPrefix>('/master-data/item-prefixes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getNextItemCode: async (prefixId: number): Promise<ItemPrefix> => {
    return apiClient<ItemPrefix>(`/master-data/item-prefixes/${prefixId}/next`)
  },

  // =================== SUPPLIERS ===================
  getSuppliers: async (params: SupplierFilterParams = {}): Promise<PageResponse<Supplier>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.active !== undefined && params.active !== null) {
      query.set('active', String(params.active))
    }
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<Supplier>>(`/master-data/suppliers${queryString}`)
  },

  getNextSupplierCode: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/master-data/suppliers/next-code')
  },

  getSupplierSummary: async (): Promise<SupplierSummary> => {
    return apiClient<SupplierSummary>('/master-data/suppliers/summary')
  },

  getSupplierById: async (id: number): Promise<Supplier> => {
    return apiClient<Supplier>(`/master-data/suppliers/${id}`)
  },

  createSupplier: async (payload: CreateSupplierPayload): Promise<Supplier> => {
    return apiClient<Supplier>('/master-data/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateSupplier: async (id: number, payload: UpdateSupplierPayload): Promise<Supplier> => {
    return apiClient<Supplier>(`/master-data/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  toggleSupplierStatus: async (id: number): Promise<Supplier> => {
    return apiClient<Supplier>(`/master-data/suppliers/${id}/status`, {
      method: 'PATCH',
    })
  },

  // =================== WAREHOUSES ===================
  getWarehouses: async (params: WarehouseFilterParams = {}): Promise<PageResponse<Warehouse>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.active !== undefined && params.active !== null) {
      query.set('active', String(params.active))
    }
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<Warehouse>>(`/master-data/warehouses${queryString}`)
  },

  getNextWarehouseCode: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/master-data/warehouses/next-code')
  },

  getWarehouseSummary: async (): Promise<WarehouseSummary> => {
    return apiClient<WarehouseSummary>('/master-data/warehouses/summary')
  },

  getWarehouseById: async (id: number): Promise<Warehouse> => {
    return apiClient<Warehouse>(`/master-data/warehouses/${id}`)
  },

  createWarehouse: async (payload: CreateWarehousePayload): Promise<Warehouse> => {
    return apiClient<Warehouse>('/master-data/warehouses', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateWarehouse: async (id: number, payload: UpdateWarehousePayload): Promise<Warehouse> => {
    return apiClient<Warehouse>(`/master-data/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  toggleWarehouseStatus: async (id: number): Promise<Warehouse> => {
    return apiClient<Warehouse>(`/master-data/warehouses/${id}/status`, {
      method: 'PATCH',
    })
  },

  // =================== CUSTOMERS ===================
  getCustomers: async (params: CustomerFilterParams = {}): Promise<PageResponse<Customer>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.active !== undefined && params.active !== null) {
      query.set('active', String(params.active))
    }
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<Customer>>(`/master-data/customers${queryString}`)
  },

  getNextCustomerCode: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/master-data/customers/next-code')
  },

  getCustomerSummary: async (): Promise<CustomerSummary> => {
    return apiClient<CustomerSummary>('/master-data/customers/summary')
  },

  getCustomerById: async (id: number): Promise<Customer> => {
    return apiClient<Customer>(`/master-data/customers/${id}`)
  },

  createCustomer: async (payload: CreateCustomerPayload): Promise<Customer> => {
    return apiClient<Customer>('/master-data/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateCustomer: async (id: number, payload: UpdateCustomerPayload): Promise<Customer> => {
    return apiClient<Customer>(`/master-data/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  toggleCustomerStatus: async (id: number): Promise<Customer> => {
    return apiClient<Customer>(`/master-data/customers/${id}/status`, {
      method: 'PATCH',
    })
  },

  deleteCustomer: async (id: number): Promise<void> => {
    return apiClient<void>(`/master-data/customers/${id}`, {
      method: 'DELETE',
    })
  },
}
