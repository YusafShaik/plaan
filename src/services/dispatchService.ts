import { apiClient } from '../lib/api'
import type { PageResponse } from '../types/masterData'
import type {
  DispatchOrder,
  CreateDispatchOrderPayload,
  UpdateDispatchOrderPayload,
  DispatchFilterParams,
  DispatchPrepareResponse,
} from '../types/dispatch'

export const dispatchService = {
  getDispatchOrders: async (params: DispatchFilterParams = {}): Promise<PageResponse<DispatchOrder>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.salesOrderId) query.set('salesOrderId', String(params.salesOrderId))
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.direction) query.set('direction', params.direction)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<DispatchOrder>>(`/dispatch/orders${queryString}`)
  },

  getNextDispatchNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/dispatch/orders/next-number')
  },

  getDispatchOrderById: async (id: number): Promise<DispatchOrder> => {
    return apiClient<DispatchOrder>(`/dispatch/orders/${id}`)
  },

  getDispatchOrdersBySalesOrder: async (salesOrderId: number): Promise<DispatchOrder[]> => {
    return apiClient<DispatchOrder[]>(`/dispatch/orders/by-sales-order/${salesOrderId}`)
  },

  prepareDispatch: async (salesOrderId: number): Promise<DispatchPrepareResponse> => {
    return apiClient<DispatchPrepareResponse>(`/dispatch/orders/prepare?salesOrderId=${salesOrderId}`)
  },

  createDispatchOrder: async (payload: CreateDispatchOrderPayload): Promise<DispatchOrder> => {
    return apiClient<DispatchOrder>('/dispatch/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateDispatchOrder: async (id: number, payload: UpdateDispatchOrderPayload): Promise<DispatchOrder> => {
    return apiClient<DispatchOrder>(`/dispatch/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postDispatchOrder: async (id: number): Promise<DispatchOrder> => {
    return apiClient<DispatchOrder>(`/dispatch/orders/${id}/post`, {
      method: 'POST',
    })
  },

  deleteDispatchOrder: async (id: number): Promise<void> => {
    return apiClient<void>(`/dispatch/orders/${id}`, {
      method: 'DELETE',
    })
  },
}
