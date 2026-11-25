import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Ban,
  Eye,
  RotateCcw,
  Pencil,
  Trash2,
  PackageCheck,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { manufacturingService } from '../../services/manufacturingService'
import { CreateProductionOrderModal } from './CreateProductionOrderModal'
import { ProductionOrderDetailsModal } from './ProductionOrderDetailsModal'
import type { ProductionOrder, ProductionOrderStatus } from '../../types/manufacturing'
import type { PageResponse } from '../../types/masterData'

export function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [pageData, setPageData] = useState<PageResponse<ProductionOrder> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductionOrderStatus | ''>('')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState<ProductionOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

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
          setError(err instanceof Error ? err.message : 'Failed to load Production Orders.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    loadOrders(0)
  }, [loadOrders])

  const handleReleaseOrder = async (id: number) => {
    try {
      await manufacturingService.releaseProductionOrder(id)
      loadOrders(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedOrder(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to release Production Order')
    }
  }

  const handleCancelOrder = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this production order?')) return
    try {
      await manufacturingService.cancelProductionOrder(id)
      loadOrders(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedOrder(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel Production Order')
    }
  }

  const handleDeleteDraftOrder = async (id: number) => {
    if (!confirm('Are you sure you want to delete this draft production order?')) return
    try {
      await manufacturingService.deleteDraftProductionOrder(id)
      loadOrders(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedOrder(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete draft Production Order')
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

  const formatQuantity = (qty: number) => {
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
  }

  return (
    <div className="space-y-4">
      {/* 1. Toolbar matching standard design: Search, Status Filter, + New Production Order */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-64 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search production orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProductionOrderStatus | '')}
            className="flex h-10 items-center rounded-[10px] border border-border/80 bg-secondary px-3 text-xs font-medium text-foreground focus:outline-none focus:border-foreground cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="RELEASED">Released</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

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

        {/* Right side: + New Production Order button */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={() => {
              setEditingDraft(null)
              setIsCreateModalOpen(true)
            }}
            className="flex h-10 items-center gap-1.5 rounded-[10px] bg-primary text-primary-foreground px-4 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Production Order</span>
          </Button>
        </div>
      </div>

      {/* 2. Production Orders Table matching reference screenshot */}
      <div className="w-full">
        {isLoading && orders.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading production orders...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
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
        ) : orders.length === 0 ? (
          <div className="py-16 text-center rounded-[12px] border border-border/80 bg-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <Layers className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No production orders found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Production Orders instruct manufacturing batches based on active Bill of Materials recipes.
            </p>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Production Order</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[12px] border border-border/80 bg-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Order No.</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Source WH</th>
                  <th className="py-3 px-4">FG WH</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-secondary/40 transition-colors">
                    {/* Order No */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(o)}
                        className="font-mono font-medium text-xs text-blue-500 hover:text-blue-400 hover:underline cursor-pointer"
                        title="Click to view order details"
                      >
                        {o.orderNumber}
                      </button>
                    </td>

                    {/* Product */}
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-medium text-foreground">{o.productName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {o.productCode} · BOM: {o.bomCode}
                      </p>
                    </td>

                    {/* Quantity */}
                    <td className="py-3.5 px-4 text-xs font-mono font-medium text-foreground">
                      {formatQuantity(o.productionQuantity)} {o.unitOfMeasure}
                    </td>

                    {/* Source WH */}
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-medium text-foreground">{o.sourceWarehouseName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{o.sourceWarehouseCode}</p>
                    </td>

                    {/* FG WH */}
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-medium text-foreground">{o.finishedGoodsWarehouseName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{o.finishedGoodsWarehouseCode}</p>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {o.status === 'RELEASED' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Released
                        </span>
                      )}
                      {o.status === 'IN_PROGRESS' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-500 border border-blue-500/20">
                          <Clock className="h-3.5 w-3.5" />
                          In Progress
                        </span>
                      )}
                      {o.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Completed
                        </span>
                      )}
                      {o.status === 'CLOSED' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-semibold text-zinc-400 border border-zinc-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Closed
                        </span>
                      )}
                      {o.status === 'DRAFT' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                          <Clock className="h-3.5 w-3.5" />
                          Draft
                        </span>
                      )}
                      {o.status === 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20">
                          <Ban className="h-3.5 w-3.5" />
                          Cancelled
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {o.status === 'DRAFT' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(o)}
                            className="h-8 px-2.5 text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReleaseOrder(o.id)}
                            className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer inline-flex items-center gap-1"
                          >
                            <PackageCheck className="h-3 w-3" />
                            <span>Release</span>
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraftOrder(o.id)}
                            className="text-xs text-destructive hover:underline cursor-pointer ml-1 p-1"
                            title="Delete draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : o.status === 'RELEASED' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelOrder(o.id)}
                            className="h-8 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(o)}
                            className="h-8 px-2.5 text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(o)}
                          className="h-8 px-2.5 text-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination footer */}
            {pageData && pageData.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/80 px-4 py-3 text-xs text-muted-foreground">
                <span>
                  Showing {orders.length} of {pageData.totalElements} production orders
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsLoading(true)
                      loadOrders(currentPage - 1)
                    }}
                    disabled={currentPage === 0}
                    className="h-8 gap-1 text-xs cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </Button>
                  <span className="px-2 text-foreground font-medium">
                    Page {pageData.page + 1} of {pageData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsLoading(true)
                      loadOrders(currentPage + 1)
                    }}
                    disabled={currentPage >= pageData.totalPages - 1}
                    className="h-8 gap-1 text-xs cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Production Order Popup Modal */}
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

      {/* Production Order Details Modal */}
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
