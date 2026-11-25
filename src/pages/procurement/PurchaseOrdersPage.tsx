import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  ShoppingCart,
  Download,
  RotateCcw,
  Check,
  Plus,
  Send,
  Ban,
  Building2,
  Warehouse as WarehouseIcon,
  Eye,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal'
import { PurchaseOrderDetailsModal } from './PurchaseOrderDetailsModal'
import { procurementService } from '../../services/procurementService'
import { useAuth } from '../../hooks/useAuth'
import type { PageResponse } from '../../types/masterData'
import type {
  PurchaseOrder,
  PurchaseOrderSummary,
  PurchaseOrderStatus,
} from '../../types/procurement'

export interface PurchaseOrdersPageProps {
  showHeader?: boolean
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
}

export function PurchaseOrdersPage({
  showHeader = true,
  isModalOpen,
  setIsModalOpen,
}: PurchaseOrdersPageProps = {}) {
  const { organization } = useAuth()
  const currencySymbol = organization?.baseCurrency === 'USD' ? '$' : organization?.baseCurrency === 'EUR' ? '€' : '₹'

  // Modal create state
  const [internalCreateModalOpen, setInternalCreateModalOpen] = useState(false)
  const isCreateOpen = isModalOpen !== undefined ? isModalOpen : internalCreateModalOpen
  const setCreateOpen = setIsModalOpen || setInternalCreateModalOpen

  const [downloadingPoId, setDownloadingPoId] = useState<number | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [summary, setSummary] = useState<PurchaseOrderSummary | null>(null)
  const [pageData, setPageData] = useState<PageResponse<PurchaseOrder> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filterRef = useRef<HTMLDivElement>(null)

  // Close context menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadSummary = useCallback(() => {
    procurementService
      .getSummary()
      .then(setSummary)
      .catch((err) => console.error('Failed to load PO summary', err))
  }, [])

  const loadOrders = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)

      const status: PurchaseOrderStatus | undefined =
        selectedStatusFilter === 'all'
          ? undefined
          : (selectedStatusFilter as PurchaseOrderStatus)

      procurementService
        .getPurchaseOrders({
          search: search.trim() || undefined,
          status,
          page,
          size: pageSize,
        })
        .then((res) => {
          setOrders(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load purchase orders.')
          setIsLoading(false)
        })
    },
    [search, selectedStatusFilter, pageSize]
  )

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders(0)
    }, 250)
    return () => clearTimeout(timer)
  }, [loadOrders])

  const handleStatusTransition = async (orderId: number, targetStatus: PurchaseOrderStatus) => {
    try {
      await procurementService.updateStatus(orderId, targetStatus)
      loadSummary()
      loadOrders(currentPage)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update order status')
    }
  }

  const handleDownloadPdf = async (poId: number, poNumber: string) => {
    try {
      setDownloadingPoId(poId)
      await procurementService.downloadPurchaseOrderPdf(poId, poNumber)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download purchase order PDF')
    } finally {
      setDownloadingPoId(null)
    }
  }

  const handleExport = () => {
    if (orders.length === 0) return
    const headers = ['PO Number', 'Supplier', 'Receiving Warehouse', 'Order Date', 'Expected Delivery', 'Items Count', 'Total Amount', 'Status']
    const rows = orders.map((o) => [
      `"${o.poNumber.replace(/"/g, '""')}"`,
      `"${o.supplierName.replace(/"/g, '""')}"`,
      `"${o.warehouseName.replace(/"/g, '""')}"`,
      o.orderDate,
      o.expectedDeliveryDate || '',
      o.itemsCount,
      o.totalAmount,
      o.status,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `purchase_orders_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const hasActiveFilters = selectedStatusFilter !== 'all' || search.trim() !== ''

  const clearAllFilters = () => {
    setSelectedStatusFilter('all')
    setSearch('')
  }

  const totalCount = pageData?.totalElements ?? orders.length

  return (
    <div className="space-y-4">
      {/* 1. Procurement Header with Action Button (rendered only if showHeader is true) */}
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3.5">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Purchase Orders
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage procurement orders, vendor commitments, and delivery schedules.
            </p>
          </div>

          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-ink text-ink-foreground hover:opacity-90 font-medium px-4 py-2 rounded-md text-sm cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create purchase order</span>
          </Button>
        </div>
      )}

      {/* 2. Unified Metric Strip */}
      <div className="flex flex-wrap items-center gap-6 py-1">
        <div>
          <span className="text-xs text-muted-foreground font-medium">Total orders</span>
          <p className="text-xl font-semibold text-foreground tracking-tight mt-0.5">
            {summary?.totalOrders ?? orders.length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Drafts</span>
          <p className="text-xl font-semibold text-muted-foreground tracking-tight mt-0.5">
            {summary?.draftCount ?? orders.filter((o) => o.status === 'DRAFT').length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Issued</span>
          <p className="text-xl font-semibold text-success tracking-tight mt-0.5">
            {summary?.issuedCount ?? orders.filter((o) => o.status === 'ISSUED').length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Partially received</span>
          <p className="text-xl font-semibold text-warning tracking-tight mt-0.5">
            {summary?.partiallyReceivedCount ?? orders.filter((o) => o.status === 'PARTIALLY_RECEIVED').length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Completed</span>
          <p className="text-xl font-semibold text-info tracking-tight mt-0.5">
            {summary?.completedCount ?? orders.filter((o) => o.status === 'COMPLETED').length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Cancelled</span>
          <p className="text-xl font-semibold text-destructive tracking-tight mt-0.5">
            {summary?.cancelledCount ?? orders.filter((o) => o.status === 'CANCELLED').length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Committed value</span>
          <p className="text-xl font-semibold text-foreground tracking-tight mt-0.5 font-mono">
            {currencySymbol}
            {(summary?.totalValue ?? orders.reduce((acc, o) => o.status !== 'CANCELLED' ? acc + o.totalAmount : acc, 0)).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedStatusFilter !== 'all' ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-sm text-foreground animate-in fade-in-50 duration-150">
              <span className="text-muted-foreground text-xs font-normal">Status:</span>
              <span className="font-medium text-xs uppercase">{selectedStatusFilter}</span>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('all')}
                className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Remove filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">All purchase orders</span>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer ml-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset all
            </button>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-64 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search PO number, vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-sm font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Filter Popover */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors cursor-pointer ${
                selectedStatusFilter !== 'all' || isFilterOpen
                  ? 'border-foreground bg-secondary text-foreground'
                  : 'border-border/80 bg-secondary text-muted-foreground hover:text-foreground hover:border-border'
              }`}
              title="Filter by status"
            >
              <Filter className="h-4 w-4" />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-card p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-2 py-1.5 border-b border-border/60 mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Filter Status</span>
                  {selectedStatusFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilter('all')}
                      className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {[
                    { id: 'all', label: 'All Statuses' },
                    { id: 'DRAFT', label: 'Draft' },
                    { id: 'ISSUED', label: 'Issued' },
                    { id: 'PARTIALLY_RECEIVED', label: 'Partially received' },
                    { id: 'COMPLETED', label: 'Completed' },
                    { id: 'CANCELLED', label: 'Cancelled' },
                  ].map((option) => {
                    const isSelected = selectedStatusFilter === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedStatusFilter(option.id)
                          setIsFilterOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-secondary text-foreground font-semibold'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-foreground stroke-[2.5]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExport}
            disabled={orders.length === 0}
            className="flex h-10 items-center gap-1.5 rounded-md border border-border/80 bg-secondary px-3.5 text-xs font-medium text-foreground hover:border-border hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Export as CSV"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 4. Table Section */}
      <div className="w-full">
        {isLoading && orders.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading purchase orders...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadOrders(0)}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No purchase orders found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {search || selectedStatusFilter !== 'all'
                ? 'No purchase orders match your filter criteria. Try resetting filters.'
                : 'Your organization has no purchase orders yet. Click "+ Create purchase order" above to issue your first order.'}
            </p>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="mt-4 gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset filters</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="mt-4 gap-1.5 bg-ink text-ink-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create purchase order</span>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>PO number</TH>
                <TH>Supplier</TH>
                <TH>Receiving warehouse</TH>
                <TH>Order date</TH>
                <TH>Items</TH>
                <TH className="text-right">Total amount</TH>
                <TH className="text-center">Status</TH>
                <TH className="text-right w-24" />
              </tr>
            </THead>
            <TBody>
                {orders.map((po) => (
                  <TR
                    key={po.id}
                    onClick={() => setSelectedOrder(po)}
                    clickable
                    className="group"
                  >
                    <TD>
                      <span className="text-ref-link">
                        {po.poNumber}
                      </span>
                    </TD>

                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Building2 className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                        <div>
                          <p className="font-medium">{po.supplierName}</p>
                          <p className="text-[11px] text-ref text-muted-foreground">{po.supplierCode}</p>
                        </div>
                      </div>
                    </TD>

                    <TD>
                      <div className="flex items-center gap-2">
                        <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{po.warehouseName}</span>
                      </div>
                    </TD>

                    <TD className="font-normal text-muted-foreground">
                      {po.orderDate}
                    </TD>

                    <TD className="font-normal text-muted-foreground">
                      {po.itemsCount} {po.itemsCount === 1 ? 'item' : 'items'}
                    </TD>

                    <TD className="text-right font-mono font-medium">
                      {currencySymbol}{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TD>

                    <TD className="text-center">
                      {po.status === 'ISSUED' && (
                        <Badge variant="success">Issued</Badge>
                      )}
                      {po.status === 'PARTIALLY_RECEIVED' && (
                        <Badge variant="warning">Partially received</Badge>
                      )}
                      {po.status === 'COMPLETED' && (
                        <Badge variant="info">Completed</Badge>
                      )}
                      {po.status === 'DRAFT' && (
                        <Badge variant="neutral">Draft</Badge>
                      )}
                      {po.status === 'CANCELLED' && (
                        <Badge variant="destructive">Cancelled</Badge>
                      )}
                    </TD>

                    <TD className="text-right whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(po)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                          title="View PO Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(po.id, po.poNumber)}
                          disabled={downloadingPoId === po.id}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                          title="Download PDF"
                        >
                          {downloadingPoId === po.id ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent inline-block" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>

                        {po.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => handleStatusTransition(po.id, 'ISSUED')}
                            className="p-1.5 rounded-md text-success hover:text-success hover:bg-success/10 cursor-pointer transition-colors"
                            title="Issue Purchase Order"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}

                        {po.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => handleStatusTransition(po.id, 'CANCELLED')}
                            className="p-1.5 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                            title="Cancel Order"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
            </TBody>
          </Table>
        )}

        {/* 5. Pagination Footer */}
        {orders.length > 0 && pageData && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60 text-xs text-muted-foreground">
            <div>
              Showing {orders.length} of {totalCount} purchase orders
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 0 || isLoading}
                onClick={() => loadOrders(currentPage - 1)}
                className="flex items-center gap-1 rounded-md border border-border/80 bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="px-2 font-medium text-foreground">
                Page {currentPage + 1} of {Math.max(1, pageData.totalPages)}
              </span>
              <button
                type="button"
                disabled={currentPage + 1 >= pageData.totalPages || isLoading}
                onClick={() => loadOrders(currentPage + 1)}
                className="flex items-center gap-1 rounded-md border border-border/80 bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Purchase Order Modal */}
      <CreatePurchaseOrderModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          loadSummary()
          loadOrders(0)
        }}
      />

      {/* View Purchase Order Details Modal */}
      <PurchaseOrderDetailsModal
        isOpen={!!selectedOrder}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onDownloadPdf={handleDownloadPdf}
        onStatusChange={async (id, status) => {
          await handleStatusTransition(id, status)
          procurementService
            .getPurchaseOrderById(id)
            .then(setSelectedOrder)
            .catch(() => setSelectedOrder(null))
        }}
      />
    </div>
  )
}
