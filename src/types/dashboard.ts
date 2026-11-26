export interface DashboardMetrics {
  salesInvoiced: number
  purchasesInvoiced: number
  customerOutstanding: number
  supplierOutstanding: number
}

export interface DashboardTrendMonth {
  monthKey: string
  monthLabel: string
  salesInvoiced: number
  purchasesInvoiced: number
}

export interface DashboardProductionOrders {
  released: number
  inProgress: number
  completed: number
  closed: number
}

export interface DashboardEquipmentStatus {
  breakdown: number
  operational: number
  underMaintenance: number
  activeMachines: number
}

export interface DashboardAttention {
  overduePurchaseOrders: number
  overdueCustomerDispatches: number
  productionOrdersWithMaterialShortage: number
  pendingQualityInspections: number
  overdueCustomerInvoices: number
  overdueSupplierInvoices: number
  overdueMaintenancePlans: number
  equipmentBreakdowns: number
}

export interface DashboardOverview {
  currency: string
  periodLabel: string
  periodFrom: string
  periodTo: string
  metrics: DashboardMetrics
  trend: DashboardTrendMonth[]
  productionOrders: DashboardProductionOrders
  equipmentStatus: DashboardEquipmentStatus
  attention: DashboardAttention
}
