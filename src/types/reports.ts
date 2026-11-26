import type { PurchaseOrderStatus } from './procurement'
import type { PageResponse } from './masterData'
import type { StockOverviewItem } from './inventory'
import type { InvoicePaymentStatus, PaymentMethod } from './finance'
import type { MaintenanceScheduleStatus } from './maintenance'

export interface PurchaseSummaryTotals {
  totalPurchaseOrders: number
  totalOrderValue: number
  fullyReceived: number
  pendingOrders: number
}

export interface PurchaseSummarySupplierBreakdown {
  supplierId: number
  supplierName: string
  orderValue: number
}

export interface PurchaseSummaryRow {
  id: number
  poNumber: string
  orderDate: string
  supplierId: number
  supplierName: string
  warehouseId: number
  warehouseName: string
  expectedDeliveryDate?: string | null
  orderValue: number
  status: PurchaseOrderStatus
}

export interface PurchaseSummaryReport {
  currency: string
  summary: PurchaseSummaryTotals
  bySupplier: PurchaseSummarySupplierBreakdown[]
  orders: PageResponse<PurchaseSummaryRow>
}

export interface PurchaseSummaryFilterParams {
  fromDate?: string
  toDate?: string
  supplierId?: number
  warehouseId?: number
  status?: 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED'
  page?: number
  size?: number
}

export type DeliveryScheduleStatus = 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE' | 'NOT_SCHEDULED'

export interface PendingPurchaseOrderTotals {
  pendingPos: number
  pendingValue: number
  overduePos: number
}

export interface PendingPurchaseOrderRow {
  purchaseOrderId: number
  purchaseOrderItemId: number
  poNumber: string
  orderDate: string
  supplierId: number
  supplierName: string
  itemId: number
  itemCode: string
  itemName: string
  warehouseId: number
  warehouseName: string
  orderedQuantity: number
  receivedQuantity: number
  pendingQuantity: number
  unitOfMeasure: string
  unitPrice: number
  pendingValue: number
  expectedDeliveryDate?: string | null
  deliveryStatus: DeliveryScheduleStatus
  daysOverdue?: number | null
}

export interface PendingPurchaseOrderReport {
  currency: string
  summary: PendingPurchaseOrderTotals
  lines: PageResponse<PendingPurchaseOrderRow>
}

export interface PendingPurchaseOrderFilterParams {
  supplierId?: number
  itemId?: number
  warehouseId?: number
  deliveryStatus?: DeliveryScheduleStatus
  expectedFrom?: string
  expectedTo?: string
  page?: number
  size?: number
}

export type StockSummaryStatusFilter = 'AVAILABLE' | 'NO_AVAILABLE_STOCK' | 'QUALITY_HOLD'

export interface StockSummaryTotals {
  itemsInStock: number
  itemsWithNoAvailableStock: number
  itemsPendingQc: number
  itemsWithRejections: number
}

export interface StockSummaryReport {
  summary: StockSummaryTotals
  rows: PageResponse<StockOverviewItem>
}

export interface StockSummaryFilterParams {
  search?: string
  warehouseId?: number
  itemTypeId?: number
  stockStatus?: StockSummaryStatusFilter
  page?: number
  size?: number
}

export type StockMovementTypeFilter =
  | 'OPENING_STOCK'
  | 'GOODS_RECEIPT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT'
  | 'MATERIAL_ISSUE'
  | 'MATERIAL_RETURN'
  | 'PRODUCTION_RECEIPT'
  | 'SALES_DISPATCH'

export interface StockMovementsSummary {
  focused: boolean
  openingBalance: number
  totalIncoming: number
  totalOutgoing: number
  closingBalance: number
  movementCount: number
  incomingCount: number
  outgoingCount: number
  unitOfMeasure?: string | null
}

