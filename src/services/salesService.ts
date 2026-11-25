import { apiClient } from '../lib/api'
import type { PageResponse } from '../types/masterData'
import type {
  SalesOrder,
  CreateSalesOrderPayload,
  UpdateSalesOrderPayload,
  SalesOrderFilterParams,
  SalesOrderSummary,
  SalesOrderStockAvailability,
} from '../types/sales'

export const salesService = {
  getSalesOrders: async (params: SalesOrderFilterParams = {}): Promise<PageResponse<SalesOrder>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.customerId) query.set('customerId', String(params.customerId))
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.direction) query.set('direction', params.direction)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<SalesOrder>>(`/sales/orders${queryString}`)
  },

  getNextSalesOrderNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/sales/orders/next-number')
  },

  getSummary: async (): Promise<SalesOrderSummary> => {
    return apiClient<SalesOrderSummary>('/sales/orders/summary')
  },

  getSalesOrderById: async (id: number): Promise<SalesOrder> => {
    return apiClient<SalesOrder>(`/sales/orders/${id}`)
  },

  createSalesOrder: async (payload: CreateSalesOrderPayload): Promise<SalesOrder> => {
    return apiClient<SalesOrder>('/sales/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateSalesOrder: async (id: number, payload: UpdateSalesOrderPayload): Promise<SalesOrder> => {
    return apiClient<SalesOrder>(`/sales/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  confirmSalesOrder: async (id: number): Promise<SalesOrder> => {
    return apiClient<SalesOrder>(`/sales/orders/${id}/confirm`, {
      method: 'POST',
    })
  },

  cancelSalesOrder: async (id: number): Promise<SalesOrder> => {
    return apiClient<SalesOrder>(`/sales/orders/${id}/cancel`, {
      method: 'POST',
    })
  },

  deleteSalesOrder: async (id: number): Promise<void> => {
    return apiClient<void>(`/sales/orders/${id}`, {
      method: 'DELETE',
    })
  },

  getStockAvailability: async (id: number): Promise<SalesOrderStockAvailability> => {
    return apiClient<SalesOrderStockAvailability>(`/sales/orders/${id}/stock-availability`)
  },
}
