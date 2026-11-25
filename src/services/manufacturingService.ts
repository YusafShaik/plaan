import { apiClient } from '../lib/api'
import type { PageResponse } from '../types/masterData'
import type {
  Bom,
  BomStatus,
  CreateBomPayload,
  UpdateBomPayload,
  NextBomCodeResponse,
  ProductionOrder,
  ProductionOrderStatus,
  CreateProductionOrderPayload,
  UpdateProductionOrderPayload,
  MaterialRequirementPreview,
  NextProductionOrderNumberResponse,
  ProductionOrderAvailability,
  MaterialIssue,
  MaterialIssueStatus,
  CreateMaterialIssuePayload,
  UpdateMaterialIssuePayload,
  NextMaterialIssueNumberResponse,
  MaterialConsumption,
  CreateMaterialConsumptionPayload,
  UpdateMaterialConsumptionPayload,
  NextMaterialConsumptionNumberResponse,
  MaterialReturn,
  CreateMaterialReturnPayload,
  UpdateMaterialReturnPayload,
  NextMaterialReturnNumberResponse,
  MaterialTransaction,
  ProductionReceipt,
  CreateProductionReceiptPayload,
  UpdateProductionReceiptPayload,
  NextProductionReceiptNumberResponse,
  CloseProductionOrderPayload,
  ProductionOrderClosureValidation,
} from '../types/manufacturing'

