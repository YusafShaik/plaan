import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { inventoryService } from '../../services/inventoryService'
import { CreateStockAdjustmentModal } from './CreateStockAdjustmentModal'
import { StockAdjustmentDetailsModal } from './StockAdjustmentDetailsModal'
import type { StockAdjustment, StockAdjustmentStatus } from '../../types/inventory'
import type { PageResponse } from '../../types/masterData'

export function StockAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [pageData, setPageData] = useState<PageResponse<StockAdjustment> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StockAdjustmentStatus | ''>('')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState<StockAdjustment | null>(null)
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const loadAdjustments = useCallback(
    (page = 0) => {
      inventoryService
        .getStockAdjustments({
          search: search.trim() || undefined,
          status: statusFilter ? statusFilter : undefined,
          page,
          size: pageSize,
          sortBy: 'createdAt',
          direction: 'desc',
        })
        .then((res) => {
          setError(null)
          setAdjustments(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : 'Failed to load stock adjustments.'
          )
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    loadAdjustments(0)
  }, [loadAdjustments])

  const handlePostAdjustment = async (id: number) => {
    try {
      await inventoryService.postStockAdjustment(id)
      loadAdjustments(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedAdjustment(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to post adjustment')
    }
  }

  const handleCancelAdjustment = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this draft stock adjustment?')) return
    try {
      await inventoryService.cancelStockAdjustment(id)
      loadAdjustments(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedAdjustment(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel adjustment')
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Toolbar matching Stock Transfer: Search, Status filter, + New Adjustment button */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-64 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search adjustments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Status Filter */}
          <NativeSelect
            dense
            className="w-auto min-w-[9.5rem]"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as StockAdjustmentStatus | '')
            }
          >
            <option value="">All Statuses</option>
            <option value="POSTED">Posted</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
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

        {/* Right side: + New Adjustment button matching Stock Transfer standard */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={() => {
              setEditingDraft(null)
              setIsCreateModalOpen(true)
            }}
            className="flex h-10 items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Adjustment</span>
          </Button>
        </div>
      </div>

      {/* 2. Stock Adjustments Table matching Stock Transfer standard */}
      <div className="w-full">
        {isLoading && adjustments.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading stock adjustments...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true)
                loadAdjustments(0)
              }}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        ) : adjustments.length === 0 ? (
          <div className="py-16 text-center rounded-md border border-border/80 bg-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No stock adjustments found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Stock Adjustment allows the storekeeper to reconcile physical inventory with system quantities while keeping full audit history.
            </p>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Adjustment</span>
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Warehouse</TH>
                  <TH>Reason</TH>
                  <TH className="text-center">Items</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {adjustments.map((a) => (
                  <TR
                    key={a.id}
                    clickable
                    onClick={() => {
                      if (a.status === 'DRAFT') {
                        setEditingDraft(a)
                        setIsCreateModalOpen(true)
                      } else {
                        setSelectedAdjustment(a)
                        setIsDetailsModalOpen(true)
                      }
                    }}
                  >
                    <TD>
                      <span className="text-ref-link">{a.adjustmentNumber}</span>
                    </TD>

                    <TD>
                      <p className="font-medium">{a.warehouseName}</p>
                      <p className="text-xs text-ref text-muted-foreground">
                        {a.warehouseCode}
                      </p>
                    </TD>

                    <TD className="font-medium">
                      {a.reason}
                    </TD>

                    <TD className="text-center tabular-nums">
                      <span className="font-medium">{a.totalItems}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({a.totalDifference > 0 ? `+${a.totalDifference}` : a.totalDifference})
                      </span>
                    </TD>

                    <TD>
                      {a.status === 'POSTED' && (
                        <Badge variant="success">Posted</Badge>
                      )}
                      {a.status === 'DRAFT' && (
                        <Badge variant="warning">Draft</Badge>
                      )}
                      {a.status === 'CANCELLED' && (
                        <Badge variant="destructive">Cancelled</Badge>
                      )}
                    </TD>

                    <TD
                      className="text-right space-x-1.5 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {a.status === 'DRAFT' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingDraft(a)
                              setIsCreateModalOpen(true)
                            }}
                            className="h-8 px-2.5 text-xs cursor-pointer"
                          >
                            Edit / Post
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleCancelAdjustment(a.id)}
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
                            setSelectedAdjustment(a)
                            setIsDetailsModalOpen(true)
                          }}
                          className="h-8 px-2.5 text-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            {/* Pagination footer */}
            {pageData && pageData.totalPages > 1 && (
              <div className="flex items-center justify-between border border-t-0 border-border/80 rounded-b-md bg-card px-4 py-3 text-xs text-muted-foreground">
                <span>
                  Showing {adjustments.length} of {pageData.totalElements} adjustments
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsLoading(true)
                      loadAdjustments(currentPage - 1)
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
                      loadAdjustments(currentPage + 1)
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
          </>
        )}
      </div>

      {/* Create / Edit Adjustment Popup Modal */}
      <CreateStockAdjustmentModal
        isOpen={isCreateModalOpen}
        initialDraft={editingDraft}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingDraft(null)
        }}
        onSuccess={() => {
          loadAdjustments(currentPage)
        }}
      />

      {/* Details Modal */}
      <StockAdjustmentDetailsModal
        isOpen={isDetailsModalOpen}
        adjustment={selectedAdjustment}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedAdjustment(null)
        }}
        onPost={handlePostAdjustment}
        onCancel={handleCancelAdjustment}
      />
    </div>
  )
}
