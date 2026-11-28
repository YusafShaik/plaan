import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Layers,
  Eye,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Ban,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
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
import { manufacturingService } from '../../services/manufacturingService'
import { confirmAction, toast } from '../../lib/feedback'
import { formatQuantity } from '../../lib/format'
import { cn } from '../../lib/cn'
import { CreateProductionOrderModal } from './CreateProductionOrderModal'
import { ProductionOrderDetailsModal } from './ProductionOrderDetailsModal'
import type { ProductionOrder, ProductionOrderStatus } from '../../types/manufacturing'
import type { PageResponse } from '../../types/masterData'

const ORDER_STATUS_FILTERS: Array<{ id: ProductionOrderStatus | ''; label: string }> = [
  { id: '', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'RELEASED', label: 'Released' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_BADGE: Record<ProductionOrderStatus, { variant: BadgeVariant; label: string }> = {
  DRAFT: { variant: 'neutral', label: 'Draft' },
  RELEASED: { variant: 'info', label: 'Released' },
  IN_PROGRESS: { variant: 'warning', label: 'In progress' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  CLOSED: { variant: 'neutral', label: 'Closed' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

export interface ProductionOrdersPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
}

export function ProductionOrdersPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
}: ProductionOrdersPageProps = {}) {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [pageData, setPageData] = useState<PageResponse<ProductionOrder> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductionOrderStatus | ''>('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isCreateModalOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsCreateModalOpen = setControlledModalOpen || setInternalModalOpen
  const [editingDraft, setEditingDraft] = useState<ProductionOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const menuContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadOrders = useCallback(
    (page = 0) => {
      manufacturingService
        .getProductionOrders({
          search: search.trim() || undefined,
          status: statusFilter ? statusFilter : undefined,
          page,
          size: pageSize,
          sortBy: 'createdAt',
          direction: 'desc',
        })
        .then((res) => {
          setError(null)
          setOrders(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load production orders.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders(0)
    }, 0)
    return () => clearTimeout(timer)
  }, [loadOrders])

  const handleReleaseOrder = async (id: number) => {
    try {
      await manufacturingService.releaseProductionOrder(id)
      loadOrders(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedOrder(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to release production order')
    }
  }

  const handleCancelOrder = async (id: number) => {
    const ok = await confirmAction({
      title: 'Cancel production order?',
      description: 'This production order will be cancelled.',
      confirmLabel: 'Cancel order',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await manufacturingService.cancelProductionOrder(id)
      loadOrders(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedOrder(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel production order')
    }
  }

  const handleDeleteDraftOrder = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete draft production order?',
      description: 'This draft production order will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await manufacturingService.deleteDraftProductionOrder(id)
      loadOrders(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedOrder(null)
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete draft production order'
      )
    }
  }

  const handleOpenDetails = async (order: ProductionOrder) => {
    setSelectedOrder(order)
    setIsDetailsModalOpen(true)
    try {
      const detailed = await manufacturingService.getProductionOrderById(order.id)
      setSelectedOrder(detailed)
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenEdit = (order: ProductionOrder) => {
    setIsDetailsModalOpen(false)
    setSelectedOrder(null)
    setEditingDraft(order)
    setIsCreateModalOpen(true)
  }

  const hasActiveFilters = Boolean(search.trim() || statusFilter)
  const clearAllFilters = () => {
    setSearch('')
    setStatusFilter('')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search production orders..."
        />

        <div
          className="inline-flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Filter by status"
        >
          {ORDER_STATUS_FILTERS.map((opt) => {
            const active = statusFilter === opt.id
            return (
              <button
                key={opt.id || 'all'}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
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

      <div className="w-full" ref={menuContainerRef}>
        {isLoading && orders.length === 0 ? (
          <div className="py-20 text-center rounded-md border border-border bg-card">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading production orders...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center rounded-md border border-border bg-card">
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
                  <TH className="w-[12%]">Order no.</TH>
                  <TH className="w-[23%]">Product</TH>
                  <TH className="w-[12%] text-right">Quantity</TH>
                  <TH className="w-[14%] pl-5">Source warehouse</TH>
                  <TH className="w-[14%]">Output warehouse</TH>
                  <TH className="w-[11%]">Status</TH>
                  <TH className="w-[14%] px-3 text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {orders.length === 0 ? (
                  <TR>
                    <TD colSpan={7} className="p-0">
                      <TableEmptyState
                        icon={<Layers className="h-5 w-5" />}
                        title="No production orders found"
                        description={
                          hasActiveFilters
                            ? 'No production orders match your current search or status filter.'
                            : 'Create a production order using "+ Create production order" above.'
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
                  orders.map((o) => {
                    const badge = STATUS_BADGE[o.status] ?? {
                      variant: 'neutral',
                      label: o.status,
                    }

                    return (
                      <TR
                        key={o.id}
                        clickable
                        onClick={() => {
                          setOpenMenuId(null)
                          handleOpenDetails(o)
                        }}
                      >
                        <TD>
                          <span className="text-ref-link">{o.orderNumber}</span>
                        </TD>

                        <TD>
                          <p className="font-medium truncate">{o.productName}</p>
                          <p className="text-ref text-muted-foreground truncate">
                            {o.productCode} · BOM: {o.bomCode}
                          </p>
                        </TD>

                        <TD className="text-right tabular-nums font-medium">
                          {formatQuantity(o.productionQuantity)}{' '}
                          <span className="text-xs font-normal text-muted-foreground uppercase">
                            {o.unitOfMeasure}
                          </span>
                        </TD>

                        <TD className="pl-5">
                          <p className="font-medium truncate">{o.sourceWarehouseName}</p>
                          <p className="text-ref text-muted-foreground">
                            {o.sourceWarehouseCode}
                          </p>
                        </TD>

                        <TD>
                          <p className="font-medium truncate">{o.finishedGoodsWarehouseName}</p>
                          <p className="text-ref text-muted-foreground">
                            {o.finishedGoodsWarehouseCode}
                          </p>
                        </TD>

                        <TD>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TD>

                        <TD className="px-3 text-right whitespace-nowrap">
                          <div
                            className="relative inline-flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {o.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => handleReleaseOrder(o.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                title="Release production order"
                              >
                                <PackageCheck className="h-3 w-3 text-muted-foreground" />
                                Release
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === o.id ? null : o.id))
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                              aria-label="More order actions"
                              aria-expanded={openMenuId === o.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {openMenuId === o.id && (
                              <div className="absolute right-0 top-full z-40 mt-1 w-40 rounded-md border border-border bg-card py-1 shadow-panel text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    handleOpenDetails(o)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                  View details
                                </button>
                                {o.status === 'DRAFT' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null)
                                        handleOpenEdit(o)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                      Edit draft
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null)
                                        handleDeleteDraftOrder(o.id)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete draft
                                    </button>
                                  </>
                                )}
                                {o.status === 'RELEASED' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      handleCancelOrder(o.id)
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
                totalElements={pageData.totalElements}
                count={orders.length}
                itemLabel="production orders"
                onPageChange={(nextPage) => {
                  setIsLoading(true)
                  loadOrders(nextPage)
                }}
              />
            )}
          </div>
        )}
      </div>

      <CreateProductionOrderModal
        isOpen={isCreateModalOpen}
        initialDraft={editingDraft}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingDraft(null)
        }}
        onSuccess={() => {
          loadOrders(currentPage)
        }}
      />

      <ProductionOrderDetailsModal
        isOpen={isDetailsModalOpen}
        order={selectedOrder}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedOrder(null)
        }}
        onEdit={handleOpenEdit}
        onRelease={handleReleaseOrder}
        onCancel={handleCancelOrder}
        onDelete={handleDeleteDraftOrder}
        onOrderUpdated={() => loadOrders(currentPage)}
      />
    </div>
  )
}
