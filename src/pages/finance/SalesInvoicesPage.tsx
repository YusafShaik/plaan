import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  Download,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  TableEmptyState,
  TablePagination,
} from '../../components/ui/Table'
import { Alert } from '../../components/ui/Alert'
import { CreateSalesInvoiceModal } from './CreateSalesInvoiceModal'
import { CreateCustomerReceiptModal } from './CreateCustomerReceiptModal'
import { SalesInvoiceDetailsModal } from './SalesInvoiceDetailsModal'
import { financeService } from '../../services/financeService'
import { useAuth } from '../../hooks/useAuth'
import { formatMoney, formatShortDate } from '../../lib/format'
import { confirmAction, toast } from '../../lib/feedback'
import { cn } from '../../lib/cn'
import { POST_STATUS_FILTERS } from './financeHelpers'
import type { SalesInvoice, SalesInvoiceStatus } from '../../types/finance'
import type { PageResponse } from '../../types/masterData'

export interface SalesInvoicesPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
}

export function SalesInvoicesPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
}: SalesInvoicesPageProps = {}) {
  const { organization } = useAuth()
  const currency = organization?.baseCurrency

  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [pageData, setPageData] = useState<PageResponse<SalesInvoice> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SalesInvoiceStatus | ''>('')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isCreateModalOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsCreateModalOpen = setControlledModalOpen || setInternalModalOpen
  const [invoiceToEdit, setInvoiceToEdit] = useState<SalesInvoice | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [receiptInvoiceId, setReceiptInvoiceId] = useState<number | null>(null)

  const loadInvoices = useCallback(
    (page = 0) => {
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
    const timer = setTimeout(() => loadInvoices(0), 200)
    return () => clearTimeout(timer)
  }, [loadInvoices])

  useEffect(() => {
    if (openMenuId === null) return
    const handleOutside = () => setOpenMenuId(null)
    window.addEventListener('click', handleOutside)
    return () => window.removeEventListener('click', handleOutside)
  }, [openMenuId])

  const handleOpenEdit = (inv: SalesInvoice) => {
    setOpenMenuId(null)
    setInvoiceToEdit(inv)
    setIsCreateModalOpen(true)
  }

  const handleOpenDetails = (inv: SalesInvoice) => {
    setOpenMenuId(null)
    setSelectedInvoice(inv)
    setIsDetailsModalOpen(true)
  }

  const handlePostInvoice = async (invoiceId: number) => {
    setOpenMenuId(null)
    setProcessingId(invoiceId)
    try {
      const updated = await financeService.postSalesInvoice(invoiceId)
      setSelectedInvoice(updated)
      toast.success(`Invoice ${updated.invoiceNumber} posted`)
      loadInvoices(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post sales invoice.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteInvoice = async (inv: SalesInvoice) => {
    setOpenMenuId(null)
    const ok = await confirmAction({
      title: `Delete draft invoice ${inv.invoiceNumber}?`,
      description: 'This draft sales invoice will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    setProcessingId(inv.id)
    try {
      await financeService.deleteSalesInvoice(inv.id)
      toast.success(`Draft invoice ${inv.invoiceNumber} deleted`)
      setIsDetailsModalOpen(false)
      loadInvoices(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete sales invoice.')
    } finally {
      setProcessingId(null)
    }
  }

  const hasFilters = Boolean(search || statusFilter)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search invoices..."
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {POST_STATUS_FILTERS.map((pill) => {
            const active = statusFilter === pill.value
            return (
              <button
                key={pill.label}
                type="button"
                onClick={() => setStatusFilter(pill.value)}
                className={cn(
                  'h-8 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {pill.label}
              </button>
            )
          })}
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="rounded-md border border-border/80 bg-card shadow-xs overflow-visible">
        <Table
          className="border-0 rounded-none shadow-none bg-transparent overflow-visible"
          tableClassName="table-fixed"
        >
          <THead>
            <tr>
              <TH className="w-[13%]">Invoice no.</TH>
              <TH className="w-[25%]">Customer</TH>
              <TH className="w-[11%]">Date</TH>
              <TH className="w-[13%] text-right">Amount</TH>
              <TH className="w-[13%] text-right">Outstanding</TH>
              <TH className="w-[12%] pl-6">Status</TH>
              <TH className="w-[13%] px-3 text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && invoices.length === 0 ? (
              <TR>
                <TD colSpan={7} className="py-16 text-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-foreground" />
                  Loading invoices...
                </TD>
              </TR>
            ) : invoices.length === 0 ? (
              <TR>
                <TD colSpan={7} className="p-0">
                  <TableEmptyState
                    icon={<FileText className="h-5 w-5" />}
                    title="No sales invoices found"
                    description={
                      hasFilters
                        ? 'No sales invoices match your current search or status filter.'
                        : 'Click "+ New invoice" above to bill a customer from a posted dispatch.'
                    }
                    action={
                      hasFilters ? (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset filters
                        </Button>
                      ) : undefined
                    }
                  />
                </TD>
              </TR>
            ) : (
              invoices.map((inv) => {
                const isPosted = inv.status === 'POSTED'
                const isBusy = processingId === inv.id
                const hasBalance = isPosted && inv.outstandingAmount > 0

                return (
                  <TR key={inv.id} clickable onClick={() => handleOpenDetails(inv)}>
                    <TD>
                      <span className="text-ref-link">{inv.invoiceNumber}</span>
                    </TD>

                    <TD>
                      <p className="font-medium text-foreground truncate">{inv.customerName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {inv.dispatchNumber} · {inv.salesOrderNumber}
                      </p>
                    </TD>

                    <TD className="text-muted-foreground tabular-nums">
                      {formatShortDate(inv.invoiceDate)}
                    </TD>

                    <TD className="text-right tabular-nums font-medium">
                      {formatMoney(inv.totalAmount, currency, 2)}
                    </TD>

                    <TD className="text-right tabular-nums">
                      {!isPosted ? (
                        <span className="text-muted-foreground">—</span>
                      ) : inv.outstandingAmount <= 0 ? (
                        <span className="text-xs font-medium text-muted-foreground">Settled</span>
                      ) : (
                        <span className="font-medium text-foreground">
                          {formatMoney(inv.outstandingAmount, currency, 2)}
                        </span>
                      )}
                    </TD>

                    <TD className="pl-6">
                      {isPosted ? (
                        <Badge variant="success">Posted</Badge>
                      ) : (
                        <Badge variant="neutral">Draft</Badge>
                      )}
                    </TD>

                    <TD className="px-3 text-right">
                      <div
                        className="relative inline-flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isPosted ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handlePostInvoice(inv.id)}
                          >
                            {isBusy ? '...' : 'Post'}
                          </Button>
                        ) : hasBalance ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setOpenMenuId(null)
                              setReceiptInvoiceId(inv.id)
                              setIsReceiptModalOpen(true)
                            }}
                          >
                            Collect
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(inv)}
                          >
                            View
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === inv.id ? null : inv.id)}
                          aria-label="Invoice actions"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openMenuId === inv.id && (
                          <div className="absolute right-0 top-9 z-40 w-44 rounded-md border border-border bg-card shadow-md py-1 text-left">
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(inv)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              View details
                            </button>

                            {hasBalance && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  setReceiptInvoiceId(inv.id)
                                  setIsReceiptModalOpen(true)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                              >
                                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                                Record receipt
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null)
                                void financeService.downloadSalesInvoicePdf(inv.id, inv.invoiceNumber)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5 text-muted-foreground" />
                              Download PDF
                            </button>

                            {!isPosted && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(inv)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                  Edit draft
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handlePostInvoice(inv.id)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  Post invoice
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteInvoice(inv)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete draft
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TD>
                  </TR>
                )
              })
            )}
          </TBody>
        </Table>

        {pageData && (
          <TablePagination
            page={currentPage}
            totalPages={pageData.totalPages}
            totalElements={pageData.totalElements}
            count={invoices.length}
            itemLabel="invoices"
            onPageChange={(nextPage) => loadInvoices(nextPage)}
          />
        )}
      </div>

      <CreateSalesInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setInvoiceToEdit(null)
        }}
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
        onDelete={async (invoiceId) => {
          const match = invoices.find((i) => i.id === invoiceId) || selectedInvoice
          if (match) await handleDeleteInvoice(match)
        }}
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
