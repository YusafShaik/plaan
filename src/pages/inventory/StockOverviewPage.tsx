import { useEffect, useState, useCallback, useMemo } from 'react'
import { Package, Download, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
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
import { masterDataService } from '../../services/masterDataService'
import { formatQuantity } from '../../lib/format'
import { cn } from '../../lib/cn'
import { EnterOpeningStockModal } from './EnterOpeningStockModal'
import type { PageResponse, Warehouse } from '../../types/masterData'
import type {
  StockOverviewItem,
  StockOverviewSummary,
} from '../../types/inventory'

export interface StockOverviewPageProps {
  showHeader?: boolean
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
  onInspectLedger?: (itemId: number, warehouseId: number) => void
}

export function StockOverviewPage({
  showHeader = true,
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
  onInspectLedger,
}: StockOverviewPageProps = {}) {
  const [stockItems, setStockItems] = useState<StockOverviewItem[]>([])
  const [summary, setSummary] = useState<StockOverviewSummary | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [pageData, setPageData] = useState<PageResponse<StockOverviewItem> | null>(null)

  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)

  const [internalOpeningStockModalOpen, setInternalOpeningStockModalOpen] = useState(false)
  const isOpeningStockModalOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalOpeningStockModalOpen
  const setIsOpeningStockModalOpen =
    setControlledModalOpen || setInternalOpeningStockModalOpen
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const allWarehouses = useMemo(() => {
    const map = new Map<number, { id: number; name: string; warehouseCode: string }>()
    warehouses.forEach((w) => {
      map.set(w.id, { id: w.id, name: w.name, warehouseCode: w.warehouseCode })
    })
    stockItems.forEach((s) => {
      if (!map.has(s.warehouseId)) {
        map.set(s.warehouseId, {
          id: s.warehouseId,
          name: s.warehouseName,
          warehouseCode: s.warehouseCode,
        })
      }
    })
    return Array.from(map.values())
  }, [warehouses, stockItems])

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
    link.setAttribute(
      'download',
      `stock_overview_export_${new Date().toISOString().split('T')[0]}.csv`
    )
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

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-4">
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by item name or code..."
          />

          <NativeSelect
            dense
            className="w-auto min-w-[11rem]"
            value={selectedWarehouseId !== null ? String(selectedWarehouseId) : ''}
            onChange={(e) =>
              setSelectedWarehouseId(e.target.value ? Number(e.target.value) : null)
            }
            aria-label="Filter by warehouse"
          >
            <option value="">All warehouses</option>
            {allWarehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.warehouseCode})
              </option>
            ))}
          </NativeSelect>

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

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={stockItems.length === 0}
          className="self-start lg:self-auto"
          title="Export stock overview as CSV"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          Export
        </Button>
      </div>

      <div className="w-full">
        {isLoading && stockItems.length === 0 ? (
          <div className="py-20 text-center rounded-md border border-border bg-card">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Calculating stock overview...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center rounded-md border border-border bg-card">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadStock(0)} className="mt-3">
              Retry
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            <Table className="border-0 rounded-none" tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="w-[13%]">Item code</TH>
                  <TH className="w-[23%]">Item name</TH>
                  <TH className="w-[18%]">Warehouse</TH>
                  <TH className="w-[10%] text-right">On hand</TH>
                  <TH className="w-[10%] text-right">Pending</TH>
                  <TH className="w-[10%] text-right">Rejected</TH>
                  <TH className="w-[9%] text-right">Available</TH>
                  <TH className="w-[7%] pl-5">UOM</TH>
                </tr>
              </THead>
              <TBody>
                {stockItems.length === 0 ? (
                  <TR>
                    <TD colSpan={8} className="p-0">
                      <TableEmptyState
                        icon={<Package className="h-5 w-5" />}
                        title="No stock records found"
                        description={
                          hasActiveFilters
                            ? 'No stock matches your search or filter criteria.'
                            : 'Inbound items from posted goods receipts or opening stock will appear here.'
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
                  stockItems.map((row) => {
                    const pending = row.pendingInspectionQuantity ?? 0
                    const rejected = row.rejectedQuantity ?? 0
                    const available = row.availableQuantity ?? row.onHandQuantity
                    return (
                      <TR
                        key={`${row.itemId}-${row.warehouseId}`}
                        clickable={!!onInspectLedger}
                        onClick={
                          onInspectLedger
                            ? () => onInspectLedger(row.itemId, row.warehouseId)
                            : undefined
                        }
                        className="group"
                      >
                        <TD>
                          <span
                            className={cn(
                              onInspectLedger ? 'text-ref-link' : 'text-ref text-foreground'
                            )}
                          >
                            {row.itemCode}
                          </span>
                        </TD>

                        <TD className="font-medium truncate">{row.itemName}</TD>

                        <TD>
                          <p className="font-medium text-foreground truncate">
                            {row.warehouseName}
                          </p>
                          <p className="text-ref text-muted-foreground">
                            {row.warehouseCode}
                          </p>
                        </TD>

                        <TD className="text-right tabular-nums font-medium">
                          {formatQuantity(row.onHandQuantity)}
                        </TD>

                        <TD className="text-right tabular-nums font-normal text-muted-foreground">
                          {formatQuantity(pending)}
                        </TD>

                        <TD className="text-right tabular-nums font-normal text-muted-foreground">
                          {formatQuantity(rejected)}
                        </TD>

                        <TD className="text-right tabular-nums font-medium">
                          {formatQuantity(available)}
                        </TD>

                        <TD className="pl-5 font-normal text-muted-foreground uppercase text-xs">
                          {row.unitOfMeasure}
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
                count={stockItems.length}
                itemLabel="stock records"
                onPageChange={loadStock}
              />
            )}
          </div>
        )}
      </div>

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
