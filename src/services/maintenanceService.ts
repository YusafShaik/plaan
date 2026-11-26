import { apiClient } from '../lib/api'
import type { PageResponse } from '../types/masterData'
import type {
  CompleteMaintenanceWorkOrderPayload,
  CreateEquipmentPayload,
  CreateMaintenancePlanPayload,
  CreateMaintenanceWorkOrderPayload,
  Equipment,
  EquipmentFilterParams,
  EquipmentMaintenanceHistoryItem,
  MaintenancePlan,
  MaintenancePlanFilterParams,
  MaintenanceWorkOrder,
  MaintenanceWorkOrderFilterParams,
  MaintenanceWorkOrderSummary,
  StartMaintenanceWorkOrderPayload,
  UpdateEquipmentPayload,
  UpdateMaintenancePlanPayload,
} from '../types/maintenance'

export const maintenanceService = {
  getEquipment: async (
    params: EquipmentFilterParams = {}
  ): Promise<PageResponse<Equipment>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.operationalStatus) query.set('operationalStatus', params.operationalStatus)
    if (params.recordStatus) query.set('recordStatus', params.recordStatus)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<Equipment>>(`/maintenance/equipment${qs}`)
  },

  getEquipmentById: async (id: number): Promise<Equipment> => {
    return apiClient<Equipment>(`/maintenance/equipment/${id}`)
  },

  getNextEquipmentCode: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/maintenance/equipment/next-code')
  },

  createEquipment: async (payload: CreateEquipmentPayload): Promise<Equipment> => {
    return apiClient<Equipment>('/maintenance/equipment', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateEquipment: async (id: number, payload: UpdateEquipmentPayload): Promise<Equipment> => {
    return apiClient<Equipment>(`/maintenance/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  activateEquipment: async (id: number): Promise<Equipment> => {
    return apiClient<Equipment>(`/maintenance/equipment/${id}/activate`, {
      method: 'POST',
    })
  },

  deactivateEquipment: async (id: number): Promise<Equipment> => {
    return apiClient<Equipment>(`/maintenance/equipment/${id}/deactivate`, {
      method: 'POST',
    })
  },

  getMaintenancePlans: async (
    params: MaintenancePlanFilterParams = {}
  ): Promise<PageResponse<MaintenancePlan>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.scheduleStatus) query.set('scheduleStatus', params.scheduleStatus)
    if (params.equipmentId !== undefined) query.set('equipmentId', String(params.equipmentId))
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<MaintenancePlan>>(`/maintenance/plans${qs}`)
  },

  getMaintenancePlansByEquipment: async (equipmentId: number): Promise<MaintenancePlan[]> => {
    return apiClient<MaintenancePlan[]>(`/maintenance/plans/by-equipment/${equipmentId}`)
  },

  getMaintenancePlanById: async (id: number): Promise<MaintenancePlan> => {
    return apiClient<MaintenancePlan>(`/maintenance/plans/${id}`)
  },

  getNextPlanNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/maintenance/plans/next-number')
  },

  createMaintenancePlan: async (
    payload: CreateMaintenancePlanPayload
  ): Promise<MaintenancePlan> => {
    return apiClient<MaintenancePlan>('/maintenance/plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateMaintenancePlan: async (
    id: number,
    payload: UpdateMaintenancePlanPayload
  ): Promise<MaintenancePlan> => {
    return apiClient<MaintenancePlan>(`/maintenance/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  activateMaintenancePlan: async (id: number): Promise<MaintenancePlan> => {
    return apiClient<MaintenancePlan>(`/maintenance/plans/${id}/activate`, {
      method: 'POST',
    })
  },

  deactivateMaintenancePlan: async (id: number): Promise<MaintenancePlan> => {
    return apiClient<MaintenancePlan>(`/maintenance/plans/${id}/deactivate`, {
      method: 'POST',
    })
  },

  getWorkOrders: async (
    params: MaintenanceWorkOrderFilterParams = {}
  ): Promise<PageResponse<MaintenanceWorkOrder>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.type) query.set('type', params.type)
    if (params.equipmentId !== undefined) query.set('equipmentId', String(params.equipmentId))
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<MaintenanceWorkOrder>>(`/maintenance/work-orders${qs}`)
  },

  getWorkOrderSummary: async (): Promise<MaintenanceWorkOrderSummary> => {
    return apiClient<MaintenanceWorkOrderSummary>('/maintenance/work-orders/summary')
  },

  getWorkOrderById: async (id: number): Promise<MaintenanceWorkOrder> => {
    return apiClient<MaintenanceWorkOrder>(`/maintenance/work-orders/${id}`)
  },

  getNextWorkOrderNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/maintenance/work-orders/next-number')
  },

  getEquipmentMaintenanceHistory: async (
    equipmentId: number
  ): Promise<EquipmentMaintenanceHistoryItem[]> => {
    return apiClient<EquipmentMaintenanceHistoryItem[]>(
      `/maintenance/work-orders/history/by-equipment/${equipmentId}`
    )
  },

  createWorkOrder: async (
    payload: CreateMaintenanceWorkOrderPayload
  ): Promise<MaintenanceWorkOrder> => {
    return apiClient<MaintenanceWorkOrder>('/maintenance/work-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  startWorkOrder: async (
    id: number,
    payload: StartMaintenanceWorkOrderPayload = {}
  ): Promise<MaintenanceWorkOrder> => {
    return apiClient<MaintenanceWorkOrder>(`/maintenance/work-orders/${id}/start`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  completeWorkOrder: async (
    id: number,
    payload: CompleteMaintenanceWorkOrderPayload
  ): Promise<MaintenanceWorkOrder> => {
    return apiClient<MaintenanceWorkOrder>(`/maintenance/work-orders/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  cancelWorkOrder: async (id: number): Promise<MaintenanceWorkOrder> => {
    return apiClient<MaintenanceWorkOrder>(`/maintenance/work-orders/${id}/cancel`, {
      method: 'POST',
    })
  },
}
