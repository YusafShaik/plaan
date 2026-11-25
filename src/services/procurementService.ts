import { apiClient } from '../lib/api'
import type { PageResponse } from '../types/masterData'
import type {
  PurchaseOrder,
  CreatePurchaseOrderPayload,
  UpdatePurchaseOrderPayload,
  PurchaseOrderSummary,
  PurchaseOrderFilterParams,
  PurchaseOrderStatus,
  GoodsReceipt,
  CreateGoodsReceiptPayload,
  GoodsReceiptSummary,
  GoodsReceiptFilterParams,
  StockMovement,
  PoEligibleForGrn,
} from '../types/procurement'

export const procurementService = {
  // ----------------- PURCHASE ORDERS -----------------
  getPurchaseOrders: async (
    params: PurchaseOrderFilterParams = {}
  ): Promise<PageResponse<PurchaseOrder>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<PurchaseOrder>>(`/procurement/purchase-orders${queryString}`)
  },

  getPurchaseOrderById: async (id: number): Promise<PurchaseOrder> => {
    return apiClient<PurchaseOrder>(`/procurement/purchase-orders/${id}`)
  },

  getNextPoNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/procurement/purchase-orders/next-number')
  },

  getSummary: async (): Promise<PurchaseOrderSummary> => {
    return apiClient<PurchaseOrderSummary>('/procurement/purchase-orders/summary')
  },

  createPurchaseOrder: async (
    payload: CreatePurchaseOrderPayload
  ): Promise<PurchaseOrder> => {
    return apiClient<PurchaseOrder>('/procurement/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updatePurchaseOrder: async (
    id: number,
    payload: UpdatePurchaseOrderPayload
  ): Promise<PurchaseOrder> => {
    return apiClient<PurchaseOrder>(`/procurement/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  updateStatus: async (
    id: number,
    status: PurchaseOrderStatus
  ): Promise<PurchaseOrder> => {
    return apiClient<PurchaseOrder>(`/procurement/purchase-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  downloadPurchaseOrderPdf: async (id: number, poNumber: string): Promise<void> => {
    const token = localStorage.getItem('plaan_token')
    const response = await fetch(`/api/v1/procurement/purchase-orders/${id}/pdf`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok) {
      throw new Error('Failed to download purchase order PDF.')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${poNumber || 'purchase-order'}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  // ----------------- GOODS RECEIPTS (GRN) -----------------
  getGoodsReceipts: async (
    params: GoodsReceiptFilterParams = {}
  ): Promise<PageResponse<GoodsReceipt>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<GoodsReceipt>>(`/procurement/goods-receipts${queryString}`)
  },

  getNextGrnNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/procurement/goods-receipts/next-number')
  },

  getGoodsReceiptSummary: async (): Promise<GoodsReceiptSummary> => {
    return apiClient<GoodsReceiptSummary>('/procurement/goods-receipts/summary')
  },

  getGoodsReceiptById: async (id: number): Promise<GoodsReceipt> => {
    return apiClient<GoodsReceipt>(`/procurement/goods-receipts/${id}`)
  },

  getEligiblePurchaseOrders: async (): Promise<PoEligibleForGrn[]> => {
    return apiClient<PoEligibleForGrn[]>('/procurement/goods-receipts/eligible-pos')
  },

  getPurchaseOrderDetailsForGrn: async (poId: number): Promise<PoEligibleForGrn> => {
    return apiClient<PoEligibleForGrn>(`/procurement/goods-receipts/po-details/${poId}`)
  },

  createGoodsReceipt: async (
    payload: CreateGoodsReceiptPayload
  ): Promise<GoodsReceipt> => {
    return apiClient<GoodsReceipt>('/procurement/goods-receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  postGoodsReceipt: async (id: number): Promise<GoodsReceipt> => {
    return apiClient<GoodsReceipt>(`/procurement/goods-receipts/${id}/post`, {
      method: 'POST',
    })
  },

  cancelGoodsReceipt: async (id: number): Promise<GoodsReceipt> => {
    return apiClient<GoodsReceipt>(`/procurement/goods-receipts/${id}/cancel`, {
      method: 'POST',
    })
  },

  getStockMovements: async (params: {
    search?: string
    page?: number
    size?: number
  } = {}): Promise<PageResponse<StockMovement>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<StockMovement>>(`/procurement/goods-receipts/movements${queryString}`)
  },

  getStockMovementsForPo: async (poId: number): Promise<StockMovement[]> => {
    return apiClient<StockMovement[]>(`/procurement/goods-receipts/movements/po/${poId}`)
  },

  downloadGoodsReceiptPdf: async (id: number, grnNumber: string): Promise<void> => {
    const token = localStorage.getItem('plaan_token')
    const response = await fetch(`/api/v1/procurement/goods-receipts/${id}/pdf`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok) {
      throw new Error('Failed to download goods receipt PDF.')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${grnNumber || 'goods-receipt'}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },
}
