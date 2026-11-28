import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ShoppingCart,
  Download,
  RotateCcw,
  Plus,
  Send,
  Ban,
  Eye,
  MoreHorizontal,
  PackageCheck,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
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
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal'
import { PurchaseOrderDetailsModal } from './PurchaseOrderDetailsModal'
import { procurementService } from '../../services/procurementService'
import { useAuth } from '../../hooks/useAuth'
import { confirmAction, toast } from '../../lib/feedback'
import { formatMoney, formatShortDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { PageResponse } from '../../types/masterData'
import type {
  PurchaseOrder,
  PurchaseOrderSummary,
  PurchaseOrderStatus,
} from '../../types/procurement'

const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'ISSUED', label: 'Issued' },
  { id: 'PARTIALLY_RECEIVED', label: 'Partially received' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_BADGE: Record<PurchaseOrderStatus, { variant: BadgeVariant; label: string }> = {
  DRAFT: { variant: 'neutral', label: 'Draft' },
  ISSUED: { variant: 'info', label: 'Issued' },
  PARTIALLY_RECEIVED: { variant: 'warning', label: 'Partially received' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

export interface PurchaseOrdersPageProps {
  showHeader?: boolean
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
  onReceiveGoods?: (orderId: number) => void
}

export function PurchaseOrdersPage({
  showHeader = true,
  isModalOpen,
  setIsModalOpen,
  onReceiveGoods,
}: PurchaseOrdersPageProps = {}) {
  const { organization } = useAuth()
  const currency = organization?.baseCurrency || 'INR'

  const [internalCreateModalOpen, setInternalCreateModalOpen] = useState(false)
  const isCreateOpen = isModalOpen !== undefined ? isModalOpen : internalCreateModalOpen
  const setCreateOpen = setIsModalOpen || setInternalCreateModalOpen

  const [downloadingPoId, setDownloadingPoId] = useState<number | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [openMenuPoId, setOpenMenuPoId] = useState<number | null>(null)

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [summary, setSummary] = useState<PurchaseOrderSummary | null>(null)
  const [pageData, setPageData] = useState<PageResponse<PurchaseOrder> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const menuContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setOpenMenuPoId(null)
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

  const handleStatusTransition = async (
    orderId: number,
    targetStatus: PurchaseOrderStatus,
    requireConfirm = false,
    poNumber?: string
  ) => {
    if (requireConfirm && targetStatus === 'CANCELLED') {
      const confirmed = await confirmAction({
        title: `Cancel ${poNumber || 'purchase order'}?`,
        description:
          'This purchase order will be marked cancelled and removed from open pipeline.',
        confirmLabel: 'Cancel order',
        variant: 'destructive',
      })
      if (!confirmed) return
    }

    try {
      await procurementService.updateStatus(orderId, targetStatus)
      loadSummary()
      loadOrders(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order status')
    }
  }

  const handleDownloadPdf = async (poId: number, poNumber: string) => {
    try {
      setDownloadingPoId(poId)
      await procurementService.downloadPurchaseOrderPdf(poId, poNumber)
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to download purchase order PDF'
      )
    } finally {
      setDownloadingPoId(null)
    }
  }

  const handleExport = () => {
    if (orders.length === 0) return
    const headers = [
      'PO Number',
      'Supplier',
      'Receiving Warehouse',
      'Order Date',
      'Expected Delivery',
      'Items Count',
      'Total Amount',
      'Status',
    ]
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
    link.setAttribute(
      'download',
      `purchase_orders_export_${new Date().toISOString().split('T')[0]}.csv`
    )
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

  const openPipeline =
    (summary?.draftCount ?? orders.filter((o) => o.status === 'DRAFT').length) +
    (summary?.issuedCount ?? orders.filter((o) => o.status === 'ISSUED').length) +
    (summary?.partiallyReceivedCount ??
      orders.filter((o) => o.status === 'PARTIALLY_RECEIVED').length)

  const committedValue =
    summary?.totalValue ??
    orders.reduce((acc, o) => (o.status !== 'CANCELLED' ? acc + o.totalAmount : acc), 0)

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Purchase orders
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Supplier commitments and inbound deliveries.
            </p>
          </div>

          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Create purchase order
          </Button>
        </div>
      )}

      <KpiCardGrid columns={3}>
        <KpiCard label="Total orders" value={summary?.totalOrders ?? orders.length} />
        <KpiCard label="Open pipeline" value={openPipeline} />
        <KpiCard
          label="Committed value"
          value={formatMoney(committedValue, currency)}
        />
      </KpiCardGrid>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search PO number or supplier..."
          />

          <div
            className="inline-flex flex-wrap items-center gap-1"
            role="group"
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((opt) => {
              const active = selectedStatusFilter === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedStatusFilter(opt.id)}
                  className={cn(
                    'h-8 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                    active
                      ? 'bg-ink text-ink-foreground'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer px-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={orders.length === 0}
          className="self-start lg:self-auto"
          title="Export as CSV"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          Export
        </Button>
      </div>

      {/* Table Section */}
      <div className="w-full" ref={menuContainerRef}>
        {isLoading && orders.length === 0 ? (
          <div className="py-20 text-center rounded-md border border-border bg-card">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading purchase orders...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center rounded-md border border-border bg-card">
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
        ) : (
          <div className="rounded-md border border-border/80 bg-card overflow-visible">
            <Table className="border-0 rounded-none overflow-visible" tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="w-[12%]">PO number</TH>
                  <TH className="w-[21%]">Supplier</TH>
                  <TH className="w-[14%]">Warehouse</TH>
                  <TH className="w-[11%]">Order date</TH>
                  <TH className="w-[7%] text-right">Items</TH>
                  <TH className="w-[11%] text-right">Total</TH>
                  <TH className="w-[11%] pl-6">Status</TH>
                  <TH className="w-[13%] px-3 text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {orders.length === 0 ? (
                  <TR>
                    <TD colSpan={8} className="p-0">
                      <TableEmptyState
                        icon={<ShoppingCart className="h-5 w-5" />}
                        title="No purchase orders found"
                        description={
                          hasActiveFilters
                            ? 'No purchase orders match your current search or status filter.'
                            : 'Issue your first purchase order using "+ Create purchase order" above.'
                        }
                        action={
                          hasActiveFilters ? (
                            <Button variant="outline" size="sm" onClick={clearAllFilters}>
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reset filters
                            </Button>
                          ) : undefined
                        }
                      />
                    </TD>
                  </TR>
                ) : (
                  orders.map((po) => {
                    const badge = STATUS_BADGE[po.status] ?? {
                      variant: 'neutral',
                      label: po.status,
                    }
                    const canReceive =
                      (po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED') &&
                      !!onReceiveGoods

                    return (
                      <TR
                        key={po.id}
                        onClick={() => {
                          setOpenMenuPoId(null)
                          setSelectedOrder(po)
                        }}
                        clickable
                        className="group"
                      >
                        <TD>
                          <span className="text-ref-link">{po.poNumber}</span>
                        </TD>

                        <TD>
                          <p className="font-medium text-foreground truncate">
                            {po.supplierName}
                          </p>
                          <p className="text-ref text-muted-foreground">{po.supplierCode}</p>
                        </TD>

                        <TD className="truncate">{po.warehouseName}</TD>

                        <TD className="tabular-nums text-muted-foreground font-normal">
                          {formatShortDate(po.orderDate)}
                        </TD>

                        <TD className="text-right tabular-nums font-normal">
                          {po.itemsCount}
                        </TD>

                        <TD className="text-right tabular-nums font-medium">
                          {formatMoney(po.totalAmount, currency)}
                        </TD>

                        <TD className="pl-6">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TD>

                        <TD className="px-3 text-right whitespace-nowrap">
                          <div
                            className="relative inline-flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {po.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => handleStatusTransition(po.id, 'ISSUED')}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                title="Issue purchase order"
                              >
                                <Send className="h-3 w-3 text-muted-foreground" />
                                Issue
                              </button>
                            )}

                            {canReceive && (
                              <button
                                type="button"
                                onClick={() => onReceiveGoods!(po.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                title="Create goods receipt for this order"
                              >
                                <PackageCheck className="h-3 w-3 text-muted-foreground" />
                                Receive
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuPoId((prev) => (prev === po.id ? null : po.id))
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                              aria-label="More order actions"
                              aria-expanded={openMenuPoId === po.id}
                            >
                              {downloadingPoId === po.id ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </button>

                            {openMenuPoId === po.id && (
                              <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-md border border-border bg-card py-1 shadow-panel text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuPoId(null)
                                    setSelectedOrder(po)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                  View details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuPoId(null)
                                    handleDownloadPdf(po.id, po.poNumber)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
                                >
                                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                  Download PDF
                                </button>
                                {po.status !== 'CANCELLED' && po.status !== 'COMPLETED' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuPoId(null)
                                      handleStatusTransition(
                                        po.id,
                                        'CANCELLED',
                                        true,
                                        po.poNumber
                                      )
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    Cancel order
                                  </button>
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
                totalElements={totalCount}
                count={orders.length}
                itemLabel="purchase orders"
                onPageChange={loadOrders}
              />
            )}
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

      {/* View Purchase Order Details Drawer */}
      <PurchaseOrderDetailsModal
        isOpen={!!selectedOrder}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onDownloadPdf={handleDownloadPdf}
        onReceiveGoods={onReceiveGoods}
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