export interface StockMovementsRow {
  id: number | null
  movementDate: string | null
  itemId: number
  itemCode: string
  itemName: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  movementType: string
  movementTypeLabel: string
  referenceNumber: string | null
  goodsReceiptId: number | null
  openingStockId: number | null
  stockTransferId: number | null
  stockAdjustmentId: number | null
  materialIssueId: number | null
  materialReturnId: number | null
  productionReceiptId: number | null
  dispatchOrderId: number | null
  quantityIn: number | null
  quantityOut: number | null
  runningBalance: number
  unitOfMeasure: string
  openingBalanceRow: boolean
}

export interface StockMovementsReport {
  summary: StockMovementsSummary
  movements: PageResponse<StockMovementsRow>
}

export interface StockMovementsFilterParams {
  fromDate?: string
  toDate?: string
  itemId?: number
  warehouseId?: number
  movementType?: StockMovementTypeFilter
  reference?: string
  page?: number
  size?: number
}

export type ProductionSummaryStatusFilter =
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED'

export interface ProductionSummaryTotals {
  productionOrders: number
  released: number
  inProgress: number
  completedOrClosed: number
}

export interface ProductionSummaryProductProgress {
  productId: number
  productCode: string
  productName: string
  plannedQuantity: number
  producedQuantity: number
  pendingQuantity: number
  completionPercent: number
  unitOfMeasure: string
}

export interface ProductionSummaryRow {
  id: number
  orderNumber: string
  orderDate: string
  productId: number
  productCode: string
  productName: string
  plannedQuantity: number
  producedQuantity: number
  pendingQuantity: number
  unitOfMeasure: string
  completionPercent: number
  plannedCompletionDate?: string | null
  status: ProductionSummaryStatusFilter
}

export interface ProductionSummaryReport {
  summary: ProductionSummaryTotals
  byProduct: ProductionSummaryProductProgress[]
  orders: PageResponse<ProductionSummaryRow>
}

export interface ProductionSummaryFilterParams {
  fromDate?: string
  toDate?: string
  productId?: number
  sourceWarehouseId?: number
  finishedGoodsWarehouseId?: number
  status?: ProductionSummaryStatusFilter
  page?: number
  size?: number
}

export interface MaterialConsumptionTotals {
  productionOrders: number
  uniqueMaterials: number
  unreconciledLines: number
}

export interface MaterialConsumptionLine {
  productionOrderItemId: number
  materialId: number
  materialCode: string
  materialName: string
  requiredQuantity: number
  issuedQuantity: number
  consumedQuantity: number
  returnedQuantity: number
  remainingQuantity: number
  unitOfMeasure: string
  unreconciled: boolean
}

export interface MaterialConsumptionGroup {
  productionOrderId: number
  orderNumber: string
  orderDate: string
  productId: number
  productCode: string
  productName: string
  plannedQuantity: number
  productUnitOfMeasure: string
  sourceWarehouseId: number
  sourceWarehouseName: string
  status: ProductionSummaryStatusFilter
  lines: MaterialConsumptionLine[]
}

export interface MaterialConsumptionReport {
  summary: MaterialConsumptionTotals
  orders: PageResponse<MaterialConsumptionGroup>
}

export interface MaterialConsumptionFilterParams {
  fromDate?: string
  toDate?: string
  productionOrderId?: number
  productId?: number
  materialId?: number
  sourceWarehouseId?: number
  status?: ProductionSummaryStatusFilter
  unreconciledOnly?: boolean
  page?: number
  size?: number
}

export type InspectionSummaryTypeFilter = 'INCOMING' | 'FINISHED_GOODS'
export type InspectionSummaryStatusFilter = 'PENDING' | 'DRAFT' | 'COMPLETED'

export interface InspectionSummaryTotals {
  totalInspections: number
  completed: number
  awaitingCompletion: number
  inspectionsWithRejections: number
}