export const manufacturingService = {
  // BOM APIs
  getBoms: async (params: {
    search?: string
    status?: BomStatus | ''
    page?: number
    size?: number
    sortBy?: string
    direction?: string
  } = {}): Promise<PageResponse<Bom>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.direction) query.set('direction', params.direction)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<Bom>>(`/manufacturing/boms${queryString}`)
  },

  getBomById: async (id: number): Promise<Bom> => {
    return apiClient<Bom>(`/manufacturing/boms/${id}`)
  },

  getNextBomCode: async (): Promise<NextBomCodeResponse> => {
    return apiClient<NextBomCodeResponse>('/manufacturing/boms/next-code')
  },

  getActiveBomForProduct: async (productId: number): Promise<Bom | null> => {
    return apiClient<Bom | null>(`/manufacturing/boms/active-for-product/${productId}`)
  },

  createBom: async (payload: CreateBomPayload): Promise<Bom> => {
    return apiClient<Bom>('/manufacturing/boms', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateBom: async (id: number, payload: UpdateBomPayload): Promise<Bom> => {
    return apiClient<Bom>(`/manufacturing/boms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  activateBom: async (id: number): Promise<Bom> => {
    return apiClient<Bom>(`/manufacturing/boms/${id}/activate`, {
      method: 'POST',
    })
  },

  deactivateBom: async (id: number): Promise<Bom> => {
    return apiClient<Bom>(`/manufacturing/boms/${id}/deactivate`, {
      method: 'POST',
    })
  },

  deleteDraftBom: async (id: number): Promise<void> => {
    return apiClient<void>(`/manufacturing/boms/${id}`, {
      method: 'DELETE',
    })
  },

  // Production Order APIs
  getProductionOrders: async (params: {
    search?: string
    status?: ProductionOrderStatus | ''
    page?: number
    size?: number
    sortBy?: string
    direction?: string
  } = {}): Promise<PageResponse<ProductionOrder>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.direction) query.set('direction', params.direction)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<ProductionOrder>>(`/manufacturing/production-orders${queryString}`)
  },

  getProductionOrderById: async (id: number): Promise<ProductionOrder> => {
    return apiClient<ProductionOrder>(`/manufacturing/production-orders/${id}`)
  },

  getNextProductionOrderNumber: async (): Promise<NextProductionOrderNumberResponse> => {
    return apiClient<NextProductionOrderNumberResponse>('/manufacturing/production-orders/next-number')
  },

  previewRequirements: async (
    productId: number,
    productionQuantity: number
  ): Promise<MaterialRequirementPreview> => {
    const query = new URLSearchParams()
    query.set('productId', String(productId))
    query.set('productionQuantity', String(productionQuantity))
    return apiClient<MaterialRequirementPreview>(
      `/manufacturing/production-orders/preview-requirements?${query.toString()}`
    )
  },

  createProductionOrder: async (
    payload: CreateProductionOrderPayload
  ): Promise<ProductionOrder> => {
    return apiClient<ProductionOrder>('/manufacturing/production-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateProductionOrder: async (
    id: number,
    payload: UpdateProductionOrderPayload
  ): Promise<ProductionOrder> => {
    return apiClient<ProductionOrder>(`/manufacturing/production-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  releaseProductionOrder: async (id: number): Promise<ProductionOrder> => {
    return apiClient<ProductionOrder>(`/manufacturing/production-orders/${id}/release`, {
      method: 'POST',
    })
  },

  cancelProductionOrder: async (id: number): Promise<ProductionOrder> => {
    return apiClient<ProductionOrder>(`/manufacturing/production-orders/${id}/cancel`, {
      method: 'POST',
    })
  },

  deleteDraftProductionOrder: async (id: number): Promise<void> => {
    return apiClient<void>(`/manufacturing/production-orders/${id}`, {
      method: 'DELETE',
    })
  },

  getMaterialAvailability: async (id: number): Promise<ProductionOrderAvailability> => {
    return apiClient<ProductionOrderAvailability>(`/manufacturing/production-orders/${id}/availability`)
  },

  // Material Issue APIs
  getMaterialIssues: async (params: {
    productionOrderId?: number
    status?: MaterialIssueStatus | ''
    page?: number
    size?: number
    sortBy?: string
    direction?: string
  } = {}): Promise<PageResponse<MaterialIssue>> => {
    const query = new URLSearchParams()
    if (params.productionOrderId) query.set('productionOrderId', String(params.productionOrderId))
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.direction) query.set('direction', params.direction)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<MaterialIssue>>(`/manufacturing/material-issues${queryString}`)
  },

  getMaterialIssueById: async (id: number): Promise<MaterialIssue> => {
    return apiClient<MaterialIssue>(`/manufacturing/material-issues/${id}`)
  },

  getNextMaterialIssueNumber: async (): Promise<NextMaterialIssueNumberResponse> => {
    return apiClient<NextMaterialIssueNumberResponse>('/manufacturing/material-issues/next-number')
  },

  getMaterialIssuesByProductionOrder: async (productionOrderId: number): Promise<MaterialIssue[]> => {
    return apiClient<MaterialIssue[]>(`/manufacturing/material-issues/by-production-order/${productionOrderId}`)
  },

  createMaterialIssue: async (payload: CreateMaterialIssuePayload): Promise<MaterialIssue> => {
    return apiClient<MaterialIssue>('/manufacturing/material-issues', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateMaterialIssue: async (id: number, payload: UpdateMaterialIssuePayload): Promise<MaterialIssue> => {
    return apiClient<MaterialIssue>(`/manufacturing/material-issues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postMaterialIssue: async (id: number): Promise<MaterialIssue> => {
    return apiClient<MaterialIssue>(`/manufacturing/material-issues/${id}/post`, {
      method: 'POST',
    })
  },

  deleteDraftMaterialIssue: async (id: number): Promise<void> => {
    return apiClient<void>(`/manufacturing/material-issues/${id}`, {
      method: 'DELETE',
    })
  },

  // Material Consumption APIs
  getNextMaterialConsumptionNumber: async (): Promise<NextMaterialConsumptionNumberResponse> => {
    return apiClient<NextMaterialConsumptionNumberResponse>('/manufacturing/material-consumptions/next-number')
  },

  getMaterialConsumptionsByProductionOrder: async (productionOrderId: number): Promise<MaterialConsumption[]> => {
    return apiClient<MaterialConsumption[]>(`/manufacturing/material-consumptions/by-production-order/${productionOrderId}`)
  },

  getMaterialConsumptionById: async (id: number): Promise<MaterialConsumption> => {
    return apiClient<MaterialConsumption>(`/manufacturing/material-consumptions/${id}`)
  },

  createMaterialConsumption: async (payload: CreateMaterialConsumptionPayload): Promise<MaterialConsumption> => {
    return apiClient<MaterialConsumption>('/manufacturing/material-consumptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateMaterialConsumption: async (id: number, payload: UpdateMaterialConsumptionPayload): Promise<MaterialConsumption> => {
    return apiClient<MaterialConsumption>(`/manufacturing/material-consumptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postMaterialConsumption: async (id: number): Promise<MaterialConsumption> => {
    return apiClient<MaterialConsumption>(`/manufacturing/material-consumptions/${id}/post`, {
      method: 'POST',
    })
  },

  deleteDraftMaterialConsumption: async (id: number): Promise<void> => {
    return apiClient<void>(`/manufacturing/material-consumptions/${id}`, {
      method: 'DELETE',
    })
  },

  // Material Return APIs
  getNextMaterialReturnNumber: async (): Promise<NextMaterialReturnNumberResponse> => {
    return apiClient<NextMaterialReturnNumberResponse>('/manufacturing/material-returns/next-number')
  },

  getMaterialReturnsByProductionOrder: async (productionOrderId: number): Promise<MaterialReturn[]> => {
    return apiClient<MaterialReturn[]>(`/manufacturing/material-returns/by-production-order/${productionOrderId}`)
  },

  getMaterialReturnById: async (id: number): Promise<MaterialReturn> => {
    return apiClient<MaterialReturn>(`/manufacturing/material-returns/${id}`)
  },

  createMaterialReturn: async (payload: CreateMaterialReturnPayload): Promise<MaterialReturn> => {
    return apiClient<MaterialReturn>('/manufacturing/material-returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateMaterialReturn: async (id: number, payload: UpdateMaterialReturnPayload): Promise<MaterialReturn> => {
    return apiClient<MaterialReturn>(`/manufacturing/material-returns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postMaterialReturn: async (id: number): Promise<MaterialReturn> => {
    return apiClient<MaterialReturn>(`/manufacturing/material-returns/${id}/post`, {
      method: 'POST',
    })
  },

  deleteDraftMaterialReturn: async (id: number): Promise<void> => {
    return apiClient<void>(`/manufacturing/material-returns/${id}`, {
      method: 'DELETE',
    })
  },

  // Unified Material Transactions
  getMaterialTransactions: async (productionOrderId: number): Promise<MaterialTransaction[]> => {
    return apiClient<MaterialTransaction[]>(`/manufacturing/production-orders/${productionOrderId}/transactions`)
  },

  // Production Receipt APIs
  getNextProductionReceiptNumber: async (): Promise<NextProductionReceiptNumberResponse> => {
    return apiClient<NextProductionReceiptNumberResponse>('/manufacturing/production-receipts/next-number')
  },

  getProductionReceiptsByProductionOrder: async (productionOrderId: number): Promise<ProductionReceipt[]> => {
    return apiClient<ProductionReceipt[]>(`/manufacturing/production-receipts/by-production-order/${productionOrderId}`)
  },

  getProductionReceiptById: async (id: number): Promise<ProductionReceipt> => {
    return apiClient<ProductionReceipt>(`/manufacturing/production-receipts/${id}`)
  },

  createProductionReceipt: async (payload: CreateProductionReceiptPayload): Promise<ProductionReceipt> => {
    return apiClient<ProductionReceipt>('/manufacturing/production-receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateProductionReceipt: async (id: number, payload: UpdateProductionReceiptPayload): Promise<ProductionReceipt> => {
    return apiClient<ProductionReceipt>(`/manufacturing/production-receipts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postProductionReceipt: async (id: number): Promise<ProductionReceipt> => {
    return apiClient<ProductionReceipt>(`/manufacturing/production-receipts/${id}/post`, {
      method: 'POST',
    })
  },

  deleteDraftProductionReceipt: async (id: number): Promise<void> => {
    return apiClient<void>(`/manufacturing/production-receipts/${id}`, {
      method: 'DELETE',
    })
  },

  // Completion & Closure APIs
  completeProductionOrder: async (id: number): Promise<ProductionOrder> => {
    return apiClient<ProductionOrder>(`/manufacturing/production-orders/${id}/complete`, {
      method: 'POST',
    })
  },

  closeProductionOrder: async (id: number, payload?: CloseProductionOrderPayload): Promise<ProductionOrder> => {
    return apiClient<ProductionOrder>(`/manufacturing/production-orders/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    })
  },

  getClosureValidation: async (id: number): Promise<ProductionOrderClosureValidation> => {
    return apiClient<ProductionOrderClosureValidation>(`/manufacturing/production-orders/${id}/closure-validation`)
  },
}
