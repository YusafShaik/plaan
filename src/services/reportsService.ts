import { apiClient } from '../lib/api'
import type {
  InspectionSummaryFilterParams,
  InspectionSummaryReport,
  MaterialConsumptionFilterParams,
  MaterialConsumptionReport,
  PendingDispatchFilterParams,
  PendingDispatchReport,
  PendingPurchaseOrderFilterParams,
  PendingPurchaseOrderReport,
  ProductionSummaryFilterParams,
  ProductionSummaryReport,
  PurchaseSummaryFilterParams,
  PurchaseSummaryReport,
  RejectionReport,
  RejectionReportFilterParams,
  StockMovementsFilterParams,
  StockMovementsReport,
  StockSummaryFilterParams,
  StockSummaryReport,
  SupplierOutstandingFilterParams,
  SupplierOutstandingReport,
  CustomerOutstandingFilterParams,
  CustomerOutstandingReport,
  ExpenseReportFilterParams,
  ExpenseReport,
  MaintenanceHistoryFilterParams,
  MaintenanceHistoryReport,
  DueOverdueMaintenanceFilterParams,
  DueOverdueMaintenanceReport,
  EquipmentDowntimeFilterParams,
  EquipmentDowntimeReport,
} from '../types/reports'

function buildPurchaseSummaryQuery(params: PurchaseSummaryFilterParams): string {
  const query = new URLSearchParams()
  if (params.fromDate) query.set('fromDate', params.fromDate)
  if (params.toDate) query.set('toDate', params.toDate)
  if (params.supplierId !== undefined) query.set('supplierId', String(params.supplierId))
  if (params.warehouseId !== undefined) query.set('warehouseId', String(params.warehouseId))
  if (params.status) query.set('status', params.status)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildPendingPoQuery(params: PendingPurchaseOrderFilterParams): string {
  const query = new URLSearchParams()
  if (params.supplierId !== undefined) query.set('supplierId', String(params.supplierId))
  if (params.itemId !== undefined) query.set('itemId', String(params.itemId))
  if (params.warehouseId !== undefined) query.set('warehouseId', String(params.warehouseId))
  if (params.deliveryStatus) query.set('deliveryStatus', params.deliveryStatus)
  if (params.expectedFrom) query.set('expectedFrom', params.expectedFrom)
  if (params.expectedTo) query.set('expectedTo', params.expectedTo)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

async function downloadCsv(path: string, filename: string) {
  const token = localStorage.getItem('plaan_token')
  const response = await fetch(`/api/v1${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to export ${filename}.`)
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export const reportsService = {
  getPurchaseSummary: async (
    params: PurchaseSummaryFilterParams = {}
  ): Promise<PurchaseSummaryReport> => {
    return apiClient<PurchaseSummaryReport>(
      `/reports/purchase-summary${buildPurchaseSummaryQuery(params)}`
    )
  },

  exportPurchaseSummaryCsv: async (params: PurchaseSummaryFilterParams = {}): Promise<void> => {
    await downloadCsv(
      `/reports/purchase-summary/export${buildPurchaseSummaryQuery(params)}`,
      `purchase_summary_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getPendingPurchaseOrders: async (
    params: PendingPurchaseOrderFilterParams = {}
  ): Promise<PendingPurchaseOrderReport> => {
    return apiClient<PendingPurchaseOrderReport>(
      `/reports/pending-purchase-orders${buildPendingPoQuery(params)}`
    )
  },

  exportPendingPurchaseOrdersCsv: async (
    params: PendingPurchaseOrderFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/pending-purchase-orders/export${buildPendingPoQuery(params)}`,
      `pending_purchase_orders_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getStockSummary: async (
    params: StockSummaryFilterParams = {}
  ): Promise<StockSummaryReport> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.warehouseId !== undefined) query.set('warehouseId', String(params.warehouseId))
    if (params.itemTypeId !== undefined) query.set('itemTypeId', String(params.itemTypeId))
    if (params.stockStatus) query.set('stockStatus', params.stockStatus)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiClient<StockSummaryReport>(`/reports/stock-summary${qs}`)
  },

  exportStockSummaryCsv: async (params: StockSummaryFilterParams = {}): Promise<void> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.warehouseId !== undefined) query.set('warehouseId', String(params.warehouseId))
    if (params.itemTypeId !== undefined) query.set('itemTypeId', String(params.itemTypeId))
    if (params.stockStatus) query.set('stockStatus', params.stockStatus)
    const qs = query.toString() ? `?${query.toString()}` : ''
    await downloadCsv(
      `/reports/stock-summary/export${qs}`,
      `stock_summary_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getStockMovements: async (
    params: StockMovementsFilterParams = {}
  ): Promise<StockMovementsReport> => {
    return apiClient<StockMovementsReport>(
      `/reports/stock-movements${buildStockMovementsQuery(params)}`
    )
  },

  exportStockMovementsCsv: async (params: StockMovementsFilterParams = {}): Promise<void> => {
    await downloadCsv(
      `/reports/stock-movements/export${buildStockMovementsQuery(params)}`,
      `stock_movements_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getProductionSummary: async (
    params: ProductionSummaryFilterParams = {}
  ): Promise<ProductionSummaryReport> => {
    return apiClient<ProductionSummaryReport>(
      `/reports/production-summary${buildProductionSummaryQuery(params)}`
    )
  },

  exportProductionSummaryCsv: async (
    params: ProductionSummaryFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/production-summary/export${buildProductionSummaryQuery(params)}`,
      `production_summary_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getMaterialConsumption: async (
    params: MaterialConsumptionFilterParams = {}
  ): Promise<MaterialConsumptionReport> => {
    return apiClient<MaterialConsumptionReport>(
      `/reports/material-consumption${buildMaterialConsumptionQuery(params)}`
    )
  },

  exportMaterialConsumptionCsv: async (
    params: MaterialConsumptionFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/material-consumption/export${buildMaterialConsumptionQuery(params)}`,
      `material_consumption_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getInspectionSummary: async (
    params: InspectionSummaryFilterParams = {}
  ): Promise<InspectionSummaryReport> => {
    return apiClient<InspectionSummaryReport>(
      `/reports/inspection-summary${buildInspectionSummaryQuery(params)}`
    )
  },

  exportInspectionSummaryCsv: async (
    params: InspectionSummaryFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/inspection-summary/export${buildInspectionSummaryQuery(params)}`,
      `inspection_summary_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getRejectionReport: async (
    params: RejectionReportFilterParams = {}
  ): Promise<RejectionReport> => {
    return apiClient<RejectionReport>(
      `/reports/rejection-report${buildRejectionReportQuery(params)}`
    )
  },

  exportRejectionReportCsv: async (
    params: RejectionReportFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/rejection-report/export${buildRejectionReportQuery(params)}`,
      `rejection_report_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getPendingDispatches: async (
    params: PendingDispatchFilterParams = {}
  ): Promise<PendingDispatchReport> => {
    return apiClient<PendingDispatchReport>(
      `/reports/pending-dispatches${buildPendingDispatchQuery(params)}`
    )
  },

  exportPendingDispatchesCsv: async (
    params: PendingDispatchFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/pending-dispatches/export${buildPendingDispatchQuery(params)}`,
      `pending_dispatches_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getSupplierOutstanding: async (
    params: SupplierOutstandingFilterParams = {}
  ): Promise<SupplierOutstandingReport> => {
    return apiClient<SupplierOutstandingReport>(
      `/reports/supplier-outstanding${buildSupplierOutstandingQuery(params)}`
    )
  },

  exportSupplierOutstandingCsv: async (
    params: SupplierOutstandingFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/supplier-outstanding/export${buildSupplierOutstandingQuery(params)}`,
      `supplier_outstanding_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getCustomerOutstanding: async (
    params: CustomerOutstandingFilterParams = {}
  ): Promise<CustomerOutstandingReport> => {
    return apiClient<CustomerOutstandingReport>(
      `/reports/customer-outstanding${buildCustomerOutstandingQuery(params)}`
    )
  },

  exportCustomerOutstandingCsv: async (
    params: CustomerOutstandingFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/customer-outstanding/export${buildCustomerOutstandingQuery(params)}`,
      `customer_outstanding_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getExpenseReport: async (
    params: ExpenseReportFilterParams = {}
  ): Promise<ExpenseReport> => {
    return apiClient<ExpenseReport>(
      `/reports/expense-report${buildExpenseReportQuery(params)}`
    )
  },

  exportExpenseReportCsv: async (
    params: ExpenseReportFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/expense-report/export${buildExpenseReportQuery(params)}`,
      `expense_report_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getMaintenanceHistory: async (
    params: MaintenanceHistoryFilterParams = {}
  ): Promise<MaintenanceHistoryReport> => {
    return apiClient<MaintenanceHistoryReport>(
      `/reports/maintenance-history${buildMaintenanceHistoryQuery(params)}`
    )
  },

  exportMaintenanceHistoryCsv: async (
    params: MaintenanceHistoryFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/maintenance-history/export${buildMaintenanceHistoryQuery(params)}`,
      `maintenance_history_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getDueOverdueMaintenance: async (
    params: DueOverdueMaintenanceFilterParams = {}
  ): Promise<DueOverdueMaintenanceReport> => {
    return apiClient<DueOverdueMaintenanceReport>(
      `/reports/due-overdue-maintenance${buildDueOverdueMaintenanceQuery(params)}`
    )
  },

  exportDueOverdueMaintenanceCsv: async (
    params: DueOverdueMaintenanceFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/due-overdue-maintenance/export${buildDueOverdueMaintenanceQuery(params)}`,
      `due_overdue_maintenance_${new Date().toISOString().split('T')[0]}.csv`
    )
  },

  getEquipmentDowntime: async (
    params: EquipmentDowntimeFilterParams = {}
  ): Promise<EquipmentDowntimeReport> => {
    return apiClient<EquipmentDowntimeReport>(
      `/reports/equipment-downtime${buildEquipmentDowntimeQuery(params)}`
    )
  },

  exportEquipmentDowntimeCsv: async (
    params: EquipmentDowntimeFilterParams = {}
  ): Promise<void> => {
    await downloadCsv(
      `/reports/equipment-downtime/export${buildEquipmentDowntimeQuery(params)}`,
      `equipment_downtime_${new Date().toISOString().split('T')[0]}.csv`
    )
  },
}

function buildStockMovementsQuery(params: StockMovementsFilterParams): string {
  const query = new URLSearchParams()
  if (params.fromDate) query.set('fromDate', params.fromDate)
  if (params.toDate) query.set('toDate', params.toDate)
  if (params.itemId !== undefined) query.set('itemId', String(params.itemId))
  if (params.warehouseId !== undefined) query.set('warehouseId', String(params.warehouseId))
  if (params.movementType) query.set('movementType', params.movementType)
  if (params.reference) query.set('reference', params.reference)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildProductionSummaryQuery(params: ProductionSummaryFilterParams): string {
  const query = new URLSearchParams()
  if (params.fromDate) query.set('fromDate', params.fromDate)
  if (params.toDate) query.set('toDate', params.toDate)
  if (params.productId !== undefined) query.set('productId', String(params.productId))
  if (params.sourceWarehouseId !== undefined) {
    query.set('sourceWarehouseId', String(params.sourceWarehouseId))
  }
  if (params.finishedGoodsWarehouseId !== undefined) {
    query.set('finishedGoodsWarehouseId', String(params.finishedGoodsWarehouseId))
  }
  if (params.status) query.set('status', params.status)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildMaterialConsumptionQuery(params: MaterialConsumptionFilterParams): string {
  const query = new URLSearchParams()
  if (params.fromDate) query.set('fromDate', params.fromDate)
  if (params.toDate) query.set('toDate', params.toDate)
  if (params.productionOrderId !== undefined) {
    query.set('productionOrderId', String(params.productionOrderId))
  }
  if (params.productId !== undefined) query.set('productId', String(params.productId))
  if (params.materialId !== undefined) query.set('materialId', String(params.materialId))
  if (params.sourceWarehouseId !== undefined) {
    query.set('sourceWarehouseId', String(params.sourceWarehouseId))
  }
  if (params.status) query.set('status', params.status)
  if (params.unreconciledOnly !== undefined) {
    query.set('unreconciledOnly', String(params.unreconciledOnly))
  }
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildInspectionSummaryQuery(params: InspectionSummaryFilterParams): string {
  const query = new URLSearchParams()
  if (params.fromDate) query.set('fromDate', params.fromDate)
  if (params.toDate) query.set('toDate', params.toDate)
  if (params.inspectionType) query.set('inspectionType', params.inspectionType)
  if (params.itemId !== undefined) query.set('itemId', String(params.itemId))
  if (params.warehouseId !== undefined) query.set('warehouseId', String(params.warehouseId))
  if (params.status) query.set('status', params.status)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildRejectionReportQuery(params: RejectionReportFilterParams): string {
  const query = new URLSearchParams()
  if (params.fromDate) query.set('fromDate', params.fromDate)
  if (params.toDate) query.set('toDate', params.toDate)
  if (params.inspectionType) query.set('inspectionType', params.inspectionType)
  if (params.itemId !== undefined) query.set('itemId', String(params.itemId))
  if (params.warehouseId !== undefined) query.set('warehouseId', String(params.warehouseId))
  if (params.supplierId !== undefined) query.set('supplierId', String(params.supplierId))
  if (params.productionOrderId !== undefined) {
    query.set('productionOrderId', String(params.productionOrderId))
  }
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildPendingDispatchQuery(params: PendingDispatchFilterParams): string {
  const query = new URLSearchParams()
  if (params.customerId !== undefined) query.set('customerId', String(params.customerId))
  if (params.itemId !== undefined) query.set('itemId', String(params.itemId))
  if (params.warehouseId !== undefined) query.set('warehouseId', String(params.warehouseId))
  if (params.deliveryStatus) query.set('deliveryStatus', params.deliveryStatus)
  if (params.expectedFrom) query.set('expectedFrom', params.expectedFrom)
  if (params.expectedTo) query.set('expectedTo', params.expectedTo)
  if (params.stockAvailability) query.set('stockAvailability', params.stockAvailability)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildSupplierOutstandingQuery(params: SupplierOutstandingFilterParams): string {
  const query = new URLSearchParams()
  if (params.supplierId !== undefined) query.set('supplierId', String(params.supplierId))
  if (params.invoiceFrom) query.set('invoiceFrom', params.invoiceFrom)
  if (params.invoiceTo) query.set('invoiceTo', params.invoiceTo)
  if (params.dueFrom) query.set('dueFrom', params.dueFrom)
  if (params.dueTo) query.set('dueTo', params.dueTo)
  if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus)
  if (params.dueStatus) query.set('dueStatus', params.dueStatus)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildCustomerOutstandingQuery(params: CustomerOutstandingFilterParams): string {
  const query = new URLSearchParams()
  if (params.customerId !== undefined) query.set('customerId', String(params.customerId))
  if (params.invoiceFrom) query.set('invoiceFrom', params.invoiceFrom)
  if (params.invoiceTo) query.set('invoiceTo', params.invoiceTo)
  if (params.dueFrom) query.set('dueFrom', params.dueFrom)
  if (params.dueTo) query.set('dueTo', params.dueTo)
  if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus)
  if (params.dueStatus) query.set('dueStatus', params.dueStatus)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildExpenseReportQuery(params: ExpenseReportFilterParams): string {
  const query = new URLSearchParams()
  if (params.fromDate) query.set('fromDate', params.fromDate)
  if (params.toDate) query.set('toDate', params.toDate)
  if (params.categoryId !== undefined) query.set('categoryId', String(params.categoryId))
  if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod)
  if (params.search) query.set('search', params.search)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildMaintenanceHistoryQuery(params: MaintenanceHistoryFilterParams): string {
  const query = new URLSearchParams()
  if (params.fromDate) query.set('fromDate', params.fromDate)
  if (params.toDate) query.set('toDate', params.toDate)
  if (params.equipmentId !== undefined) query.set('equipmentId', String(params.equipmentId))
  if (params.maintenanceType) query.set('maintenanceType', params.maintenanceType)
  if (params.technician) query.set('technician', params.technician)
  if (params.machineOperational !== undefined) {
    query.set('machineOperational', String(params.machineOperational))
  }
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildDueOverdueMaintenanceQuery(params: DueOverdueMaintenanceFilterParams): string {
  const query = new URLSearchParams()
  if (params.equipmentId !== undefined) query.set('equipmentId', String(params.equipmentId))
  if (params.dueStatus) query.set('dueStatus', params.dueStatus)
  if (params.nextDueFrom) query.set('nextDueFrom', params.nextDueFrom)
  if (params.nextDueTo) query.set('nextDueTo', params.nextDueTo)
  if (params.workOrderStatus) query.set('workOrderStatus', params.workOrderStatus)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildEquipmentDowntimeQuery(params: EquipmentDowntimeFilterParams): string {
  const query = new URLSearchParams()
  if (params.fromDate) query.set('fromDate', params.fromDate)
  if (params.toDate) query.set('toDate', params.toDate)
  if (params.equipmentId !== undefined) query.set('equipmentId', String(params.equipmentId))
  if (params.restorationStatus) query.set('restorationStatus', params.restorationStatus)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}
