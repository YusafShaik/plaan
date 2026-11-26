export type PurchaseInvoiceStatus = 'DRAFT' | 'POSTED'
export type InvoicePaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
export type SupplierPaymentStatus = 'DRAFT' | 'POSTED'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'OTHER'

export interface PurchaseInvoiceItem {
  id: number
  goodsReceiptItemId: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  quantity: number
  unitPrice: number
  lineAmount: number
}

export interface SupplierPaymentHistoryItem {
  id: number
  paymentNumber: string
  paymentDate: string
  paymentMethod: PaymentMethod
  paymentReference?: string
  amount: number
}

export interface PurchaseInvoice {
  id: number
  invoiceNumber: string
  supplierInvoiceNumber: string
  invoiceDate: string
  paymentDueDate?: string
  goodsReceiptId: number
  grnNumber: string
  purchaseOrderId: number
  poNumber: string
  supplierId: number
  supplierCode: string
  supplierName: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  outstandingAmount: number
  paymentStatus: InvoicePaymentStatus
  paymentHistory: SupplierPaymentHistoryItem[]
  attachmentFileName?: string
  attachmentContentType?: string
  hasAttachment: boolean
  notes?: string
  status: PurchaseInvoiceStatus
  itemsCount: number
  items: PurchaseInvoiceItem[]
  createdAt: string
  updatedAt: string
}

export interface EligibleGrnItem {
  goodsReceiptItemId: number
  purchaseOrderItemId?: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  quantity: number
  defaultUnitPrice: number
  lineAmount: number
}

export interface EligibleGrn {
  id: number
  grnNumber: string
  purchaseOrderId: number
  poNumber: string
  supplierId: number
  supplierCode: string
  supplierName: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  receiptDate: string
  items: EligibleGrnItem[]
}

export interface PurchaseInvoiceItemPayload {
  goodsReceiptItemId: number
  itemId: number
  unitPrice: number
}

export interface CreatePurchaseInvoicePayload {
  invoiceNumber?: string
  supplierInvoiceNumber: string
  invoiceDate: string
  paymentDueDate?: string
  goodsReceiptId: number
  taxAmount?: number
  attachmentFileName?: string
  attachmentContentType?: string
  attachmentData?: string
  notes?: string
  status?: PurchaseInvoiceStatus
  items: PurchaseInvoiceItemPayload[]
}

export interface UpdatePurchaseInvoicePayload {
  supplierInvoiceNumber: string
  invoiceDate: string
  paymentDueDate?: string
  taxAmount?: number
  attachmentFileName?: string
  attachmentContentType?: string
  attachmentData?: string
  notes?: string
  status?: PurchaseInvoiceStatus
  items: PurchaseInvoiceItemPayload[]
}

export interface PurchaseInvoiceSummary {
  totalInvoices: number
  draftCount: number
  postedCount: number
  totalPayable: number
  outstandingPayable: number
}

export interface PurchaseInvoiceFilterParams {
  search?: string
  status?: PurchaseInvoiceStatus
  page?: number
  size?: number
}

export type SalesInvoiceStatus = 'DRAFT' | 'POSTED'

export interface SalesInvoiceItem {
  id: number
  dispatchOrderItemId: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  quantity: number
  unitPrice: number
  lineAmount: number
}

export interface CustomerReceiptHistoryItem {
  id: number
  receiptNumber: string
  receiptDate: string
  paymentMethod: PaymentMethod
  paymentReference?: string
  amount: number
}

export interface SalesInvoice {
  id: number
  invoiceNumber: string
  invoiceDate: string
  paymentDueDate?: string
  dispatchOrderId: number
  dispatchNumber: string
  salesOrderId: number
  salesOrderNumber: string
  customerId: number
  customerCode: string
  customerName: string
  billingAddress?: string
  shippingAddress?: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  receivedAmount: number
  outstandingAmount: number
  paymentStatus: InvoicePaymentStatus
  receiptHistory: CustomerReceiptHistoryItem[]
  notes?: string
  status: SalesInvoiceStatus
  itemsCount: number
  items: SalesInvoiceItem[]
  createdAt: string
  updatedAt: string
}

export interface EligibleDispatchItem {
  dispatchOrderItemId: number
  salesOrderItemId?: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  quantity: number
  unitPrice: number
  lineAmount: number
}

export interface EligibleDispatch {
  id: number
  dispatchNumber: string
  salesOrderId: number
  salesOrderNumber: string
  customerId: number
  customerCode: string
  customerName: string
  billingAddress?: string
  shippingAddress?: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  dispatchDate: string
  items: EligibleDispatchItem[]
}

export interface CreateSalesInvoicePayload {
  invoiceNumber?: string
  invoiceDate: string
  paymentDueDate?: string
  dispatchOrderId: number
  taxAmount?: number
  notes?: string
  status?: SalesInvoiceStatus
}