export interface InspectionSummaryRow {
  id: number
  inspectionType: InspectionSummaryTypeFilter
  inspectionNumber: string
  inspectionDate: string | null
  itemId: number
  itemCode: string
  itemName: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  sourceReference: string | null
  inspectionQuantity: number
  acceptedQuantity: number | null
  rejectedQuantity: number | null
  unitOfMeasure: string
  acceptanceRate: number | null
  rejectionRate: number | null
  inspectedByName: string | null
  status: InspectionSummaryStatusFilter
}

export interface InspectionSummaryItemPerformance {
  itemId: number
  itemCode: string
  itemName: string
  inspectionType: InspectionSummaryTypeFilter
  inspectedQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  acceptanceRate: number
  rejectionRate: number
  unitOfMeasure: string
}

export interface InspectionSummaryReport {
  summary: InspectionSummaryTotals
  byItem: InspectionSummaryItemPerformance[]
  inspections: PageResponse<InspectionSummaryRow>
}

export interface InspectionSummaryFilterParams {
  fromDate?: string
  toDate?: string
  inspectionType?: InspectionSummaryTypeFilter
  itemId?: number
  warehouseId?: number
  status?: InspectionSummaryStatusFilter
  page?: number
  size?: number
}

export interface RejectionReportTotals {
  inspectionsWithRejections: number
  affectedItems: number
  incomingRejections: number
  finishedGoodsRejections: number
}

export interface RejectionReportRow {
  id: number
  inspectionType: InspectionSummaryTypeFilter
  inspectionNumber: string
  completionDate: string | null
  itemId: number
  itemCode: string
  itemName: string
  warehouseId: number
  warehouseName: string
  supplierId: number | null
  supplierName: string | null
  productionOrderId: number | null
  productionOrderNumber: string | null
  sourceReference: string | null
  inspectedQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  unitOfMeasure: string
  rejectionRate: number
  remarks: string | null
  failedParameters: string[]
  inspectedByName: string | null
}

export interface RejectionReport {
  summary: RejectionReportTotals
  rejections: PageResponse<RejectionReportRow>
  remarks: RejectionReportRow[]
}

export interface RejectionReportFilterParams {
  fromDate?: string
  toDate?: string
  inspectionType?: InspectionSummaryTypeFilter
  itemId?: number
  warehouseId?: number
  supplierId?: number
  productionOrderId?: number
  page?: number
  size?: number
}

export type PendingDispatchStockFilter = 'READY' | 'SHORTAGE'

export interface PendingDispatchTotals {
  pendingSalesOrders: number
  overdueOrders: number
  pendingOrderValue: number
  linesWithStockShortage: number
}

export interface PendingDispatchRow {
  salesOrderId: number
  salesOrderItemId: number
  orderNumber: string
  orderDate: string
  customerId: number
  customerName: string
  itemId: number
  itemCode: string
  itemName: string
  warehouseId: number
  warehouseName: string
  orderedQuantity: number
  dispatchedQuantity: number
  pendingQuantity: number
  availableStock: number
  shortageQuantity: number
  canDispatchNow: number
  unitOfMeasure: string
  unitPrice: number
  pendingValue: number
  expectedDeliveryDate?: string | null
  deliveryStatus: DeliveryScheduleStatus
  daysOverdue?: number | null
  readyForDispatch: boolean
}

export interface PendingDispatchReport {
  currency: string
  summary: PendingDispatchTotals
  lines: PageResponse<PendingDispatchRow>
}

export interface PendingDispatchFilterParams {
  customerId?: number
  itemId?: number
  warehouseId?: number
  deliveryStatus?: DeliveryScheduleStatus
  expectedFrom?: string
  expectedTo?: string
  stockAvailability?: PendingDispatchStockFilter
  page?: number
  size?: number
}

export type OutstandingPaymentStatusFilter = 'UNPAID' | 'PARTIALLY_PAID'

export interface SupplierOutstandingTotals {
  totalOutstanding: number
  overdueAmount: number
  outstandingInvoices: number
  suppliersToPay: number
}

