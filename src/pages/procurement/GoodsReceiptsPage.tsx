import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  PackageCheck,
  Download,
  RotateCcw,
  Check,
  Plus,
  Send,
  Ban,
  Building2,
  Warehouse as WarehouseIcon,
  Eye,
  History,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { CreateGoodsReceiptModal } from './CreateGoodsReceiptModal'
import { GoodsReceiptDetailsModal } from './GoodsReceiptDetailsModal'
import { procurementService } from '../../services/procurementService'
import type { PageResponse } from '../../types/masterData'
import type {
  GoodsReceipt,
  GoodsReceiptSummary,
  GoodsReceiptStatus,
  StockMovement,
} from '../../types/procurement'

export interface GoodsReceiptsPageProps {
  showHeader?: boolean
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
}

export function GoodsReceiptsPage({
  showHeader = true,
  isModalOpen,
  setIsModalOpen,
}: GoodsReceiptsPageProps) {
  // Modal states
  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isCreateOpen = isModalOpen !== undefined ? isModalOpen : internalModalOpen
  const setCreateOpen = setIsModalOpen || setInternalModalOpen

  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null)
  const [downloadingGrnId, setDownloadingGrnId] = useState<number | null>(null)

  // Active view tab: 'receipts' | 'movements'
  const [subTab, setSubTab] = useState<'receipts' | 'movements'>('receipts')

  // Receipts data
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [summary, setSummary] = useState<GoodsReceiptSummary | null>(null)
  const [pageData, setPageData] = useState<PageResponse<GoodsReceipt> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stock movements data
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [isLoadingMovements, setIsLoadingMovements] = useState(false)
  const [movementSearch, setMovementSearch] = useState('')

  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter dropdown on outside click
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
    loadMovements()
  }, [loadSummary, loadMovements])

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
      alert(err instanceof Error ? err.message : 'Failed to post goods receipt')
    }
  }

  const handleCancelReceipt = async (receiptId: number) => {
    if (!window.confirm('Are you sure you want to cancel this goods receipt?')) return
    try {
      await procurementService.cancelGoodsReceipt(receiptId)
      loadSummary()
      loadReceipts(currentPage)
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        setSelectedReceipt(null)
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel goods receipt')
    }
  }

  const handleDownloadPdf = async (receiptId: number, grnNumber: string) => {
    try {
      setDownloadingGrnId(receiptId)
      await procurementService.downloadGoodsReceiptPdf(receiptId, grnNumber)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download goods receipt note')
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
    link.setAttribute('download', `goods_receipts_export_${new Date().toISOString().split('T')[0]}.csv`)
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

  return (
    <div className="space-y-4">
      {/* 1. Header (rendered only if showHeader is true) */}
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3.5">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Goods Receipts (GRN)
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Receive ordered inventory against issued purchase orders, log delivery notes, and track stock receipts.
            </p>
          </div>

          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-ink text-ink-foreground hover:opacity-90 font-medium px-4 py-2 rounded-md text-sm cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create goods receipt</span>
          </Button>
        </div>
      )}

      {/* 2. Unified Metric Strip */}
      <div className="flex flex-wrap items-center gap-6 py-1">
        <div>
          <span className="text-xs text-muted-foreground font-medium">Total receipts</span>
          <p className="text-xl font-semibold text-foreground tracking-tight mt-0.5">
            {summary?.totalGrns ?? receipts.length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Draft receipts</span>
          <p className="text-xl font-semibold text-muted-foreground tracking-tight mt-0.5">
            {summary?.draftCount ?? receipts.filter((r) => r.status === 'DRAFT').length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Posted receipts</span>
          <p className="text-xl font-semibold text-success tracking-tight mt-0.5">
            {summary?.postedCount ?? receipts.filter((r) => r.status === 'POSTED').length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Items received</span>
          <p className="text-xl font-semibold text-foreground tracking-tight mt-0.5">
            {summary?.totalItemsReceived ?? receipts.reduce((acc, r) => acc + r.itemsCount, 0)}
          </p>
        </div>
      </div>

      <div className="pt-1">
        <UnderlineTabs
          items={[
            { id: 'receipts', label: 'Goods receipts' },
            {
              id: 'movements',
              label:
                movements.length > 0
                  ? `Stock movements (${movements.length})`
                  : 'Stock movements',
            },
          ]}
          value={subTab}
          onChange={(id) => {
            const next = id as 'receipts' | 'movements'
            setSubTab(next)
            if (next === 'movements') loadMovements()
          }}
        />
        {subTab === 'movements' && (
          <p className="mt-2 text-xs text-muted-foreground">
            Inbound inventory movement ledger against purchase orders
          </p>
        )}
      </div>

      {/* TAB 1: GOODS RECEIPTS */}
      {subTab === 'receipts' && (
        <div className="space-y-4">
          {/* Toolbar */}
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
                <span className="text-sm font-medium text-muted-foreground">All goods receipts</span>
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
                  placeholder="Search GRN, PO, supplier..."
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
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-md border border-border bg-card p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
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
                        { id: 'POSTED', label: 'Posted' },
                        { id: 'DRAFT', label: 'Draft' },
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
                onClick={handleExportCsv}
                disabled={receipts.length === 0}
                className="flex h-10 items-center gap-1.5 rounded-md border border-border/80 bg-secondary px-3.5 text-xs font-medium text-foreground hover:border-border hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Export as CSV"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Table Section */}
          <div className="w-full">
            {isLoading && receipts.length === 0 ? (
              <div className="py-20 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                <p className="mt-3 text-xs text-muted-foreground">Loading goods receipts...</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <p className="text-sm font-medium text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={() => loadReceipts(0)} className="mt-3">
                  Retry
                </Button>
              </div>
            ) : receipts.length === 0 ? (
              <div className="py-20 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
                  <PackageCheck className="h-6 w-6" />
                </div>
                <p className="text-base font-semibold text-foreground">No goods receipts found</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  {search || selectedStatusFilter !== 'all'
                    ? 'No goods receipts match your filter criteria. Try resetting filters.'
                    : 'Your organization has no goods receipts yet. Click "+ Create goods receipt" to record your first delivery against an issued PO.'}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4 gap-1.5">
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
                    <span>Create goods receipt</span>
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>GRN number</TH>
                    <TH>PO number</TH>
                    <TH>Supplier</TH>
                    <TH>Receiving warehouse</TH>
                    <TH>Receipt date</TH>
                    <TH>Delivery note</TH>
                    <TH>Items received</TH>
                    <TH className="text-center">Status</TH>
                    <TH className="text-right w-28" />
                  </tr>
                </THead>
                <TBody>
                    {receipts.map((grn) => (
                      <TR
                        key={grn.id}
                        onClick={() => setSelectedReceipt(grn)}
                        clickable
                        className="group"
                      >
                        <TD>
                          <span className="text-ref-link">
                            {grn.grnNumber}
                          </span>
                        </TD>

                        <TD className="text-ref text-foreground">
                          {grn.poNumber}
                        </TD>

                        <TD>
                          <div className="flex items-center gap-2.5">
                            <Building2 className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                            <div>
                              <p className="font-medium">{grn.supplierName}</p>
                              <p className="text-[11px] text-ref text-muted-foreground">{grn.supplierCode}</p>
                            </div>
                          </div>
                        </TD>

                        <TD>
                          <div className="flex items-center gap-2">
                            <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{grn.warehouseName}</span>
                          </div>
                        </TD>

                        <TD className="font-normal text-muted-foreground">
                          {grn.receiptDate}
                        </TD>

                        <TD className="text-ref text-muted-foreground font-normal">
                          {grn.deliveryNoteNumber || '—'}
                        </TD>

                        <TD className="font-normal text-muted-foreground">
                          {grn.itemsCount} {grn.itemsCount === 1 ? 'item' : 'items'}
                        </TD>

                        <TD className="text-center">
                          {grn.status === 'POSTED' && (
                            <Badge variant="success">Posted</Badge>
                          )}
                          {grn.status === 'DRAFT' && (
                            <Badge variant="neutral">Draft</Badge>
                          )}
                          {grn.status === 'CANCELLED' && (
                            <Badge variant="destructive">Cancelled</Badge>
                          )}
                        </TD>

                        <TD className="text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(grn)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                              title="View GRN Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(grn.id, grn.grnNumber)}
                              disabled={downloadingGrnId === grn.id}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                              title="Download GRN PDF Note"
                            >
                              {downloadingGrnId === grn.id ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent inline-block" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>

                            {grn.status === 'DRAFT' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handlePostReceipt(grn.id)}
                                  className="p-1.5 rounded-md text-success hover:text-success hover:bg-success/10 cursor-pointer transition-colors"
                                  title="Post Goods Receipt (Commit to Inventory)"
                                >
                                  <Send className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelReceipt(grn.id)}
                                  className="p-1.5 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                                  title="Cancel Draft"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            )}

            {/* Pagination Controls */}
            {receipts.length > 0 && pageData && (
              <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                <div>
                  Showing {receipts.length} of {totalCount} goods receipts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadReceipts(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="h-8 gap-1 text-xs cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </Button>
                  <span className="px-2 text-foreground font-medium">
                    Page {pageData.page + 1} of {pageData.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadReceipts(currentPage + 1)}
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
        </div>
      )}

      {/* TAB 2: STOCK MOVEMENTS (TRANSACTION HISTORY) */}
      {subTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Stock Movements Ledger</h2>
              <p className="text-xs text-muted-foreground">
                Inbound receipts logged across all warehouses from purchase order fulfillment
              </p>
            </div>

            <div className="relative w-64 sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search reference, item, PO..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>

          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            {isLoadingMovements ? (
              <div className="py-20 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                <p className="mt-3 text-xs text-muted-foreground">Loading stock movements ledger...</p>
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
                  <History className="h-6 w-6" />
                </div>
                <p className="text-base font-semibold text-foreground">No stock movements yet</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  When goods receipts are posted, inventory inbound transactions will automatically appear here.
                </p>
              </div>
            ) : (
              <Table className="border-0 rounded-none bg-transparent">
                <THead>
                  <tr>
                    <TH>Reference</TH>
                    <TH>Purchase order</TH>
                    <TH>Item</TH>
                    <TH>Warehouse</TH>
                    <TH>Movement</TH>
                    <TH>Date & time</TH>
                    <TH>Type</TH>
                  </tr>
                </THead>
                <TBody>
                    {filteredMovements.map((m) => (
                      <TR key={m.id} clickable>
                        <TD className="text-ref text-foreground">
                          {m.referenceNumber}
                        </TD>

                        <TD className="text-ref text-muted-foreground font-normal">
                          {m.poNumber}
                        </TD>

                        <TD>
                          <div>
                            <span className="font-medium">{m.itemName}</span>
                            <span className="ml-2 text-[11px] text-ref text-muted-foreground">
                              {m.itemCode}
                            </span>
                          </div>
                        </TD>

                        <TD>
                          <span className="text-ref text-foreground">{m.warehouseCode}</span>
                          <span className="ml-1 text-muted-foreground font-normal">({m.warehouseName})</span>
                        </TD>

                        <TD className="font-mono font-medium text-success">
                          +{m.quantity} {m.unitOfMeasure}
                        </TD>

                        <TD className="font-normal text-muted-foreground">
                          {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TD>

                        <TD>
                          <Badge variant="success" className="h-auto px-2 py-0.5 text-[11px] font-medium">
                            Inbound Receipt
                          </Badge>
                        </TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* Create Goods Receipt Modal */}
      <CreateGoodsReceiptModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          loadSummary()
          loadReceipts(0)
          if (subTab === 'movements') {
            loadMovements()
          }
        }}
      />

      {/* View Details Modal */}
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
