import { useState, useEffect, useCallback } from 'react'
import {
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { Badge, type BadgeProps } from '../../components/ui/Badge'
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
import { CreateSalesOrderModal } from './CreateSalesOrderModal'
import { SalesOrderDetailsModal } from './SalesOrderDetailsModal'
import { salesService } from '../../services/salesService'
import { useAuth } from '../../hooks/useAuth'
import { confirmAction, toast } from '../../lib/feedback'
import { formatMoney, formatShortDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { SalesOrder, SalesOrderStatus } from '../../types/sales'
import type { PageResponse } from '../../types/masterData'

const STATUS_FILTERS: { value: SalesOrderStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PARTIALLY_DISPATCHED', label: 'Partially dispatched' },
  { value: 'FULLY_DISPATCHED', label: 'Fully dispatched' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_BADGE: Record<
  SalesOrderStatus,
  { variant: NonNullable<BadgeProps['variant']>; label: string }
> = {
  DRAFT: { variant: 'neutral', label: 'Draft' },
  CONFIRMED: { variant: 'info', label: 'Confirmed' },
  PARTIALLY_DISPATCHED: { variant: 'warning', label: 'Partially dispatched' },
  FULLY_DISPATCHED: { variant: 'success', label: 'Fully dispatched' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

export interface SalesOrdersPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
}

export function SalesOrdersPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
}: SalesOrdersPageProps = {}) {
  const { organization } = useAuth()
  const baseCurrency = organization?.baseCurrency || 'INR'

  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [pageData, setPageData] = useState<PageResponse<SalesOrder> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SalesOrderStatus | ''>('')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isCreateModalOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsCreateModalOpen = setControlledModalOpen || setInternalModalOpen
  const [orderToEdit, setOrderToEdit] = useState<SalesOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const loadOrders = useCallback(
    (page = 0) => {
      setError(null)
      salesService
        .getSalesOrders({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          page,
          size: pageSize,
          sortBy: 'createdAt',
          direction: 'desc',
        })
        .then((res) => {
          setOrders(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load sales orders.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders(0)
    }, 200)
    return () => clearTimeout(timer)
  }, [loadOrders])

  useEffect(() => {
    if (openMenuId === null) return
    const handleOutside = () => setOpenMenuId(null)
    window.addEventListener('click', handleOutside)
    return () => window.removeEventListener('click', handleOutside)
  }, [openMenuId])

  const handleOpenEdit = (order: SalesOrder) => {
    setOpenMenuId(null)
    setOrderToEdit(order)
    setIsCreateModalOpen(true)
  }

  const handleOpenDetails = async (order: SalesOrder) => {
    setOpenMenuId(null)
    setSelectedOrder(order)
    setIsDetailsModalOpen(true)
    try {
      const detailed = await salesService.getSalesOrderById(order.id)
      setSelectedOrder(detailed)
    } catch {
      // Keep summary order data visible if detail refresh fails
    }
  }

  const handleConfirmOrder = async (order: SalesOrder) => {
    setOpenMenuId(null)
    setProcessingId(order.id)
    try {
      await salesService.confirmSalesOrder(order.id)
      toast.success(`Sales order ${order.orderNumber} confirmed`)
      loadOrders(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm sales order.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancelOrder = async (order: SalesOrder) => {
    setOpenMenuId(null)
    const ok = await confirmAction({
      title: `Cancel sales order ${order.orderNumber}?`,
      description: 'This sales order will be marked as cancelled.',
      confirmLabel: 'Cancel order',
      variant: 'destructive',
    })
    if (!ok) return
    setProcessingId(order.id)
    try {
      await salesService.cancelSalesOrder(order.id)
      toast.success(`Sales order ${order.orderNumber} cancelled`)
      loadOrders(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel sales order.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteDraft = async (order: SalesOrder) => {
    setOpenMenuId(null)
    const ok = await confirmAction({
      title: `Delete draft order ${order.orderNumber}?`,
      description: 'This draft sales order will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    setProcessingId(order.id)
    try {
      await salesService.deleteSalesOrder(order.id)
      toast.success(`Draft sales order ${order.orderNumber} deleted`)
      loadOrders(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete draft order.')
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
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search sales orders..."
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((pill) => {
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
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="py-20 text-center rounded-md border border-border/80 bg-card">
          <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-foreground" />
          <p className="text-xs text-muted-foreground">Loading sales orders...</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center rounded-md border border-border/80 bg-card">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoading(true)
              loadOrders(0)
            }}
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
                <TH className="w-[13%]">Order no.</TH>
                <TH className="w-[25%]">Customer</TH>
                <TH className="w-[12%]">Order date</TH>
                <TH className="w-[7%] text-right">Items</TH>
                <TH className="w-[13%] text-right">Amount</TH>
                <TH className="w-[16%] pl-6">Status</TH>
                <TH className="w-[14%] px-3 text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {orders.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="p-0">
                    <TableEmptyState
                      icon={<CircleDollarSign className="h-5 w-5" />}
                      title="No sales orders found"
                      description={
                        hasFilters
                          ? 'No sales orders match your current search or status filter.'
                          : 'Record customer requirements and pricing using "+ New sales order" above.'
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
                orders.map((o) => {
                  const badge = STATUS_BADGE[o.status] ?? {
                    variant: 'neutral',
                    label: o.status,
                  }
                  const isBusy = processingId === o.id
                  const itemCount = o.itemsCount ?? o.items?.length ?? 0

                  return (
                    <TR key={o.id} clickable onClick={() => void handleOpenDetails(o)}>
                      <TD>
                        <span className="text-ref-link">{o.orderNumber}</span>
                        {o.customerPoReference && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {o.customerPoReference}
                          </p>
                        )}
                      </TD>

                      <TD>
                        <p className="font-medium text-foreground truncate">{o.customerName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {o.customerCode} · {o.warehouseName}
                        </p>
                      </TD>

                      <TD className="text-muted-foreground tabular-nums">
                        {formatShortDate(o.orderDate)}
                      </TD>

                      <TD className="text-right tabular-nums font-medium">{itemCount}</TD>

                      <TD className="text-right tabular-nums font-medium">
                        {formatMoney(o.totalAmount, o.currency || baseCurrency)}
                      </TD>

                      <TD className="pl-6">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TD>

                      <TD className="px-3 text-right">
                        <div
                          className="relative inline-flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {o.status === 'DRAFT' ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => void handleConfirmOrder(o)}
                            >
                              {isBusy ? '...' : 'Confirm'}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleOpenDetails(o)}
                            >
                              View
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}
                            aria-label="Sales order actions"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {openMenuId === o.id && (
                            <div className="absolute right-0 top-9 z-40 w-44 rounded-md border border-border bg-card shadow-md py-1 text-left">
                              <button
                                type="button"
                                onClick={() => void handleOpenDetails(o)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                View details
                              </button>

                              {o.status === 'DRAFT' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(o)}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    Edit draft
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleConfirmOrder(o)}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    Confirm order
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteDraft(o)}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete draft
                                  </button>
                                </>
                              )}

                              {o.status === 'CONFIRMED' && (
                                <button
                                  type="button"
                                  onClick={() => void handleCancelOrder(o)}
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
              totalElements={pageData.totalElements}
              count={orders.length}
              itemLabel="orders"
              onPageChange={(nextPage) => loadOrders(nextPage)}
            />
          )}
        </div>
      )}

      <CreateSalesOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setOrderToEdit(null)
        }}
        onSuccess={() => {
          loadOrders(currentPage)
        }}
        orderToEdit={orderToEdit}
      />

      <SalesOrderDetailsModal
        isOpen={isDetailsModalOpen}
        order={selectedOrder}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedOrder(null)
        }}
        onEdit={(ord) => {
          setIsDetailsModalOpen(false)
          handleOpenEdit(ord)
        }}
        onOrderUpdated={() => {
          loadOrders(currentPage)
        }}
      />
    </div>
  )
}
