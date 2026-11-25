import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Ban,
  Eye,
  RotateCcw,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { inventoryService } from '../../services/inventoryService'
import { CreateStockTransferModal } from './CreateStockTransferModal'
import { StockTransferDetailsModal } from './StockTransferDetailsModal'
import type { StockTransfer, StockTransferStatus } from '../../types/inventory'
import type { PageResponse } from '../../types/masterData'

export function StockTransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [pageData, setPageData] = useState<PageResponse<StockTransfer> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StockTransferStatus | ''>('')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState<StockTransfer | null>(null)
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const loadTransfers = useCallback(
    (page = 0) => {
      inventoryService
        .getStockTransfers({
          search: search.trim() || undefined,
          status: statusFilter ? statusFilter : undefined,
          page,
          size: pageSize,
          sortBy: 'createdAt',
          direction: 'desc',
        })
        .then((res) => {
          setError(null)
          setTransfers(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load stock transfers.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    loadTransfers(0)
  }, [loadTransfers])

  const handlePostTransfer = async (id: number) => {
    try {
      await inventoryService.postStockTransfer(id)
      loadTransfers(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedTransfer(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to post transfer')
    }
  }

  const handleCancelTransfer = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this draft stock transfer?')) return
    try {
      await inventoryService.cancelStockTransfer(id)
      loadTransfers(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedTransfer(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel transfer')
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatQuantity = (qty: number) => {
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
  }

  return (
    <div className="space-y-4">
      {/* 1. Toolbar: Search, Status filter, + New Transfer button */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-64 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search transfers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StockTransferStatus | '')}
            className="flex h-10 items-center rounded-[10px] border border-border/80 bg-secondary px-3 text-xs font-medium text-foreground focus:outline-none focus:border-foreground cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="POSTED">Posted</option>
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

        {/* Right side: + New Transfer button */}
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
            <span>New Transfer</span>
          </Button>
        </div>
      </div>

      {/* 2. Stock Transfers Table */}
      <div className="w-full">
        {isLoading && transfers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading stock transfers...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadTransfers(0)} className="mt-3">
              Retry
            </Button>
          </div>
        ) : transfers.length === 0 ? (
          <div className="py-16 text-center rounded-[12px] border border-border/80 bg-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <ArrowRight className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No stock transfers found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Create a stock transfer to move materials between warehouses. Total organization stock remains unchanged.
            </p>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Transfer</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[12px] border border-border/80 bg-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To</th>
                  <th className="py-3 px-4">Transfer Date</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-secondary/40 transition-colors">
                    {/* Reference */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransfer(t)
                          setIsDetailsModalOpen(true)
                        }}
                        className="font-mono font-medium text-xs text-blue-500 hover:text-blue-400 hover:underline cursor-pointer"
                        title="Click to view transfer details"
                      >
                        {t.transferNumber}
                      </button>
                    </td>

                    {/* From Warehouse */}
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-medium text-foreground">{t.fromWarehouseName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {t.fromWarehouseCode}
                      </p>
                    </td>

                    {/* To Warehouse */}
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-medium text-foreground">{t.toWarehouseName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {t.toWarehouseCode}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(t.transferDate)}
                    </td>

                    {/* Items & Total Qty */}
                    <td className="py-3.5 px-4 text-xs text-center font-mono">
                      <span className="font-medium text-foreground">{t.totalItems}</span>
                      <span className="text-[11px] text-muted-foreground ml-1">
                        ({formatQuantity(t.totalQuantity)})
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {t.status === 'POSTED' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Posted
                        </span>
                      )}
                      {t.status === 'DRAFT' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                          <Clock className="h-3.5 w-3.5" />
                          Draft
                        </span>
                      )}
                      {t.status === 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20">
                          <Ban className="h-3.5 w-3.5" />
                          Cancelled
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {t.status === 'DRAFT' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingDraft(t)
                              setIsCreateModalOpen(true)
                            }}
                            className="h-8 px-2.5 text-xs cursor-pointer"
                          >
                            Edit / Post
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleCancelTransfer(t.id)}
                            className="text-xs text-destructive hover:underline cursor-pointer ml-1"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransfer(t)
                            setIsDetailsModalOpen(true)
                          }}
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
                  Showing {transfers.length} of {pageData.totalElements} transfers
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTransfers(currentPage - 1)}
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
                    onClick={() => loadTransfers(currentPage + 1)}
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

      {/* Create / Edit Transfer Modal */}
      <CreateStockTransferModal
        isOpen={isCreateModalOpen}
        initialDraft={editingDraft}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingDraft(null)
        }}
        onSuccess={() => {
          loadTransfers(currentPage)
        }}
      />

      {/* Details Modal */}
      <StockTransferDetailsModal
        isOpen={isDetailsModalOpen}
        transfer={selectedTransfer}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedTransfer(null)
        }}
        onPost={handlePostTransfer}
        onCancel={handleCancelTransfer}
      />
    </div>
  )
}
