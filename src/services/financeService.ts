import { apiClient } from '../lib/api'
import type { PageResponse } from '../types/masterData'
import type {
  PurchaseInvoice,
  CreatePurchaseInvoicePayload,
  UpdatePurchaseInvoicePayload,
  PurchaseInvoiceSummary,
  PurchaseInvoiceFilterParams,
  EligibleGrn,
  SalesInvoice,
  CreateSalesInvoicePayload,
  UpdateSalesInvoicePayload,
  SalesInvoiceSummary,
  SalesInvoiceFilterParams,
  EligibleDispatch,
  SupplierPayment,
  CreateSupplierPaymentPayload,
  UpdateSupplierPaymentPayload,
  SupplierPaymentFilterParams,
  EligiblePurchaseInvoice,
  CustomerReceipt,
  CreateCustomerReceiptPayload,
  UpdateCustomerReceiptPayload,
  CustomerReceiptFilterParams,
  EligibleSalesInvoice,
  Expense,
  ExpenseCategory,
  ExpenseOverview,
  CreateExpensePayload,
  UpdateExpensePayload,
  ExpenseFilterParams,
} from '../types/finance'

export const financeService = {
  getPurchaseInvoices: async (
    params: PurchaseInvoiceFilterParams = {}
  ): Promise<PageResponse<PurchaseInvoice>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<PurchaseInvoice>>(`/finance/purchase-invoices${queryString}`)
  },

  getPurchaseInvoiceById: async (id: number): Promise<PurchaseInvoice> => {
    return apiClient<PurchaseInvoice>(`/finance/purchase-invoices/${id}`)
  },

  getNextInvoiceNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/finance/purchase-invoices/next-number')
  },

  getSummary: async (): Promise<PurchaseInvoiceSummary> => {
    return apiClient<PurchaseInvoiceSummary>('/finance/purchase-invoices/summary')
  },

  getEligibleGoodsReceipts: async (): Promise<EligibleGrn[]> => {
    return apiClient<EligibleGrn[]>('/finance/purchase-invoices/eligible-grns')
  },

  getGoodsReceiptDetails: async (grnId: number): Promise<EligibleGrn> => {
    return apiClient<EligibleGrn>(`/finance/purchase-invoices/grn-details/${grnId}`)
  },

  createPurchaseInvoice: async (
    payload: CreatePurchaseInvoicePayload
  ): Promise<PurchaseInvoice> => {
    return apiClient<PurchaseInvoice>('/finance/purchase-invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updatePurchaseInvoice: async (
    id: number,
    payload: UpdatePurchaseInvoicePayload
  ): Promise<PurchaseInvoice> => {
    return apiClient<PurchaseInvoice>(`/finance/purchase-invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postPurchaseInvoice: async (id: number): Promise<PurchaseInvoice> => {
    return apiClient<PurchaseInvoice>(`/finance/purchase-invoices/${id}/post`, {
      method: 'POST',
    })
  },

  deletePurchaseInvoice: async (id: number): Promise<void> => {
    return apiClient<void>(`/finance/purchase-invoices/${id}`, {
      method: 'DELETE',
    })
  },

  downloadPdf: async (id: number, invoiceNumber: string): Promise<void> => {
    const token = localStorage.getItem('plaan_token')
    const response = await fetch(`/api/v1/finance/purchase-invoices/${id}/pdf`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok) {
      throw new Error('Failed to download purchase invoice PDF.')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoiceNumber || 'purchase-invoice'}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  downloadAttachment: async (id: number, fileName?: string): Promise<void> => {
    const token = localStorage.getItem('plaan_token')
    const response = await fetch(`/api/v1/finance/purchase-invoices/${id}/attachment`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok) {
      throw new Error('Failed to download invoice attachment.')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'invoice-attachment'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  // ── Sales Invoices ──────────────────────────────────────────────

  getSalesInvoices: async (
    params: SalesInvoiceFilterParams = {}
  ): Promise<PageResponse<SalesInvoice>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<SalesInvoice>>(`/finance/sales-invoices${queryString}`)
  },

  getSalesInvoiceById: async (id: number): Promise<SalesInvoice> => {
    return apiClient<SalesInvoice>(`/finance/sales-invoices/${id}`)
  },

  getNextSalesInvoiceNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/finance/sales-invoices/next-number')
  },

  getSalesInvoiceSummary: async (): Promise<SalesInvoiceSummary> => {
    return apiClient<SalesInvoiceSummary>('/finance/sales-invoices/summary')
  },

  getEligibleDispatches: async (): Promise<EligibleDispatch[]> => {
    return apiClient<EligibleDispatch[]>('/finance/sales-invoices/eligible-dispatches')
  },

  getDispatchDetailsForInvoice: async (dispatchId: number): Promise<EligibleDispatch> => {
    return apiClient<EligibleDispatch>(`/finance/sales-invoices/dispatch-details/${dispatchId}`)
  },

  createSalesInvoice: async (payload: CreateSalesInvoicePayload): Promise<SalesInvoice> => {
    return apiClient<SalesInvoice>('/finance/sales-invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateSalesInvoice: async (
    id: number,
    payload: UpdateSalesInvoicePayload
  ): Promise<SalesInvoice> => {
    return apiClient<SalesInvoice>(`/finance/sales-invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postSalesInvoice: async (id: number): Promise<SalesInvoice> => {
    return apiClient<SalesInvoice>(`/finance/sales-invoices/${id}/post`, {
      method: 'POST',
    })
  },

  deleteSalesInvoice: async (id: number): Promise<void> => {
    return apiClient<void>(`/finance/sales-invoices/${id}`, {
      method: 'DELETE',
    })
  },

  downloadSalesInvoicePdf: async (id: number, invoiceNumber: string): Promise<void> => {
    const token = localStorage.getItem('plaan_token')
    const response = await fetch(`/api/v1/finance/sales-invoices/${id}/pdf`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok) {
      throw new Error('Failed to download sales invoice PDF.')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoiceNumber || 'sales-invoice'}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  // ── Supplier Payments ───────────────────────────────────────────

  getSupplierPayments: async (
    params: SupplierPaymentFilterParams = {}
  ): Promise<PageResponse<SupplierPayment>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<SupplierPayment>>(`/finance/supplier-payments${queryString}`)
  },

  getSupplierPaymentById: async (id: number): Promise<SupplierPayment> => {
    return apiClient<SupplierPayment>(`/finance/supplier-payments/${id}`)
  },

  getNextPaymentNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/finance/supplier-payments/next-number')
  },

  getEligiblePurchaseInvoices: async (): Promise<EligiblePurchaseInvoice[]> => {
    return apiClient<EligiblePurchaseInvoice[]>('/finance/supplier-payments/eligible-invoices')
  },

  getPurchaseInvoiceForPayment: async (invoiceId: number): Promise<EligiblePurchaseInvoice> => {
    return apiClient<EligiblePurchaseInvoice>(
      `/finance/supplier-payments/invoice-details/${invoiceId}`
    )
  },

  createSupplierPayment: async (
    payload: CreateSupplierPaymentPayload
  ): Promise<SupplierPayment> => {
    return apiClient<SupplierPayment>('/finance/supplier-payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateSupplierPayment: async (
    id: number,
    payload: UpdateSupplierPaymentPayload
  ): Promise<SupplierPayment> => {
    return apiClient<SupplierPayment>(`/finance/supplier-payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postSupplierPayment: async (id: number): Promise<SupplierPayment> => {
    return apiClient<SupplierPayment>(`/finance/supplier-payments/${id}/post`, {
      method: 'POST',
    })
  },

  deleteSupplierPayment: async (id: number): Promise<void> => {
    return apiClient<void>(`/finance/supplier-payments/${id}`, {
      method: 'DELETE',
    })
  },

  // ── Customer Receipts ───────────────────────────────────────────

  getCustomerReceipts: async (
    params: CustomerReceiptFilterParams = {}
  ): Promise<PageResponse<CustomerReceipt>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<CustomerReceipt>>(`/finance/customer-receipts${queryString}`)
  },

  getCustomerReceiptById: async (id: number): Promise<CustomerReceipt> => {
    return apiClient<CustomerReceipt>(`/finance/customer-receipts/${id}`)
  },

  getNextReceiptNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/finance/customer-receipts/next-number')
  },

  getEligibleSalesInvoices: async (): Promise<EligibleSalesInvoice[]> => {
    return apiClient<EligibleSalesInvoice[]>('/finance/customer-receipts/eligible-invoices')
  },

  getSalesInvoiceForReceipt: async (invoiceId: number): Promise<EligibleSalesInvoice> => {
    return apiClient<EligibleSalesInvoice>(
      `/finance/customer-receipts/invoice-details/${invoiceId}`
    )
  },

  createCustomerReceipt: async (
    payload: CreateCustomerReceiptPayload
  ): Promise<CustomerReceipt> => {
    return apiClient<CustomerReceipt>('/finance/customer-receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateCustomerReceipt: async (
    id: number,
    payload: UpdateCustomerReceiptPayload
  ): Promise<CustomerReceipt> => {
    return apiClient<CustomerReceipt>(`/finance/customer-receipts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postCustomerReceipt: async (id: number): Promise<CustomerReceipt> => {
    return apiClient<CustomerReceipt>(`/finance/customer-receipts/${id}/post`, {
      method: 'POST',
    })
  },

  deleteCustomerReceipt: async (id: number): Promise<void> => {
    return apiClient<void>(`/finance/customer-receipts/${id}`, {
      method: 'DELETE',
    })
  },

  // ── Expenses ────────────────────────────────────────────────────

  getExpenses: async (params: ExpenseFilterParams = {}): Promise<PageResponse<Expense>> => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.categoryId !== undefined) query.set('categoryId', String(params.categoryId))
    if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod)
    if (params.fromDate) query.set('fromDate', params.fromDate)
    if (params.toDate) query.set('toDate', params.toDate)
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.size !== undefined) query.set('size', String(params.size))
    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<PageResponse<Expense>>(`/finance/expenses${queryString}`)
  },

  getExpenseById: async (id: number): Promise<Expense> => {
    return apiClient<Expense>(`/finance/expenses/${id}`)
  },

  getNextExpenseNumber: async (): Promise<{ nextCode: string }> => {
    return apiClient<{ nextCode: string }>('/finance/expenses/next-number')
  },

  getExpenseOverview: async (params: { fromDate?: string; toDate?: string } = {}): Promise<ExpenseOverview> => {
    const query = new URLSearchParams()
    if (params.fromDate) query.set('fromDate', params.fromDate)
    if (params.toDate) query.set('toDate', params.toDate)
    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiClient<ExpenseOverview>(`/finance/expenses/overview${queryString}`)
  },

  getExpenseCategories: async (includeInactive = false): Promise<ExpenseCategory[]> => {
    const query = includeInactive ? '?includeInactive=true' : ''
    return apiClient<ExpenseCategory[]>(`/finance/expenses/categories${query}`)
  },

  createExpenseCategory: async (name: string): Promise<ExpenseCategory> => {
    return apiClient<ExpenseCategory>('/finance/expenses/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  updateExpenseCategory: async (
    id: number,
    payload: { name: string; active?: boolean }
  ): Promise<ExpenseCategory> => {
    return apiClient<ExpenseCategory>(`/finance/expenses/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  createExpense: async (payload: CreateExpensePayload): Promise<Expense> => {
    return apiClient<Expense>('/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateExpense: async (id: number, payload: UpdateExpensePayload): Promise<Expense> => {
    return apiClient<Expense>(`/finance/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  postExpense: async (id: number): Promise<Expense> => {
    return apiClient<Expense>(`/finance/expenses/${id}/post`, {
      method: 'POST',
    })
  },

  deleteExpense: async (id: number): Promise<void> => {
    return apiClient<void>(`/finance/expenses/${id}`, {
      method: 'DELETE',
    })
  },

  downloadExpenseAttachment: async (id: number, fileName: string): Promise<void> => {
    const token = localStorage.getItem('plaan_token')
    const response = await fetch(`/api/v1/finance/expenses/${id}/attachment`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok) {
      throw new Error('Failed to download attachment')
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
