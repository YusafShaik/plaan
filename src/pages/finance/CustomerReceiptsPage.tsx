import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  RotateCcw,
  Wallet,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Alert } from '../../components/ui/Alert'
import { CreateCustomerReceiptModal } from './CreateCustomerReceiptModal'
import { CustomerReceiptDetailsModal } from './CustomerReceiptDetailsModal'
import { financeService } from '../../services/financeService'
import type { CustomerReceipt, CustomerReceiptStatus, PaymentMethod } from '../../types/finance'
import type { PageResponse } from '../../types/masterData'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
}

export function CustomerReceiptsPage({
  initialInvoiceId,
  onConsumedInitialInvoice,
}: {
  initialInvoiceId?: number | null
  onConsumedInitialInvoice?: () => void
} = {}) {
  const [receipts, setReceipts] = useState<CustomerReceipt[]>([])
  const [pageData, setPageData] = useState<PageResponse<CustomerReceipt> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerReceiptStatus | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [receiptToEdit, setPaymentToEdit] = useState<CustomerReceipt | null>(null)
  const [preselectedInvoiceId, setPreselectedInvoiceId] = useState<number | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<CustomerReceipt | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const handleOpenDetails = (receipt: CustomerReceipt) => {
    setSelectedPayment(receipt)
    setIsDetailsOpen(true)
  }

  const loadReceipts = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)
      financeService
        .getCustomerReceipts({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          page,
          size: pageSize,
        })
        .then((res) => {
          setReceipts(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load receipts.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => loadReceipts(0), 250)
    return () => clearTimeout(timer)
  }, [loadReceipts])

  useEffect(() => {
    if (initialInvoiceId) {
      setPaymentToEdit(null)
      setPreselectedInvoiceId(initialInvoiceId)
      setIsCreateOpen(true)
      onConsumedInitialInvoice?.()
    }
  }, [initialInvoiceId, onConsumedInitialInvoice])

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this draft receipt?')) return
    try {
      await financeService.deleteCustomerReceipt(id)
      loadReceipts(currentPage)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete receipt')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="relative w-64 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>
          <NativeSelect
            dense
            className="w-auto min-w-[9.5rem]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CustomerReceiptStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
          </NativeSelect>
          {(search || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ml-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setPaymentToEdit(null)
            setPreselectedInvoiceId(null)
            setIsCreateOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Record receipt
        </Button>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <Table className="border-0 rounded-none shadow-none bg-transparent">
          <THead>
            <tr>
              <TH>Receipt No.</TH>
              <TH>Invoice</TH>
              <TH>Customer</TH>
              <TH>Method</TH>
              <TH className="text-right">Amount</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && receipts.length === 0 ? (
              <TR>
                <TD colSpan={7} className="py-16 text-center text-muted-foreground">
                  Loading receipts...
                </TD>
              </TR>
            ) : receipts.length === 0 ? (
              <TR>
                <TD colSpan={7} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Wallet className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No receipts found.</p>
                    <p className="text-xs text-muted-foreground">
                      Record a receipt against a posted sales invoice.
                    </p>
                  </div>
                </TD>
              </TR>
            ) : (
              receipts.map((p) => {
                const isPosted = p.status === 'POSTED'
                return (
                  <TR key={p.id} clickable onClick={() => handleOpenDetails(p)}>
                    <TD>
                      <RefLink>{p.receiptNumber}</RefLink>
                    </TD>
                    <TD>
                      <span className="text-ref text-foreground">{p.invoiceNumber}</span>
                    </TD>
                    <TD className="font-medium">{p.customerName}</TD>
                    <TD className="text-muted-foreground">{METHOD_LABEL[p.paymentMethod]}</TD>
                    <TD className="text-right font-mono font-medium">{formatCurrency(p.amount)}</TD>
                    <TD>
                      {isPosted ? (
                        <Badge variant="success">Posted</Badge>
                      ) : (
                        <Badge variant="warning">Draft</Badge>
                      )}
                    </TD>
                    <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(p)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {!isPosted && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentToEdit(p)
                                setPreselectedInvoiceId(null)
                                setIsCreateOpen(true)
                              }}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                              title="Edit Draft"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                              title="Delete Draft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </TD>
                  </TR>
                )
              })
            )}
          </TBody>
        </Table>

        {pageData && pageData.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/15 text-xs">
            <span className="text-muted-foreground">
              Showing {receipts.length} of {pageData.totalElements} receipts
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => loadReceipts(Math.max(0, currentPage - 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 text-muted-foreground font-mono">
                {currentPage + 1} / {pageData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pageData.totalPages - 1}
                onClick={() => loadReceipts(currentPage + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreateCustomerReceiptModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setPaymentToEdit(null)
          setPreselectedInvoiceId(null)
        }}
        onSuccess={() => loadReceipts(currentPage)}
        receiptToEdit={receiptToEdit}
        preselectedInvoiceId={preselectedInvoiceId}
      />

      <CustomerReceiptDetailsModal
        isOpen={isDetailsOpen}
        receipt={selectedPayment}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={(p) => {
          setPaymentToEdit(p)
          setPreselectedInvoiceId(null)
          setIsCreateOpen(true)
        }}
        onDeleted={() => loadReceipts(currentPage)}
        onPosted={() => loadReceipts(currentPage)}
      />
    </div>
  )
}