export interface UpdateSalesInvoicePayload {
  invoiceDate: string
  paymentDueDate?: string
  taxAmount?: number
  notes?: string
  status?: SalesInvoiceStatus
}

export interface SalesInvoiceSummary {
  totalInvoices: number
  draftCount: number
  postedCount: number
  totalReceivable: number
  outstandingReceivable: number
}

export interface SalesInvoiceFilterParams {
  search?: string
  status?: SalesInvoiceStatus
  page?: number
  size?: number
}

export interface SupplierPayment {
  id: number
  paymentNumber: string
  paymentDate: string
  purchaseInvoiceId: number
  invoiceNumber: string
  supplierId: number
  supplierCode: string
  supplierName: string
  invoiceTotal: number
  previouslyPaid: number
  outstandingAmount: number
  amount: number
  paymentMethod: PaymentMethod
  paymentReference?: string
  notes?: string
  status: SupplierPaymentStatus
  createdAt: string
  updatedAt: string
}

export interface EligiblePurchaseInvoice {
  id: number
  invoiceNumber: string
  invoiceDate: string
  supplierId: number
  supplierCode: string
  supplierName: string
  totalAmount: number
  paidAmount: number
  outstandingAmount: number
}

export interface CreateSupplierPaymentPayload {
  paymentNumber?: string
  paymentDate: string
  purchaseInvoiceId: number
  amount: number
  paymentMethod: PaymentMethod
  paymentReference?: string
  notes?: string
  status?: SupplierPaymentStatus
}

export interface UpdateSupplierPaymentPayload {
  paymentDate: string
  amount: number
  paymentMethod: PaymentMethod
  paymentReference?: string
  notes?: string
  status?: SupplierPaymentStatus
}

export interface SupplierPaymentFilterParams {
  search?: string
  status?: SupplierPaymentStatus
  page?: number
  size?: number
}

export type CustomerReceiptStatus = 'DRAFT' | 'POSTED'

export interface CustomerReceipt {
  id: number
  receiptNumber: string
  receiptDate: string
  salesInvoiceId: number
  invoiceNumber: string
  customerId: number
  customerCode: string
  customerName: string
  invoiceTotal: number
  previouslyReceived: number
  outstandingAmount: number
  amount: number
  paymentMethod: PaymentMethod
  paymentReference?: string
  notes?: string
  status: CustomerReceiptStatus
  createdAt: string
  updatedAt: string
}

export interface EligibleSalesInvoice {
  id: number
  invoiceNumber: string
  invoiceDate: string
  customerId: number
  customerCode: string
  customerName: string
  totalAmount: number
  receivedAmount: number
  outstandingAmount: number
}

export interface CreateCustomerReceiptPayload {
  receiptNumber?: string
  receiptDate: string
  salesInvoiceId: number
  amount: number
  paymentMethod: PaymentMethod
  paymentReference?: string
  notes?: string
  status?: CustomerReceiptStatus
}

export interface UpdateCustomerReceiptPayload {
  receiptDate: string
  amount: number
  paymentMethod: PaymentMethod
  paymentReference?: string
  notes?: string
  status?: CustomerReceiptStatus
}

export interface CustomerReceiptFilterParams {
  search?: string
  status?: CustomerReceiptStatus
  page?: number
  size?: number
}

export type ExpenseStatus = 'DRAFT' | 'POSTED'

export interface Expense {
  id: number
  expenseNumber: string
  expenseDate: string
  categoryId: number
  categoryName: string
  description: string
  amount: number
  paymentMethod: PaymentMethod
  paidTo?: string
  paymentReference?: string
  attachmentFileName?: string
  attachmentContentType?: string
  hasAttachment: boolean
  notes?: string
  status: ExpenseStatus
  createdAt: string
  updatedAt: string
}

export interface ExpenseCategory {
  id: number
  name: string
  active: boolean
  sortOrder: number
}

export interface ExpenseCategoryTotal {
  categoryName: string
  amount: number
}

export interface ExpenseOverview {
  totalPostedThisMonth: number
  byCategory: ExpenseCategoryTotal[]
}

export interface CreateExpensePayload {
  expenseNumber?: string
  expenseDate: string
  categoryId: number
  description: string
  amount: number
  paymentMethod: PaymentMethod
  paidTo?: string
  paymentReference?: string
  attachmentFileName?: string
  attachmentContentType?: string
  attachmentData?: string
  notes?: string
  status?: ExpenseStatus
}

export interface UpdateExpensePayload {
  expenseDate: string
  categoryId: number
  description: string
  amount: number
  paymentMethod: PaymentMethod
  paidTo?: string
  paymentReference?: string
  attachmentFileName?: string
  attachmentContentType?: string
  attachmentData?: string
  notes?: string
  status?: ExpenseStatus
}

export interface ExpenseFilterParams {
  search?: string
  status?: ExpenseStatus
  categoryId?: number
  paymentMethod?: PaymentMethod
  fromDate?: string
  toDate?: string
  page?: number
  size?: number
}
