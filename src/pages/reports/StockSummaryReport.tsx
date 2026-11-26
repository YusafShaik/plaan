import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { masterDataService } from '../../services/masterDataService'
import { reportsService } from '../../services/reportsService'
import type { ItemType, Warehouse } from '../../types/masterData'
import type { StockOverviewItem } from '../../types/inventory'
import type {
  StockSummaryFilterParams,
  StockSummaryReport as StockSummaryReportData,
  StockSummaryStatusFilter,
} from '../../types/reports'

export interface StockSummaryReportProps {
  onBack: () => void
}

type StatusFilter = '' | StockSummaryStatusFilter

function formatQty(value: number) {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 3 })
}

function qtyClass(value: number, tone: 'pending' | 'rejected' | 'available') {
  if (value <= 0) {
    return tone === 'available' ? 'text-destructive' : 'text-muted-foreground'
  }
  if (tone === 'pending') return 'text-warning'
  if (tone === 'rejected') return 'text-destructive'
  return 'text-success'
}

export function StockSummaryReport({ onBack }: StockSummaryReportProps) {
  const [search, setSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [itemTypeId, setItemTypeId] = useState<number | ''>('')
  const [stockStatus, setStockStatus] = useState<StatusFilter>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [itemTypes, setItemTypes] = useState<ItemType[]>([])
  const [report, setReport] = useState<StockSummaryReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      masterDataService.getWarehouses({ size: 200 }),
      masterDataService.getItemTypes(),
    ])
      .then(([warehousePage, types]) => {
        setWarehouses(warehousePage.content)
        setItemTypes(types)
      })
      .catch(() => {
        setWarehouses([])
        setItemTypes([])
      })
  }, [])

  const filterParams: StockSummaryFilterParams = {
    search: search.trim() || undefined,
    warehouseId: warehouseId === '' ? undefined : warehouseId,
    itemTypeId: itemTypeId === '' ? undefined : itemTypeId,
    stockStatus: stockStatus || undefined,
  }

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getStockSummary({
        ...filterParams,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load stock summary.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, warehouseId, itemTypeId, stockStatus, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  const openLedger = (row: StockOverviewItem) => {
    sessionStorage.setItem(
      'plaan_inventory_focus',
      JSON.stringify({
        tab: 'ledger',
        itemId: row.itemId,
        warehouseId: row.warehouseId,
      })
    )
    window.dispatchEvent(
      new CustomEvent('plaan_navigate', {
        detail: { tab: 'inventory' },
      })
    )
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportStockSummaryCsv(filterParams)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ReportPageLayout
      categoryLabel="Inventory"
      title="Stock Summary"
      description="Current stock position across warehouses"
      onBack={onBack}
      onExport={() => void handleExport()}
      exportDisabled={isExporting || isLoading || !report || report.rows.totalElements === 0}
      filters={
        <div className="space-y-3">
          <div className="relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Search item code or name..."
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Warehouse"
              value={warehouseId === '' ? '' : warehouseId}
              onChange={(v) => {
                setWarehouseId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Warehouses' },
                ...warehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
            <Select
              label="Item Type"
              value={itemTypeId === '' ? '' : itemTypeId}
              onChange={(v) => {
                setItemTypeId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Types' },
                ...itemTypes.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
            <Select
              label="Stock Status"
              value={stockStatus}
              onChange={(v) => {
                setStockStatus(v as StatusFilter)
                setPage(0)
              }}
              options={[
                { value: '', label: 'All' },
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'NO_AVAILABLE_STOCK', label: 'No Available Stock' },
                { value: 'QUALITY_HOLD', label: 'Quality Hold' },
              ]}
            />
          </div>
        </div>
      }
      summary={
        report ? (
          <ReportSummaryCards
            items={[
              { label: 'Items in Stock', value: report.summary.itemsInStock },
              {
                label: 'Items with No Available Stock',
                value: report.summary.itemsWithNoAvailableStock,
              },
              { label: 'Items Pending QC', value: report.summary.itemsPendingQc },
              { label: 'Items with Rejections', value: report.summary.itemsWithRejections },
            ]}
          />
        ) : null
      }
      footer={
        report && report.rows.totalElements > 0 ? (
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <div>
              Showing {report.rows.content.length} of {report.rows.totalElements} stock records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>
              <span>
                Page {page + 1} of {Math.max(1, report.rows.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= report.rows.totalPages || isLoading}
                className="h-8 gap-1 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null
      }
    >
      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <Table className="border-0 rounded-none shadow-none bg-transparent">
          <THead>
            <tr>
              <TH>Item</TH>
              <TH>Type</TH>
              <TH>Warehouse</TH>
              <TH>UOM</TH>
              <TH>On Hand</TH>
              <TH>Pending QC</TH>
              <TH>Rejected</TH>
              <TH>Available</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && !report ? (
              <TR>
                <TD colSpan={8} className="py-14 text-center text-muted-foreground">
                  Loading stock summary...
                </TD>
              </TR>
            ) : !report || report.rows.content.length === 0 ? (
              <TR>
                <TD colSpan={8} className="py-14 text-center text-muted-foreground">
                  No stock records match the selected filters.
                </TD>
              </TR>
            ) : (
              report.rows.content.map((row) => (
                <TR
                  key={`${row.itemId}-${row.warehouseId}`}
                  className="cursor-pointer"
                  onClick={() => openLedger(row)}
                >
                  <TD>
                    <div className="text-sm font-medium text-foreground">{row.itemName}</div>
                    <RefLink className="text-[11px]">{row.itemCode}</RefLink>
                  </TD>
                  <TD className="text-xs text-muted-foreground">{row.itemTypeName || '—'}</TD>
                  <TD className="text-sm text-foreground">{row.warehouseName}</TD>
                  <TD className="text-xs text-muted-foreground">{row.unitOfMeasure}</TD>
                  <TD className="font-mono text-xs tabular-nums">
                    {formatQty(row.onHandQuantity)}
                  </TD>
                  <TD
                    className={cn(
                      'font-mono text-xs tabular-nums',
                      qtyClass(row.pendingInspectionQuantity, 'pending')
                    )}
                  >
                    {formatQty(row.pendingInspectionQuantity)}
                  </TD>
                  <TD
                    className={cn(
                      'font-mono text-xs tabular-nums',
                      qtyClass(row.rejectedQuantity, 'rejected')
                    )}
                  >
                    {formatQty(row.rejectedQuantity)}
                  </TD>
                  <TD
                    className={cn(
                      'font-mono text-xs tabular-nums font-medium',
                      qtyClass(row.availableQuantity, 'available')
                    )}
                  >
                    {formatQty(row.availableQuantity)}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </ReportPageLayout>
  )
}
