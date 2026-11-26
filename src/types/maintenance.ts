export type EquipmentOperationalStatus = 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'BREAKDOWN'
export type EquipmentRecordStatus = 'ACTIVE' | 'INACTIVE'

export interface Equipment {
  id: number
  equipmentCode: string
  equipmentName: string
  manufacturer?: string | null
  modelNumber?: string | null
  serialNumber?: string | null
  location?: string | null
  installationDate?: string | null
  description?: string | null
  operationalStatus: EquipmentOperationalStatus
  recordStatus: EquipmentRecordStatus
  createdAt: string
  updatedAt: string
}

export interface CreateEquipmentPayload {
  equipmentCode?: string
  equipmentName: string
  manufacturer?: string
  modelNumber?: string
  serialNumber?: string
  location?: string
  installationDate?: string | null
  description?: string
  operationalStatus?: EquipmentOperationalStatus
  recordStatus?: EquipmentRecordStatus
}

export interface UpdateEquipmentPayload {
  equipmentName: string
  manufacturer?: string | null
  modelNumber?: string | null
  serialNumber?: string | null
  location?: string | null
  installationDate?: string | null
  description?: string | null
  operationalStatus: EquipmentOperationalStatus
  recordStatus: EquipmentRecordStatus
}

export interface EquipmentFilterParams {
  search?: string
  operationalStatus?: EquipmentOperationalStatus
  recordStatus?: EquipmentRecordStatus
  page?: number
  size?: number
}

export type MaintenancePlanStatus = 'ACTIVE' | 'INACTIVE'
export type MaintenanceScheduleStatus = 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE'

export interface MaintenancePlan {
  id: number
  planNumber: string
  planName: string
  equipmentId: number
  equipmentCode: string
  equipmentName: string
  frequencyDays: number
  firstDueDate: string
  nextDueDate: string
  lastCompletedDate?: string | null
  instructions: string
  notes?: string | null
  status: MaintenancePlanStatus
  scheduleStatus: MaintenanceScheduleStatus
  createdAt: string
  updatedAt: string
}

export interface CreateMaintenancePlanPayload {
  planNumber?: string
  planName: string
  equipmentId: number
  frequencyDays: number
  firstDueDate: string
  instructions: string
  notes?: string
  status?: MaintenancePlanStatus
}

export interface UpdateMaintenancePlanPayload {
  planName: string
  equipmentId: number
  frequencyDays: number
  firstDueDate: string
  instructions: string
  notes?: string | null
  status: MaintenancePlanStatus
}

export interface MaintenancePlanFilterParams {
  search?: string
  status?: MaintenancePlanStatus
  scheduleStatus?: MaintenanceScheduleStatus
  equipmentId?: number
  page?: number
  size?: number
}

export type MaintenanceWorkOrderType = 'PREVENTIVE' | 'BREAKDOWN'
export type MaintenanceWorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type MaintenanceWorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface MaintenanceWorkOrder {
  id: number
  workOrderNumber: string
  workOrderDate: string
  maintenanceType: MaintenanceWorkOrderType
  status: MaintenanceWorkOrderStatus
  priority: MaintenanceWorkOrderPriority
  equipmentId: number
  equipmentCode: string
  equipmentName: string
  maintenancePlanId?: number | null
  planNumber?: string | null
  planName?: string | null
  activityName: string
  assignedTo?: string | null
  problemDescription?: string | null
  instructions?: string | null
  notes?: string | null
  breakdownDate?: string | null
  breakdownTime?: string | null
  rootBreakdownWorkOrderId?: number | null
  actualStartAt?: string | null
  actualEndAt?: string | null
  workPerformed?: string | null
  completionRemarks?: string | null
  machineOperational?: boolean | null
  durationMinutes?: number | null
  downtimeMinutes?: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateMaintenanceWorkOrderPayload {
  workOrderNumber?: string
  workOrderDate?: string
  maintenanceType: MaintenanceWorkOrderType
  equipmentId: number
  maintenancePlanId?: number | null
  priority?: MaintenanceWorkOrderPriority
  assignedTo?: string
  problemDescription?: string
  notes?: string
  breakdownDate?: string | null
  breakdownTime?: string | null
}

export interface StartMaintenanceWorkOrderPayload {
  startDate?: string | null
  startTime?: string | null
}

export interface CompleteMaintenanceWorkOrderPayload {
  workPerformed: string
  completionDate: string
  completionTime: string
  machineOperational: boolean
  remarks?: string
}

export interface MaintenanceWorkOrderSummary {
  openCount: number
  inProgressCount: number
  completedCount: number
  cancelledCount: number
}

export interface EquipmentMaintenanceHistoryItem {
  workOrderId: number
  workOrderNumber: string
  date: string
  activity: string
  type: MaintenanceWorkOrderType
  durationMinutes?: number | null
}

export interface MaintenanceWorkOrderFilterParams {
  search?: string
  status?: MaintenanceWorkOrderStatus
  type?: MaintenanceWorkOrderType
  equipmentId?: number
  page?: number
  size?: number
}
