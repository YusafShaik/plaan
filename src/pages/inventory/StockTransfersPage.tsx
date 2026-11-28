import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowRight, Eye, MoreHorizontal, PackageCheck, Pencil, Ban, RotateCcw } from 'lucide-react'
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
import { inventoryService } from '../../services/inventoryService'
import { confirmAction, toast } from '../../lib/feedback'
import { formatQuantity, formatShortDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import { CreateStockTransferModal } from './CreateStockTransferModal'
import { StockTransferDetailsModal } from './StockTransferDetailsModal'
import type { StockTransfer, StockTransferStatus } from '../../types/inventory'
import type { PageResponse } from '../../types/masterData'

const TRANSFER_STATUS_FILTERS: Array<{ id: StockTransferStatus | ''; label: string }> = [
  { id: '', label: 'All' },
  { id: 'POSTED', label: 'Posted' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_BADGE: Record<StockTransferStatus, { variant: BadgeVariant; label: string }> = {
  POSTED: { variant: 'success', label: 'Posted' },
  DRAFT: { variant: 'warning', label: 'Draft' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

export interface StockTransfersPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
}

export function StockTransfersPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
}: StockTransfersPageProps = {}) {
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [pageData, setPageData] = useState<PageResponse<StockTransfer> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StockTransferStatus | ''>('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isCreateModalOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsCreateModalOpen = setControlledModalOpen || setInternalModalOpen
  const [editingDraft, setEditingDraft] = useState<StockTransfer | null>(null)
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null)
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
    const timer = setTimeout(() => {
      loadTransfers(0)
    }, 0)
    return () => clearTimeout(timer)
  }, [loadTransfers])

  const handlePostTransfer = async (id: number) => {
    try {
      await inventoryService.postStockTransfer(id)
      loadTransfers(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedTransfer(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post transfer')
    }
  }

  const handleCancelTransfer = async (id: number) => {
    const ok = await confirmAction({
      title: 'Cancel draft stock transfer?',
      description: 'This draft stock transfer will be marked as cancelled.',
      confirmLabel: 'Cancel transfer',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await inventoryService.cancelStockTransfer(id)
      loadTransfers(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedTransfer(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel transfer')
    }
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
          placeholder="Search transfers..."
        />

        <div
          className="inline-flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Filter by status"
        >
          {TRANSFER_STATUS_FILTERS.map((opt) => {
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
        {isLoading && transfers.length === 0 ? (
          <div className="py-20 text-center rounded-md border border-border bg-card">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading stock transfers...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center rounded-md border border-border bg-card">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTransfers(0)}
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
                  <TH className="w-[14%]">Reference</TH>
                  <TH className="w-[20%]">From</TH>
                  <TH className="w-[20%]">To</TH>
                  <TH className="w-[12%]">Transfer date</TH>
                  <TH className="w-[10%] text-right">Items</TH>
                  <TH className="w-[11%] pl-6">Status</TH>
                  <TH className="w-[13%] px-3 text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {transfers.length === 0 ? (
                  <TR>
                    <TD colSpan={7} className="p-0">
                      <TableEmptyState
                        icon={<ArrowRight className="h-5 w-5" />}
                        title="No stock transfers found"
                        description={
                          hasActiveFilters
                            ? 'No stock transfers match your current search or status filter.'
                            : 'Move inventory between warehouses using "+ New transfer" above. Organization stock totals stay unchanged.'
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
                  transfers.map((t) => {
                    const badge = STATUS_BADGE[t.status] ?? {
                      variant: 'neutral',
                      label: t.status,
                    }

                    return (
                      <TR
                        key={t.id}
                        clickable
                        onClick={() => {
                          setOpenMenuId(null)
                          if (t.status === 'DRAFT') {
                            setEditingDraft(t)
                            setIsCreateModalOpen(true)
                          } else {
                            setSelectedTransfer(t)
                            setIsDetailsModalOpen(true)
                          }
                        }}
                      >
                        <TD>
                          <span className="text-ref-link">{t.transferNumber}</span>
                        </TD>

                        <TD>
                          <p className="font-medium truncate">{t.fromWarehouseName}</p>
                          <p className="text-ref text-muted-foreground">
                            {t.fromWarehouseCode}
                          </p>
                        </TD>

                        <TD>
                          <p className="font-medium truncate">{t.toWarehouseName}</p>
                          <p className="text-ref text-muted-foreground">
                            {t.toWarehouseCode}
                          </p>
                        </TD>

                        <TD className="tabular-nums text-muted-foreground font-normal whitespace-nowrap">
                          {formatShortDate(t.transferDate)}
                        </TD>

                        <TD className="text-right tabular-nums">
                          <span className="font-medium text-foreground">{t.totalItems}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({formatQuantity(t.totalQuantity)})
                          </span>
                        </TD>

                        <TD className="pl-6">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TD>

                        <TD className="px-3 text-right whitespace-nowrap">
                          <div
                            className="relative inline-flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => handlePostTransfer(t.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                title="Post transfer"
                              >
                                <PackageCheck className="h-3 w-3 text-muted-foreground" />
                                Post
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === t.id ? null : t.id))
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                              aria-label="More transfer actions"
                              aria-expanded={openMenuId === t.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {openMenuId === t.id && (
                              <div className="absolute right-0 top-full z-40 mt-1 w-40 rounded-md border border-border bg-card py-1 shadow-panel text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    setSelectedTransfer(t)
                                    setIsDetailsModalOpen(true)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                  View details
                                </button>
                                {t.status === 'DRAFT' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null)
                                        setEditingDraft(t)
                                        setIsCreateModalOpen(true)
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
                                        handleCancelTransfer(t.id)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                      Cancel draft
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
                count={transfers.length}
                itemLabel="transfers"
                onPageChange={loadTransfers}
              />
            )}
          </div>
        )}
      </div>

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
