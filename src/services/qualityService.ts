import { apiClient } from '../lib/api'
import type { PageResponse } from '../types/masterData'
import type {
  CreateInspectionTemplatePayload,
  FinishedGoodsInspection,
  FinishedGoodsInspectionFilterParams,
  IncomingInspection,
  IncomingInspectionFilterParams,
  InspectionTemplate,
  InspectionTemplateFilterParams,
  InspectionType,
  UpdateFinishedGoodsInspectionPayload,
  UpdateIncomingInspectionPayload,
  UpdateInspectionTemplatePayload,
} from '../types/quality'

export const qualityService = {
  getTemplates: async (
    params: InspectionTemplateFilterParams = {}
  ): Promise<PageResponse<InspectionTemplate>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.inspectionType) query.set('inspectionType', params.inspectionType)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<InspectionTemplate>>(`/quality/inspection-templates${qs}`)
  },

  getTemplateById: async (id: number): Promise<InspectionTemplate> => {
    return apiClient<InspectionTemplate>(`/quality/inspection-templates/${id}`)
  },

  getNextTemplateCode: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/quality/inspection-templates/next-code')
  },

  getActiveTemplate: async (
    itemId: number,
    inspectionType: InspectionType
  ): Promise<InspectionTemplate> => {
    return apiClient<InspectionTemplate>(
      `/quality/inspection-templates/active?itemId=${itemId}&inspectionType=${inspectionType}`
    )
  },

  createTemplate: async (payload: CreateInspectionTemplatePayload): Promise<InspectionTemplate> => {
    return apiClient<InspectionTemplate>('/quality/inspection-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateTemplate: async (
    id: number,
    payload: UpdateInspectionTemplatePayload
  ): Promise<InspectionTemplate> => {
    return apiClient<InspectionTemplate>(`/quality/inspection-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  activateTemplate: async (id: number): Promise<InspectionTemplate> => {
    return apiClient<InspectionTemplate>(`/quality/inspection-templates/${id}/activate`, {
      method: 'POST',
    })
  },

  deactivateTemplate: async (id: number): Promise<InspectionTemplate> => {
    return apiClient<InspectionTemplate>(`/quality/inspection-templates/${id}/deactivate`, {
      method: 'POST',
    })
  },

  deleteDraftTemplate: async (id: number): Promise<void> => {
    return apiClient<void>(`/quality/inspection-templates/${id}`, {
      method: 'DELETE',
    })
  },

  getIncomingInspections: async (
    params: IncomingInspectionFilterParams = {}
  ): Promise<PageResponse<IncomingInspection>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<IncomingInspection>>(`/quality/incoming-inspections${qs}`)
  },

  getIncomingInspectionById: async (id: number): Promise<IncomingInspection> => {
    return apiClient<IncomingInspection>(`/quality/incoming-inspections/${id}`)
  },

  updateIncomingInspection: async (
    id: number,
    payload: UpdateIncomingInspectionPayload
  ): Promise<IncomingInspection> => {
    return apiClient<IncomingInspection>(`/quality/incoming-inspections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  completeIncomingInspection: async (
    id: number,
    payload: UpdateIncomingInspectionPayload
  ): Promise<IncomingInspection> => {
    return apiClient<IncomingInspection>(`/quality/incoming-inspections/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getFinishedGoodsInspections: async (
    params: FinishedGoodsInspectionFilterParams = {}
  ): Promise<PageResponse<FinishedGoodsInspection>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<FinishedGoodsInspection>>(
      `/quality/finished-goods-inspections${qs}`
    )
  },

  getFinishedGoodsInspectionById: async (id: number): Promise<FinishedGoodsInspection> => {
    return apiClient<FinishedGoodsInspection>(`/quality/finished-goods-inspections/${id}`)
  },

  updateFinishedGoodsInspection: async (
    id: number,
    payload: UpdateFinishedGoodsInspectionPayload
  ): Promise<FinishedGoodsInspection> => {
    return apiClient<FinishedGoodsInspection>(`/quality/finished-goods-inspections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  completeFinishedGoodsInspection: async (
    id: number,
    payload: UpdateFinishedGoodsInspectionPayload
  ): Promise<FinishedGoodsInspection> => {
    return apiClient<FinishedGoodsInspection>(
      `/quality/finished-goods-inspections/${id}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
  },
}
