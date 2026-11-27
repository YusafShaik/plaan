import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Package,
  Download,
  RotateCcw,
  Check,
  Plus,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { inventoryService } from '../../services/inventoryService'
import { masterDataService } from '../../services/masterDataService'
import { EnterOpeningStockModal } from './EnterOpeningStockModal'
import type { PageResponse, Warehouse } from '../../types/masterData'
import type {
  StockOverviewItem,
  StockOverviewSummary,
} from '../../types/inventory'

export interface StockOverviewPageProps {
  showHeader?: boolean
}

export function StockOverviewPage({ showHeader = true }: StockOverviewPageProps = {}) {
  const [stockItems, setStockItems] = useState<StockOverviewItem[]>([])
  const [summary, setSummary] = useState<StockOverviewSummary | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [pageData, setPageData] = useState<PageResponse<StockOverviewItem> | null>(null)

  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isOpeningStockModalOpen, setIsOpeningStockModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Load warehouse list for filter dropdown (all warehouses, not restricted to active)
  useEffect(() => {
    masterDataService
      .getWarehouses({ size: 100 })
      .then((res) => setWarehouses(res.content))
      .catch((err) => console.error('Failed to load warehouses for filter', err))
  }, [])

  const loadSummary = useCallback(() => {
    inventoryService
      .getStockOverviewSummary()
      .then(setSummary)
      .catch((err) => console.error('Failed to load stock overview summary', err))
  }, [])

  const loadStock = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)

      inventoryService
        .getStockOverview({
          search: search.trim() || undefined,
          warehouseId: selectedWarehouseId !== null ? selectedWarehouseId : undefined,
          page,
          size: pageSize,
        })
        .then((res) => {
          setStockItems(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load stock overview.')
          setIsLoading(false)
        })
    },
    [search, selectedWarehouseId, pageSize]
  )

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStock(0)
    }, 250)
    return () => clearTimeout(timer)
  }, [loadStock])

  // All warehouses combining master data list and any warehouse in stock records
  const allWarehouses = useMemo(() => {
    const map = new Map<number, { id: number; name: string; warehouseCode: string }>()
    warehouses.forEach((w) => {
      map.set(w.id, { id: w.id, name: w.name, warehouseCode: w.warehouseCode })
    })
    stockItems.forEach((s) => {
      if (!map.has(s.warehouseId)) {
        map.set(s.warehouseId, { id: s.warehouseId, name: s.warehouseName, warehouseCode: s.warehouseCode })
      }
    })
    return Array.from(map.values())
  }, [warehouses, stockItems])

  const selectedWarehouse = allWarehouses.find((w) => w.id === selectedWarehouseId)

  const handleExportCsv = () => {
    if (stockItems.length === 0) return
    const headers = [
      'Item Code',
      'Item Name',
      'Warehouse Code',
      'Warehouse Name',
      'On Hand',
      'Pending Inspection',
      'Rejected',
      'Available',
      'UOM',
    ]
    const rows = stockItems.map((item) => [
      `"${item.itemCode.replace(/"/g, '""')}"`,
      `"${item.itemName.replace(/"/g, '""')}"`,
      `"${item.warehouseCode.replace(/"/g, '""')}"`,
      `"${item.warehouseName.replace(/"/g, '""')}"`,
      item.onHandQuantity,
      item.pendingInspectionQuantity ?? 0,
      item.rejectedQuantity ?? 0,
      item.availableQuantity ?? item.onHandQuantity,
      `"${item.unitOfMeasure.replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `stock_overview_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const hasActiveFilters = selectedWarehouseId !== null || search.trim() !== ''

  const clearAllFilters = () => {
    setSelectedWarehouseId(null)
    setSearch('')
  }

  const totalCount = pageData?.totalElements ?? stockItems.length

  const formatQuantity = (qty: number) => {
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
  }

  return (
    <div className="space-y-6">
      {/* 1. Header with Tab Navigation (Rendered if showHeader is true) */}
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3.5">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Inventory
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor stock across your warehouses.
            </p>
          </div>
        </div>
      )}

      <KpiCardGrid columns={3}>
        <KpiCard label="Items in stock" value={summary?.itemsInStock ?? 0} />
        <KpiCard
          label="Warehouses with stock"
          value={summary?.warehousesWithStock ?? 0}
        />
        <KpiCard
          label="Stock balance records"
          value={summary?.totalStockRecords ?? stockItems.length}
        />
      </KpiCardGrid>

      {/* 3. Toolbar: Search, Warehouse filter, Export CSV */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedWarehouse && (
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3.5 py-1.5 text-sm text-foreground animate-in fade-in-50 duration-150">
              <span className="text-muted-foreground text-xs font-normal">Warehouse:</span>
              <span className="font-medium text-xs">{selectedWarehouse.name}</span>
              <button
                type="button"
                onClick={() => setSelectedWarehouseId(null)}
                className="ml-1 rounded-md p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Remove warehouse filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
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
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Search bar */}
          <div className="relative w-64 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by item name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-sm font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Warehouse Filter Popover */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors cursor-pointer ${
                selectedWarehouseId !== null || isFilterOpen
                  ? 'border-foreground bg-secondary text-foreground'
                  : 'border-border/80 bg-secondary text-muted-foreground hover:text-foreground hover:border-border'
              }`}
              title="Filter by warehouse"
            >
              <Filter className="h-4 w-4" />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-border bg-card p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-2 py-1.5 border-b border-border/60 mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Filter by Warehouse</span>
                  {selectedWarehouseId !== null && (
                    <button
                      type="button"
                      onClick={() => setSelectedWarehouseId(null)}
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWarehouseId(null)
                      setIsFilterOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      selectedWarehouseId === null
                        ? 'bg-secondary text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    }`}
                  >
                    <span>All warehouses</span>
                    {selectedWarehouseId === null && (
                      <Check className="h-3.5 w-3.5 text-foreground stroke-[2.5]" />
                    )}
                  </button>

                  {allWarehouses.map((wh) => {
                    const isSelected = selectedWarehouseId === wh.id
                    return (
                      <button
                        key={wh.id}
                        type="button"
                        onClick={() => {
                          setSelectedWarehouseId(wh.id)
                          setIsFilterOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-secondary text-foreground font-semibold'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-medium text-foreground">{wh.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{wh.warehouseCode}</p>
                        </div>
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
            disabled={stockItems.length === 0}
            className="flex h-10 items-center gap-1.5 rounded-md border border-border/80 bg-secondary px-3.5 text-xs font-medium text-foreground hover:border-border hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Export stock overview as CSV"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Opening Stock button */}
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsOpeningStockModalOpen(true)}
            title="Initialize materials before ERP setup"
          >
            <Plus className="h-4 w-4" />
            Opening stock
          </Button>
        </div>
      </div>

      {/* 4. Stock Overview Table Section */}
      <div className="w-full">
        {isLoading && stockItems.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Calculating stock overview...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadStock(0)} className="mt-3">
              Retry
            </Button>
          </div>
        ) : stockItems.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <Package className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No stock records found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {search || selectedWarehouseId !== null
                ? 'No stock matches your search or filter criteria. Try resetting filters.'
                : 'No inventory currently recorded in stock. Inbound items from posted Goods Receipts (GRN) will automatically appear here.'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4 gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset filters</span>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Item code</TH>
                <TH>Item name</TH>
                <TH>Warehouse</TH>
                <TH className="text-right">On hand</TH>
                <TH className="text-right">Pending</TH>
                <TH className="text-right">Rejected</TH>
                <TH className="text-right">Available</TH>
                <TH>UOM</TH>
              </tr>
            </THead>
            <TBody>
                {stockItems.map((row) => {
                  const pending = row.pendingInspectionQuantity ?? 0
                  const rejected = row.rejectedQuantity ?? 0
                  const available = row.availableQuantity ?? row.onHandQuantity
                  return (
                  <TR
                    key={`${row.itemId}-${row.warehouseId}`}
                    className="group"
                  >
                    <TD className="text-ref text-foreground">
                      {row.itemCode}
                    </TD>

                    <TD className="font-medium">
                      {row.itemName}
                    </TD>

                    <TD>
                      <p className="font-medium text-foreground">{row.warehouseName}</p>
                      <p className="text-xs text-ref text-muted-foreground">{row.warehouseCode}</p>
                    </TD>

                    <TD className="text-right tabular-nums font-medium">
                      {formatQuantity(row.onHandQuantity)}
                    </TD>

                    <TD className="text-right tabular-nums font-normal">
                      {formatQuantity(pending)}
                    </TD>

                    <TD className="text-right tabular-nums font-normal">
                      {formatQuantity(rejected)}
                    </TD>

                    <TD className="text-right tabular-nums font-medium">
                      {formatQuantity(available)}
                    </TD>

                    <TD className="font-normal">
                      {row.unitOfMeasure}
                    </TD>
                  </TR>
                  )
                })}
            </TBody>
          </Table>
        )}

        {/* Pagination Controls */}
        {stockItems.length > 0 && pageData && (
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <div>
              Showing {stockItems.length} of {totalCount} stock records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadStock(currentPage - 1)}
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
                onClick={() => loadStock(currentPage + 1)}
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

      {/* Enter Opening Stock Modal */}
      <EnterOpeningStockModal
        isOpen={isOpeningStockModalOpen}
        onClose={() => setIsOpeningStockModalOpen(false)}
        onSuccess={() => {
          loadStock(currentPage)
          loadSummary()
        }}
      />
    </div>
  )
}
