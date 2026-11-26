import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  RotateCcw,
  FileText,
  Eye,
  Download,
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
import { CreateSalesInvoiceModal } from './CreateSalesInvoiceModal'
import { CreateCustomerReceiptModal } from './CreateCustomerReceiptModal'
import { SalesInvoiceDetailsModal } from './SalesInvoiceDetailsModal'
import { financeService } from '../../services/financeService'
import type { SalesInvoice, SalesInvoiceStatus } from '../../types/finance'
import type { PageResponse } from '../../types/masterData'

export function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [pageData, setPageData] = useState<PageResponse<SalesInvoice> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SalesInvoiceStatus | ''>('')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [invoiceToEdit, setInvoiceToEdit] = useState<SalesInvoice | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [receiptInvoiceId, setReceiptInvoiceId] = useState<number | null>(null)

  const loadInvoices = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)

      financeService
        .getSalesInvoices({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          page,
          size: pageSize,
        })
        .then((res) => {
          setInvoices(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load sales invoices.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInvoices(0)
    }, 250)
    return () => clearTimeout(timer)
  }, [loadInvoices])

  const handleOpenCreate = () => {
    setInvoiceToEdit(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (inv: SalesInvoice) => {
    setInvoiceToEdit(inv)
    setIsCreateModalOpen(true)
  }

  const handleOpenDetails = (inv: SalesInvoice) => {
    setSelectedInvoice(inv)
    setIsDetailsModalOpen(true)
  }

  const handlePostInvoice = async (invoiceId: number) => {
    try {
      const updated = await financeService.postSalesInvoice(invoiceId)
      setSelectedInvoice(updated)
      loadInvoices(currentPage)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to post sales invoice')
    }
  }

  const handleDeleteInvoice = async (invoiceId: number) => {
    try {
      await financeService.deleteSalesInvoice(invoiceId)
      loadInvoices(currentPage)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete sales invoice')
    }
  }

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="relative w-64 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          <NativeSelect
            dense
            className="w-auto min-w-[9.5rem]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SalesInvoiceStatus | '')}
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

        <div className="flex items-center gap-2.5">
          <Button type="button" variant="primary" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <Table className="border-0 rounded-none shadow-none bg-transparent">
          <THead>
            <tr>
              <TH>Invoice No.</TH>
              <TH>Customer</TH>
              <TH className="text-right">Amount</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && invoices.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-16 text-center text-muted-foreground">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent mb-2" />
                  Loading invoices...
                </TD>
              </TR>
            ) : invoices.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No sales invoices found.</p>
                    <p className="text-xs text-muted-foreground">
                      Click &quot;New Invoice&quot; to bill a customer from a posted dispatch.
                    </p>
                  </div>
                </TD>
              </TR>
            ) : (
              invoices.map((inv) => {
                const isPosted = inv.status === 'POSTED'
                return (
                  <TR
                    key={inv.id}
                    clickable
                    onClick={() => handleOpenDetails(inv)}
                  >
                    <TD>
                      <RefLink>{inv.invoiceNumber}</RefLink>
                    </TD>
                    <TD>
                      <p className="font-medium">{inv.customerName}</p>
                      <p className="text-[11px] text-ref text-muted-foreground">
                        {inv.dispatchNumber}
                      </p>
                    </TD>
                    <TD className="text-right font-mono font-medium">
                      {formatCurrency(inv.totalAmount)}
                    </TD>
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
                          onClick={() => handleOpenDetails(inv)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            financeService.downloadSalesInvoicePdf(inv.id, inv.invoiceNumber)
                          }
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {!isPosted && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(inv)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                              title="Edit Draft"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(inv.id)}
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
              Showing {invoices.length} of {pageData.totalElements} invoices
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => loadInvoices(Math.max(0, currentPage - 1))}
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
                onClick={() => loadInvoices(currentPage + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreateSalesInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => loadInvoices(currentPage)}
        invoiceToEdit={invoiceToEdit}
      />

      <SalesInvoiceDetailsModal
        isOpen={isDetailsModalOpen}
        invoice={selectedInvoice}
        onClose={() => setIsDetailsModalOpen(false)}
        onEdit={(inv) => {
          setIsDetailsModalOpen(false)
          handleOpenEdit(inv)
        }}
        onPost={handlePostInvoice}
        onDelete={handleDeleteInvoice}
        onRecordReceipt={(inv) => {
          setIsDetailsModalOpen(false)
          setReceiptInvoiceId(inv.id)
          setIsReceiptModalOpen(true)
        }}
      />

      <CreateCustomerReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false)
          setReceiptInvoiceId(null)
        }}
        onSuccess={() => loadInvoices(currentPage)}
        preselectedInvoiceId={receiptInvoiceId}
      />
    </div>
  )
}