export interface SupplierOutstandingBreakdown {
  supplierId: number
  supplierName: string
  outstandingAmount: number
}

export interface SupplierOutstandingRow {
  purchaseInvoiceId: number
  invoiceNumber: string
  supplierInvoiceNumber: string
  invoiceDate: string
  supplierId: number
  supplierName: string
  invoiceAmount: number
  paidAmount: number
  outstandingAmount: number
  dueDate?: string | null
  daysOverdue?: number | null
  paymentStatus: InvoicePaymentStatus
  dueStatus: DeliveryScheduleStatus
}

export interface SupplierOutstandingReport {
  currency: string
  summary: SupplierOutstandingTotals
  bySupplier: SupplierOutstandingBreakdown[]
  invoices: PageResponse<SupplierOutstandingRow>
}

export interface SupplierOutstandingFilterParams {
  supplierId?: number
  invoiceFrom?: string
  invoiceTo?: string
  dueFrom?: string
  dueTo?: string
  paymentStatus?: OutstandingPaymentStatusFilter
  dueStatus?: DeliveryScheduleStatus
  page?: number
  size?: number
}

export interface CustomerOutstandingTotals {
  totalReceivable: number
  overdueAmount: number
  outstandingInvoices: number
  customersWithOutstanding: number
}

export interface CustomerOutstandingBreakdown {
  customerId: number
  customerName: string
  outstandingAmount: number
}

export interface CustomerOutstandingRow {
  salesInvoiceId: number
  invoiceNumber: string
  invoiceDate: string
  customerId: number
  customerName: string
  invoiceAmount: number
  receivedAmount: number
  outstandingAmount: number
  dueDate?: string | null
  daysOverdue?: number | null
  paymentStatus: InvoicePaymentStatus
  dueStatus: DeliveryScheduleStatus
}

export interface CustomerOutstandingReport {
  currency: string
  summary: CustomerOutstandingTotals
  byCustomer: CustomerOutstandingBreakdown[]
  invoices: PageResponse<CustomerOutstandingRow>
}

export interface CustomerOutstandingFilterParams {
  customerId?: number
  invoiceFrom?: string
  invoiceTo?: string
  dueFrom?: string
  dueTo?: string
  paymentStatus?: OutstandingPaymentStatusFilter
  dueStatus?: DeliveryScheduleStatus
  page?: number
  size?: number
}

export interface ExpenseReportTotals {
  totalExpenses: number
  expenseTransactions: number
}

export interface ExpenseReportCategoryBreakdown {
  categoryId: number
  categoryName: string
  amount: number
  percentage: number
}

export interface ExpenseReportPaymentBreakdown {
  paymentMethod: PaymentMethod
  amount: number
  percentage: number
}

export interface ExpenseReportRow {
  expenseId: number
  expenseNumber: string
  expenseDate: string
  categoryId: number
  categoryName: string
  description: string
  paidTo?: string | null
  paymentMethod: PaymentMethod
  paymentReference?: string | null
  amount: number
}

export interface ExpenseReport {
  currency: string
  fromDate: string
  toDate: string
  summary: ExpenseReportTotals
  byCategory: ExpenseReportCategoryBreakdown[]
  byPaymentMethod: ExpenseReportPaymentBreakdown[]
  expenses: PageResponse<ExpenseReportRow>
}

export interface ExpenseReportFilterParams {
  fromDate?: string
  toDate?: string
  categoryId?: number
  paymentMethod?: PaymentMethod
  search?: string
  page?: number
  size?: number
}

export type MaintenanceHistoryTypeFilter = 'PREVENTIVE' | 'BREAKDOWN'

export interface MaintenanceHistoryTotals {
  completedWorkOrders: number
  preventiveMaintenance: number
  breakdownWorkOrders: number
  totalDurationMinutes: number
}

export interface MaintenanceHistoryEquipmentBreakdown {
  equipmentId: number
  equipmentCode: string
  equipmentName: string
  totalWorkOrders: number
  preventiveCount: number
  breakdownCount: number
}

