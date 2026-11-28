import { useEffect, useState, useCallback, useRef } from 'react'
import {
  PackageCheck,
  Download,
  RotateCcw,
  Plus,
  Send,
  Ban,
  Eye,
  MoreHorizontal,
  History,
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
import { CreateGoodsReceiptModal } from './CreateGoodsReceiptModal'
import { GoodsReceiptDetailsModal } from './GoodsReceiptDetailsModal'
import { procurementService } from '../../services/procurementService'
import { confirmAction, toast } from '../../lib/feedback'
import { formatQuantity, formatShortDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { PageResponse } from '../../types/masterData'
import type {
  GoodsReceipt,
  GoodsReceiptSummary,
  GoodsReceiptStatus,
  StockMovement,
} from '../../types/procurement'

const GRN_STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'POSTED', label: 'Posted' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

const GRN_STATUS_BADGE: Record<GoodsReceiptStatus, { variant: BadgeVariant; label: string }> = {
  POSTED: { variant: 'success', label: 'Posted' },
  DRAFT: { variant: 'neutral', label: 'Draft' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

export interface GoodsReceiptsPageProps {
  showHeader?: boolean
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
  preselectedPoId?: number
}

export function GoodsReceiptsPage({
  showHeader = true,
  isModalOpen,
  setIsModalOpen,
  preselectedPoId,
}: GoodsReceiptsPageProps) {
  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isCreateOpen = isModalOpen !== undefined ? isModalOpen : internalModalOpen
  const setCreateOpen = setIsModalOpen || setInternalModalOpen

  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null)
  const [downloadingGrnId, setDownloadingGrnId] = useState<number | null>(null)
  const [openMenuGrnId, setOpenMenuGrnId] = useState<number | null>(null)

  const [subTab, setSubTab] = useState<'receipts' | 'movements'>('receipts')

  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [summary, setSummary] = useState<GoodsReceiptSummary | null>(null)
  const [pageData, setPageData] = useState<PageResponse<GoodsReceipt> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [isLoadingMovements, setIsLoadingMovements] = useState(false)
  const [movementSearch, setMovementSearch] = useState('')

  const menuContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setOpenMenuGrnId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadSummary = useCallback(() => {
    procurementService
      .getGoodsReceiptSummary()
      .then(setSummary)
      .catch((err) => console.error('Failed to load GRN summary', err))
  }, [])

  const loadReceipts = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)

      const status: GoodsReceiptStatus | undefined =
        selectedStatusFilter === 'all' ? undefined : (selectedStatusFilter as GoodsReceiptStatus)

      procurementService
        .getGoodsReceipts({
          search: search.trim() || undefined,
          status,
          page,
          size: pageSize,
        })
        .then((res) => {
          setReceipts(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load goods receipts.')
          setIsLoading(false)
        })
    },
    [search, selectedStatusFilter, pageSize]
  )

  const loadMovements = useCallback(() => {
    setIsLoadingMovements(true)
    procurementService
      .getStockMovements()
      .then((data) => {
        setMovements(data.content)
        setIsLoadingMovements(false)
      })
      .catch((err) => {
        console.error('Failed to load stock movements', err)
        setIsLoadingMovements(false)
      })
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReceipts(0)
    }, 250)
    return () => clearTimeout(timer)
  }, [loadReceipts])

  const handlePostReceipt = async (receiptId: number) => {
    try {
      await procurementService.postGoodsReceipt(receiptId)
      loadSummary()
      loadReceipts(currentPage)
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        setSelectedReceipt(null)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post goods receipt')
    }
  }

  const handleCancelReceipt = async (receiptId: number) => {
    const ok = await confirmAction({
      title: 'Cancel goods receipt?',
      description: 'This draft goods receipt will be marked as cancelled.',
      confirmLabel: 'Cancel GRN',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await procurementService.cancelGoodsReceipt(receiptId)
      loadSummary()
      loadReceipts(currentPage)
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        setSelectedReceipt(null)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel goods receipt')
    }
  }

  const handleDownloadPdf = async (receiptId: number, grnNumber: string) => {
    try {
      setDownloadingGrnId(receiptId)
      await procurementService.downloadGoodsReceiptPdf(receiptId, grnNumber)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download goods receipt note')
    } finally {
      setDownloadingGrnId(null)
    }
  }

  const handleExportCsv = () => {
    if (receipts.length === 0) return
    const headers = [
      'GRN Number',
      'PO Number',
      'Supplier',
      'Receiving Warehouse',
      'Receipt Date',
      'Delivery Note',
      'Items Count',
      'Status',
    ]
    const rows = receipts.map((r) => [
      `"${r.grnNumber.replace(/"/g, '""')}"`,
      `"${r.poNumber.replace(/"/g, '""')}"`,
      `"${r.supplierName.replace(/"/g, '""')}"`,
      `"${r.warehouseName.replace(/"/g, '""')}"`,
      r.receiptDate,
      `"${(r.deliveryNoteNumber || '').replace(/"/g, '""')}"`,
      r.itemsCount,
      r.status,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `goods_receipts_export_${new Date().toISOString().split('T')[0]}.csv`
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

  const filteredMovements = movements.filter((m) => {
    if (!movementSearch.trim()) return true
    const q = movementSearch.toLowerCase()
    return (
      m.referenceNumber.toLowerCase().includes(q) ||
      m.poNumber.toLowerCase().includes(q) ||
      m.itemName.toLowerCase().includes(q) ||
      m.itemCode.toLowerCase().includes(q) ||
      m.warehouseName.toLowerCase().includes(q)
    )
  })

  const totalCount = pageData?.totalElements ?? receipts.length

  const viewSwitcher = (
    <div
      className="inline-flex items-center rounded-md border border-border bg-secondary/70 p-0.5"
      role="tablist"
      aria-label="Goods receipt view"
    >
      <button
        type="button"
        role="tab"
        aria-selected={subTab === 'receipts'}
        onClick={() => setSubTab('receipts')}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
          subTab === 'receipts'
            ? 'bg-card text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Receipts
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={subTab === 'movements'}
        onClick={() => {
          setSubTab('movements')
          loadMovements()
        }}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
          subTab === 'movements'
            ? 'bg-card text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Stock movements
      </button>
    </div>
  )

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Goods receipts (GRN)
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Receive ordered inventory against issued purchase orders and track inbound stock.
            </p>
          </div>

          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Create goods receipt
          </Button>
        </div>
      )}

      <KpiCardGrid columns={3}>
        <KpiCard
          label="Total receipts"
          value={summary?.totalGrns ?? receipts.length}
        />
        <KpiCard
          label="Posted"
          value={
            summary?.postedCount ??
            receipts.filter((r) => r.status === 'POSTED').length
          }
        />
        <KpiCard
          label="Items received"
          value={
            summary?.totalItemsReceived ??
            receipts.reduce((acc, r) => acc + r.itemsCount, 0)
          }
        />
      </KpiCardGrid>

      {/* VIEW 1: GOODS RECEIPTS */}
      {subTab === 'receipts' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search GRN, PO, supplier..."
              />

              <div
                className="inline-flex flex-wrap items-center gap-1"
                role="group"
                aria-label="Filter by status"
              >
                {GRN_STATUS_FILTERS.map((opt) => {
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

            <div className="flex items-center gap-2 self-start lg:self-auto">
              {viewSwitcher}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={receipts.length === 0}
                title="Export as CSV"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                Export
              </Button>
            </div>
          </div>

          <div className="w-full" ref={menuContainerRef}>
            {isLoading && receipts.length === 0 ? (
              <div className="py-20 text-center rounded-md border border-border bg-card">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                <p className="mt-3 text-xs text-muted-foreground">Loading goods receipts...</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center rounded-md border border-border bg-card">
                <p className="text-sm font-medium text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={() => loadReceipts(0)} className="mt-3">
                  Retry
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-border/80 bg-card overflow-visible">
                <Table className="border-0 rounded-none overflow-visible" tableClassName="table-fixed">
                  <THead>
                    <tr>
                      <TH className="w-[11%]">GRN number</TH>
                      <TH className="w-[10%]">PO number</TH>
                      <TH className="w-[20%]">Supplier</TH>
                      <TH className="w-[14%]">Warehouse</TH>
                      <TH className="w-[10%]">Receipt date</TH>
                      <TH className="w-[10%]">Delivery note</TH>
                      <TH className="w-[5%] text-right">Items</TH>
                      <TH className="w-[9%] pl-5">Status</TH>
                      <TH className="w-[11%] px-3 text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {receipts.length === 0 ? (
                      <TR>
                        <TD colSpan={9} className="p-0">
                          <TableEmptyState
                            icon={<PackageCheck className="h-5 w-5" />}
                            title="No goods receipts found"
                            description={
                              hasActiveFilters
                                ? 'No goods receipts match your current search or status filter.'
                                : 'Record your first delivery against an issued PO using "+ Create goods receipt" above.'
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
                      receipts.map((grn) => {
                        const badge = GRN_STATUS_BADGE[grn.status] ?? {
                          variant: 'neutral',
                          label: grn.status,
                        }

                        return (
                          <TR
                            key={grn.id}
                            onClick={() => {
                              setOpenMenuGrnId(null)
                              setSelectedReceipt(grn)
                            }}
                            clickable
                            className="group"
                          >
                            <TD>
                              <span className="text-ref-link">{grn.grnNumber}</span>
                            </TD>

                            <TD className="text-ref text-foreground font-normal">
                              {grn.poNumber}
                            </TD>

                            <TD>
                              <p className="font-medium text-foreground truncate">
                                {grn.supplierName}
                              </p>
                              <p className="text-ref text-muted-foreground">
                                {grn.supplierCode}
                              </p>
                            </TD>

                            <TD className="truncate">{grn.warehouseName}</TD>

                            <TD className="tabular-nums text-muted-foreground font-normal">
                              {formatShortDate(grn.receiptDate)}
                            </TD>

                            <TD className="text-ref font-normal truncate">
                              {grn.deliveryNoteNumber || '—'}
                            </TD>

                            <TD className="text-right tabular-nums font-normal">
                              {grn.itemsCount}
                            </TD>

                            <TD className="pl-5">
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            </TD>

                            <TD className="px-3 text-right whitespace-nowrap">
                              <div
                                className="relative inline-flex items-center justify-end gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {grn.status === 'DRAFT' && (
                                  <button
                                    type="button"
                                    onClick={() => handlePostReceipt(grn.id)}
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                    title="Post goods receipt to inventory"
                                  >
                                    <Send className="h-3 w-3 text-muted-foreground" />
                                    Post
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenMenuGrnId((prev) =>
                                      prev === grn.id ? null : grn.id
                                    )
                                  }
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                                  aria-label="More receipt actions"
                                  aria-expanded={openMenuGrnId === grn.id}
                                >
                                  {downloadingGrnId === grn.id ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </button>

                                {openMenuGrnId === grn.id && (
                                  <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-md border border-border bg-card py-1 shadow-panel text-left">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuGrnId(null)
                                        setSelectedReceipt(grn)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                      View details
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuGrnId(null)
                                        handleDownloadPdf(grn.id, grn.grnNumber)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
                                    >
                                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                      Download PDF
                                    </button>
                                    {grn.status === 'DRAFT' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuGrnId(null)
                                          handleCancelReceipt(grn.id)
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                                      >
                                        <Ban className="h-3.5 w-3.5" />
                                        Cancel draft
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
                    count={receipts.length}
                    itemLabel="goods receipts"
                    onPageChange={loadReceipts}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: STOCK MOVEMENTS */}
      {subTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={movementSearch}
              onChange={setMovementSearch}
              placeholder="Search reference, item, PO..."
            />
            {viewSwitcher}
          </div>

          {isLoadingMovements ? (
            <div className="py-20 text-center rounded-md border border-border bg-card">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              <p className="mt-3 text-xs text-muted-foreground">
                Loading stock movements...
              </p>
            </div>
          ) : (
            <Table tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="w-[14%]">Reference</TH>
                  <TH className="w-[12%]">Purchase order</TH>
                  <TH className="w-[26%]">Item</TH>
                  <TH className="w-[18%]">Warehouse</TH>
                  <TH className="w-[11%] text-right">Movement</TH>
                  <TH className="w-[11%]">Date</TH>
                  <TH className="w-[8%]">Type</TH>
                </tr>
              </THead>
              <TBody>
                {filteredMovements.length === 0 ? (
                  <TR>
                    <TD colSpan={7} className="p-0">
                      <TableEmptyState
                        icon={<History className="h-5 w-5" />}
                        title="No stock movements yet"
                        description="When goods receipts are posted, inbound inventory transactions will appear here."
                      />
                    </TD>
                  </TR>
                ) : (
                  filteredMovements.map((m) => (
                    <TR key={m.id}>
                      <TD className="text-ref text-foreground">{m.referenceNumber}</TD>
                      <TD className="text-ref font-normal">{m.poNumber}</TD>
                      <TD>
                        <p className="font-medium text-foreground truncate">{m.itemName}</p>
                        <p className="text-ref text-muted-foreground">{m.itemCode}</p>
                      </TD>
                      <TD className="truncate">
                        <span className="text-ref text-foreground">{m.warehouseCode}</span>
                        <span className="ml-1.5 text-muted-foreground font-normal">
                          {m.warehouseName}
                        </span>
                      </TD>
                      <TD className="text-right tabular-nums font-medium text-success">
                        +{formatQuantity(m.quantity)} {m.unitOfMeasure}
                      </TD>
                      <TD className="tabular-nums text-muted-foreground font-normal">
                        {formatShortDate(m.createdAt)}
                      </TD>
                      <TD>
                        <Badge variant="success">Inbound receipt</Badge>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          )}
        </div>
      )}

      {/* Create Goods Receipt Modal */}
      <CreateGoodsReceiptModal
        isOpen={isCreateOpen}
        preselectedPoId={preselectedPoId}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          loadSummary()
          loadReceipts(0)
          if (subTab === 'movements') {
            loadMovements()
          }
        }}
      />

      {/* View Details Drawer */}
      <GoodsReceiptDetailsModal
        isOpen={!!selectedReceipt}
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onPost={handlePostReceipt}
        onCancel={handleCancelReceipt}
        onDownloadPdf={handleDownloadPdf}
      />
    </div>
  )
}
