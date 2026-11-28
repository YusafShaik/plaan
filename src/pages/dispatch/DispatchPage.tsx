import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Truck,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { SearchInput } from '../../components/ui/Input'
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
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { dispatchService } from '../../services/dispatchService'
import { CreateDispatchModal } from './CreateDispatchModal'
import { DispatchDetailsModal } from './DispatchDetailsModal'
import { confirmAction, toast } from '../../lib/feedback'
import { formatQuantity, formatShortDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { DispatchOrder, DispatchOrderStatus } from '../../types/dispatch'

const STATUS_FILTERS: { value: DispatchOrderStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'POSTED', label: 'Posted' },
]

export function DispatchPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DispatchOrderStatus | ''>('')
  const [page, setPage] = useState(0)
  const pageSize = 10

  const [dispatches, setDispatches] = useState<DispatchOrder[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchOrder | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [editingDispatch, setEditingDispatch] = useState<DispatchOrder | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 200)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (openMenuId === null) return
    const handleOutside = () => setOpenMenuId(null)
    window.addEventListener('click', handleOutside)
    return () => window.removeEventListener('click', handleOutside)
  }, [openMenuId])

  const fetchDispatches = useCallback(async () => {
    setError(null)
    try {
      const res = await dispatchService.getDispatchOrders({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
        page,
        size: pageSize,
        sortBy: 'createdAt',
        direction: 'desc',
      })
      setDispatches(res.content)
      setTotalElements(res.totalElements)
      setTotalPages(res.totalPages)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dispatch orders.')
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, statusFilter, page, pageSize])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDispatches()
    })
  }, [fetchDispatches])

  const handleRowClick = (d: DispatchOrder) => {
    setOpenMenuId(null)
    setSelectedDispatch(d)
    setIsDetailsModalOpen(true)
  }

  const handleEditDispatch = (d: DispatchOrder) => {
    setOpenMenuId(null)
    setEditingDispatch(d)
    setIsCreateModalOpen(true)
  }

  const handlePostDispatch = async (d: DispatchOrder) => {
    setOpenMenuId(null)
    setProcessingId(d.id)
    try {
      await dispatchService.postDispatchOrder(d.id)
      toast.success(`Dispatch ${d.dispatchNumber} posted`)
      fetchDispatches()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post dispatch.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteDispatch = async (d: DispatchOrder) => {
    setOpenMenuId(null)
    const ok = await confirmAction({
      title: `Delete draft dispatch ${d.dispatchNumber}?`,
      description: 'This draft dispatch order will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    setProcessingId(d.id)
    try {
      await dispatchService.deleteDispatchOrder(d.id)
      toast.success(`Draft dispatch ${d.dispatchNumber} deleted`)
      fetchDispatches()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete draft dispatch.')
    } finally {
      setProcessingId(null)
    }
  }

  const hasFilters = Boolean(search || statusFilter)

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('')
    setPage(0)
  }

  return (
    <ContentCanvas className="space-y-6 pt-2">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Dispatch
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Outbound shipments against sales orders.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingDispatch(null)
            setIsCreateModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          New dispatch
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search dispatch orders..."
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((pill) => {
            const active = statusFilter === pill.value
            return (
              <button
                key={pill.label}
                type="button"
                onClick={() => {
                  setStatusFilter(pill.value)
                  setPage(0)
                }}
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

      <div className="rounded-md border border-border/80 bg-card overflow-visible">
        <Table className="border-0 rounded-none overflow-visible" tableClassName="table-fixed">
          <THead>
            <tr>
              <TH className="w-[15%]">Dispatch no.</TH>
              <TH className="w-[14%]">Sales order</TH>
              <TH className="w-[25%]">Customer</TH>
              <TH className="w-[13%]">Dispatch date</TH>
              <TH className="w-[9%] text-right">Qty</TH>
              <TH className="w-[12%] pl-6">Status</TH>
              <TH className="w-[12%] px-3 text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && dispatches.length === 0 ? (
              <TR>
                <TD colSpan={7} className="py-16 text-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-foreground" />
                  Loading dispatch orders...
                </TD>
              </TR>
            ) : dispatches.length === 0 ? (
              <TR>
                <TD colSpan={7} className="p-0">
                  <TableEmptyState
                    icon={<Truck className="h-5 w-5" />}
                    title="No dispatch orders found"
                    description={
                      hasFilters
                        ? 'No dispatch orders match your current search or status filter.'
                        : 'Create a dispatch against a confirmed sales order using "+ New dispatch" above.'
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
              dispatches.map((d) => {
                const isBusy = processingId === d.id
                const carrierHint = d.vehicleNumber || d.transporterName

                return (
                  <TR key={d.id} onClick={() => handleRowClick(d)} clickable>
                    <TD>
                      <span className="text-ref-link">{d.dispatchNumber}</span>
                      {carrierHint && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {carrierHint}
                        </p>
                      )}
                    </TD>

                    <TD>
                      <span className="text-ref text-foreground">{d.salesOrderNumber}</span>
                    </TD>

                    <TD>
                      <p className="font-medium text-foreground truncate">{d.customerName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {d.customerCode} · {d.dispatchWarehouseName}
                      </p>
                    </TD>

                    <TD className="text-muted-foreground tabular-nums">
                      {formatShortDate(d.dispatchDate)}
                    </TD>

                    <TD className="text-right tabular-nums font-medium">
                      {formatQuantity(d.totalQuantityDispatched)}
                    </TD>

                    <TD className="pl-6">
                      {d.status === 'POSTED' ? (
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
                        {d.status === 'DRAFT' ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handlePostDispatch(d)}
                          >
                            {isBusy ? '...' : 'Post'}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRowClick(d)}
                          >
                            View
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === d.id ? null : d.id)}
                          aria-label="Dispatch actions"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openMenuId === d.id && (
                          <div className="absolute right-0 top-9 z-40 w-44 rounded-md border border-border bg-card shadow-md py-1 text-left">
                            <button
                              type="button"
                              onClick={() => handleRowClick(d)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              View details
                            </button>

                            {d.status === 'DRAFT' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditDispatch(d)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  Edit draft
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handlePostDispatch(d)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  Post dispatch
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteDispatch(d)}
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

        <TablePagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          count={dispatches.length}
          itemLabel="dispatches"
          onPageChange={setPage}
        />
      </div>

      <CreateDispatchModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingDispatch(null)
        }}
        onSuccess={() => {
          fetchDispatches()
        }}
        editingDispatch={editingDispatch}
      />

      <DispatchDetailsModal
        isOpen={isDetailsModalOpen}
        dispatch={selectedDispatch}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedDispatch(null)
        }}
        onEdit={(d) => {
          setIsDetailsModalOpen(false)
          handleEditDispatch(d)
        }}
        onDispatchUpdated={() => {
          fetchDispatches()
        }}
      />
    </ContentCanvas>
  )
}