export interface MaintenanceHistoryRow {
  workOrderId: number
  workOrderNumber: string
  equipmentId: number
  equipmentCode: string
  equipmentName: string
  maintenanceType: MaintenanceHistoryTypeFilter
  maintenancePlanId?: number | null
  maintenancePlanName?: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  technician?: string | null
  actualStartAt?: string | null
  actualEndAt?: string | null
  durationMinutes?: number | null
  workPerformed?: string | null
  machineOperational?: boolean | null
  completionRemarks?: string | null
}

export interface MaintenanceHistoryReport {
  currency: string
  fromDate: string
  toDate: string
  summary: MaintenanceHistoryTotals
  byEquipment: MaintenanceHistoryEquipmentBreakdown[]
  technicians: string[]
  workOrders: PageResponse<MaintenanceHistoryRow>
}

export interface MaintenanceHistoryFilterParams {
  fromDate?: string
  toDate?: string
  equipmentId?: number
  maintenanceType?: MaintenanceHistoryTypeFilter
  technician?: string
  machineOperational?: boolean
  page?: number
  size?: number
}

export type { MaintenanceScheduleStatus }
export type DueOverdueWorkOrderStatusFilter = 'NOT_CREATED' | 'OPEN' | 'IN_PROGRESS'

export interface DueOverdueMaintenanceTotals {
  maintenancePlans: number
  overdue: number
  dueToday: number
  upcoming: number
}

export interface DueOverdueMaintenanceRow {
  maintenancePlanId: number
  planNumber: string
  equipmentId: number
  equipmentCode: string
  equipmentName: string
  planName: string
  frequencyDays: number
  lastCompletedDate?: string | null
  nextDueDate: string
  dueStatus: MaintenanceScheduleStatus
  daysOverdue?: number | null
  workOrderId?: number | null
  workOrderNumber?: string | null
  workOrderStatus?: 'OPEN' | 'IN_PROGRESS' | null
}

export interface DueOverdueMaintenanceReport {
  currency: string
  summary: DueOverdueMaintenanceTotals
  plans: PageResponse<DueOverdueMaintenanceRow>
}

export interface DueOverdueMaintenanceFilterParams {
  equipmentId?: number
  dueStatus?: MaintenanceScheduleStatus
  nextDueFrom?: string
  nextDueTo?: string
  workOrderStatus?: DueOverdueWorkOrderStatusFilter
  page?: number
  size?: number
}

export type EquipmentDowntimeRestorationStatus = 'RESTORED' | 'ONGOING'

export interface EquipmentDowntimeTotals {
  totalBreakdownEvents: number
  totalDowntimeMinutes: number
  restoredEvents: number
  ongoingBreakdowns: number
}

export interface EquipmentDowntimeBreakdown {
  equipmentId: number
  equipmentCode: string
  equipmentName: string
  downtimeMinutes: number
  eventCount: number
}

export interface EquipmentDowntimeRow {
  rootWorkOrderId: number
  workOrderNumber: string
  equipmentId: number
  equipmentCode: string
  equipmentName: string
  breakdownAt: string
  maintenanceStartAt?: string | null
  restorationAt?: string | null
  downtimeMinutes: number
  downtimeInPeriodMinutes: number
  breakdownDescription?: string | null
  restorationStatus: EquipmentDowntimeRestorationStatus
}

export interface EquipmentDowntimeReport {
  currency: string
  fromDate: string
  toDate: string
  summary: EquipmentDowntimeTotals
  byEquipment: EquipmentDowntimeBreakdown[]
  events: PageResponse<EquipmentDowntimeRow>
}

export interface EquipmentDowntimeFilterParams {
  fromDate?: string
  toDate?: string
  equipmentId?: number
  restorationStatus?: EquipmentDowntimeRestorationStatus
  page?: number
  size?: number
}
