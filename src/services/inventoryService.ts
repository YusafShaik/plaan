import { apiClient } from '../lib/api'
import type { PageResponse } from '../types/masterData'
import type {
  StockOverviewItem,
  StockOverviewSummary,
  StockOverviewFilterParams,
  StockLedgerData,
  OpeningStock,
  OpeningStockStatus,
  CreateOpeningStockPayload,
  UpdateOpeningStockPayload,
  StockTransfer,
  StockTransferStatus,
  ItemOnHandStock,
  CreateStockTransferPayload,
  UpdateStockTransferPayload,
  StockAdjustment,
  StockAdjustmentStatus,
  CreateStockAdjustmentPayload,
  UpdateStockAdjustmentPayload,
} from '../types/inventory'

export const inventoryService = {
  getStockOverview: async (
    params: StockOverviewFilterParams = {}
  ): Promise<PageResponse<StockOverviewItem>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.warehouseId !== undefined) query.set('warehouseId', String(params.warehouseId))
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.direction) query.set('direction', params.direction)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<StockOverviewItem>>(`/inventory/stock-overview${queryString}`)
  },

  getStockOverviewSummary: async (): Promise<StockOverviewSummary> => {
    return apiClient<StockOverviewSummary>('/inventory/stock-overview/summary')
  },

  getStockLedger: async (params: {
    itemId?: number
    warehouseId?: number
  } = {}): Promise<StockLedgerData> => {
    const query = new URLSearchParams()
    if (params.itemId !== undefined) query.set('itemId', String(params.itemId))
    if (params.warehouseId !== undefined) query.set('warehouseId', String(params.warehouseId))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<StockLedgerData>(`/inventory/stock-ledger${queryString}`)
  },

  // Opening Stock API endpoints
  getOpeningStocks: async (params: {
    search?: string
    status?: OpeningStockStatus
    page?: number
    size?: number
    sortBy?: string
    direction?: 'asc' | 'desc'
  } = {}): Promise<PageResponse<OpeningStock>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.direction) query.set('direction', params.direction)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<OpeningStock>>(`/inventory/opening-stock${queryString}`)
  },

  getNextOpeningStockNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/inventory/opening-stock/next-number')
  },

  getOpeningStockById: async (id: number): Promise<OpeningStock> => {
    return apiClient<OpeningStock>(`/inventory/opening-stock/${id}`)
  },

  createOpeningStock: async (payload: CreateOpeningStockPayload): Promise<OpeningStock> => {
    return apiClient<OpeningStock>('/inventory/opening-stock', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateOpeningStock: async (id: number, payload: UpdateOpeningStockPayload): Promise<OpeningStock> => {
    return apiClient<OpeningStock>(`/inventory/opening-stock/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postOpeningStock: async (id: number): Promise<OpeningStock> => {
    return apiClient<OpeningStock>(`/inventory/opening-stock/${id}/post`, {
      method: 'POST',
    })
  },

  cancelOpeningStock: async (id: number): Promise<OpeningStock> => {
    return apiClient<OpeningStock>(`/inventory/opening-stock/${id}/cancel`, {
      method: 'POST',
    })
  },

  // Stock Transfer API endpoints
  getStockTransfers: async (params: {
    search?: string
    status?: StockTransferStatus
    page?: number
    size?: number
    sortBy?: string
    direction?: 'asc' | 'desc'
  } = {}): Promise<PageResponse<StockTransfer>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.direction) query.set('direction', params.direction)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<StockTransfer>>(`/inventory/stock-transfers${queryString}`)
  },

  getNextTransferNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/inventory/stock-transfers/next-number')
  },

  getWarehouseStock: async (warehouseId: number): Promise<ItemOnHandStock[]> => {
    return apiClient<ItemOnHandStock[]>(`/inventory/stock-transfers/warehouse-stock/${warehouseId}`)
  },

  getStockTransferById: async (id: number): Promise<StockTransfer> => {
    return apiClient<StockTransfer>(`/inventory/stock-transfers/${id}`)
  },

  createStockTransfer: async (payload: CreateStockTransferPayload): Promise<StockTransfer> => {
    return apiClient<StockTransfer>('/inventory/stock-transfers', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateStockTransfer: async (id: number, payload: UpdateStockTransferPayload): Promise<StockTransfer> => {
    return apiClient<StockTransfer>(`/inventory/stock-transfers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postStockTransfer: async (id: number): Promise<StockTransfer> => {
    return apiClient<StockTransfer>(`/inventory/stock-transfers/${id}/post`, {
      method: 'POST',
    })
  },

  cancelStockTransfer: async (id: number): Promise<StockTransfer> => {
    return apiClient<StockTransfer>(`/inventory/stock-transfers/${id}/cancel`, {
      method: 'POST',
    })
  },

  // Stock Adjustment API endpoints
  getStockAdjustments: async (params: {
    search?: string
    status?: StockAdjustmentStatus
    page?: number
    size?: number
    sortBy?: string
    direction?: 'asc' | 'desc'
  } = {}): Promise<PageResponse<StockAdjustment>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.direction) query.set('direction', params.direction)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<StockAdjustment>>(`/inventory/stock-adjustments${queryString}`)
  },

  getNextAdjustmentNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/inventory/stock-adjustments/next-number')
  },

  getStockAdjustmentById: async (id: number): Promise<StockAdjustment> => {
    return apiClient<StockAdjustment>(`/inventory/stock-adjustments/${id}`)
  },

  createStockAdjustment: async (payload: CreateStockAdjustmentPayload): Promise<StockAdjustment> => {
    return apiClient<StockAdjustment>('/inventory/stock-adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateStockAdjustment: async (id: number, payload: UpdateStockAdjustmentPayload): Promise<StockAdjustment> => {
    return apiClient<StockAdjustment>(`/inventory/stock-adjustments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postStockAdjustment: async (id: number): Promise<StockAdjustment> => {
    return apiClient<StockAdjustment>(`/inventory/stock-adjustments/${id}/post`, {
      method: 'POST',
    })
  },

  cancelStockAdjustment: async (id: number): Promise<StockAdjustment> => {
    return apiClient<StockAdjustment>(`/inventory/stock-adjustments/${id}/cancel`, {
      method: 'POST',
    })
  },
}
