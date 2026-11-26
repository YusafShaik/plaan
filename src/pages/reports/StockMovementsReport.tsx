import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, RefCode, RefLink } from '../../components/ui/Table'
import { GoodsReceiptDetailsModal } from '../procurement/GoodsReceiptDetailsModal'
import { OpeningStockDetailsModal } from '../inventory/OpeningStockDetailsModal'
import { StockTransferDetailsModal } from '../inventory/StockTransferDetailsModal'
import { StockAdjustmentDetailsModal } from '../inventory/StockAdjustmentDetailsModal'
import { DispatchDetailsModal } from '../dispatch/DispatchDetailsModal'
import { masterDataService } from '../../services/masterDataService'
import { inventoryService } from '../../services/inventoryService'
import { procurementService } from '../../services/procurementService'
import { dispatchService } from '../../services/dispatchService'
import { reportsService } from '../../services/reportsService'
import type { Item, Warehouse } from '../../types/masterData'
import type {
  OpeningStock,
  StockAdjustment,
  StockTransfer,
} from '../../types/inventory'
import type { GoodsReceipt } from '../../types/procurement'
import type { DispatchOrder } from '../../types/dispatch'
import type {
  StockMovementTypeFilter,
  StockMovementsReport as StockMovementsReportData,
  StockMovementsRow,
} from '../../types/reports'

export interface StockMovementsReportProps {
  onBack: () => void
}

type MovementTypeFilter = '' | StockMovementTypeFilter

function firstDayOfMonthIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatQty(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  if (value % 1 === 0) {
    return value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  }
  return value.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
}

function formatQtyWithUom(value: number, uom?: string | null) {
  const qty = formatQty(value)
  return uom ? `${qty} ${uom}` : qty
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const MOVEMENT_TYPE_OPTIONS: Array<{ value: MovementTypeFilter; label: string }> = [
  { value: '', label: 'All Types' },
  { value: 'OPENING_STOCK', label: 'Opening Stock' },
  { value: 'GOODS_RECEIPT', label: 'Goods Receipt' },
  { value: 'TRANSFER_IN', label: 'Stock Transfer In' },
  { value: 'TRANSFER_OUT', label: 'Stock Transfer Out' },
  { value: 'ADJUSTMENT', label: 'Stock Adjustment' },
  { value: 'MATERIAL_ISSUE', label: 'Material Issue' },
  { value: 'MATERIAL_RETURN', label: 'Material Return' },
  { value: 'PRODUCTION_RECEIPT', label: 'Production Receipt' },
  { value: 'SALES_DISPATCH', label: 'Sales Dispatch' },
]

export function StockMovementsReport({ onBack }: StockMovementsReportProps) {
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso)
  const [toDate, setToDate] = useState(todayIso)
  const [itemId, setItemId] = useState<number | ''>('')
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [movementType, setMovementType] = useState<MovementTypeFilter>('')
  const [reference, setReference] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(50)

  const [items, setItems] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [report, setReport] = useState<StockMovementsReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedGrn, setSelectedGrn] = useState<GoodsReceipt | null>(null)
  const [isGrnOpen, setIsGrnOpen] = useState(false)
  const [selectedOpeningStock, setSelectedOpeningStock] = useState<OpeningStock | null>(null)
  const [isOpeningStockOpen, setIsOpeningStockOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchOrder | null>(null)
  const [isDispatchOpen, setIsDispatchOpen] = useState(false)
  const [loadingRefKey, setLoadingRefKey] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      masterDataService.getItems({ size: 200 }),
      masterDataService.getWarehouses({ size: 200 }),
    ])
      .then(([itemPage, warehousePage]) => {
        setItems(itemPage.content)
        setWarehouses(warehousePage.content)
      })
      .catch(() => {
        setItems([])
        setWarehouses([])
      })
  }, [])

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getStockMovements({
        fromDate,
        toDate,
        itemId: itemId === '' ? undefined : itemId,
        warehouseId: warehouseId === '' ? undefined : warehouseId,
        movementType: movementType || undefined,
        reference: reference.trim() || undefined,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load stock movements.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
  }, [fromDate, toDate, itemId, warehouseId, movementType, reference, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const openReference = async (row: StockMovementsRow) => {
    const key =
      row.goodsReceiptId != null
        ? `grn-${row.goodsReceiptId}`
        : row.openingStockId != null
          ? `os-${row.openingStockId}`
          : row.stockTransferId != null
            ? `st-${row.stockTransferId}`
            : row.stockAdjustmentId != null
              ? `sa-${row.stockAdjustmentId}`
              : row.dispatchOrderId != null
                ? `do-${row.dispatchOrderId}`
                : null
    if (!key) return

    try {
      setLoadingRefKey(key)
      setError(null)
      if (row.goodsReceiptId != null) {
        const grn = await procurementService.getGoodsReceiptById(row.goodsReceiptId)
        setSelectedGrn(grn)
        setIsGrnOpen(true)
      } else if (row.openingStockId != null) {
        const stock = await inventoryService.getOpeningStockById(row.openingStockId)
        setSelectedOpeningStock(stock)
        setIsOpeningStockOpen(true)
      } else if (row.stockTransferId != null) {
        const transfer = await inventoryService.getStockTransferById(row.stockTransferId)
        setSelectedTransfer(transfer)
        setIsTransferOpen(true)
      } else if (row.stockAdjustmentId != null) {
        const adjustment = await inventoryService.getStockAdjustmentById(row.stockAdjustmentId)
        setSelectedAdjustment(adjustment)
        setIsAdjustmentOpen(true)
      } else if (row.dispatchOrderId != null) {
        const dispatch = await dispatchService.getDispatchOrderById(row.dispatchOrderId)
        setSelectedDispatch(dispatch)
        setIsDispatchOpen(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open transaction')
    } finally {
      setLoadingRefKey(null)
    }
  }

  const canOpenReference = (row: StockMovementsRow) =>
    !row.openingBalanceRow &&
    Boolean(
      row.goodsReceiptId ||
        row.openingStockId ||
        row.stockTransferId ||
        row.stockAdjustmentId ||
        row.dispatchOrderId
    )

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportStockMovementsCsv({
        fromDate,
        toDate,
        itemId: itemId === '' ? undefined : itemId,
        warehouseId: warehouseId === '' ? undefined : warehouseId,
        movementType: movementType || undefined,
        reference: reference.trim() || undefined,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  const summary = report?.summary
  const uom = summary?.unitOfMeasure
  const summaryCards =
    summary == null
      ? null
      : summary.focused
        ? (
            <ReportSummaryCards
              items={[
                {
                  label: 'Opening Balance',
                  value: formatQtyWithUom(summary.openingBalance, uom),
                },
                {
                  label: 'Total Incoming',
                  value: formatQtyWithUom(summary.totalIncoming, uom),
                },
                {
                  label: 'Total Outgoing',
                  value: formatQtyWithUom(summary.totalOutgoing, uom),
                },
                {
                  label: 'Closing Balance',
                  value: formatQtyWithUom(summary.closingBalance, uom),
                },
              ]}
            />
          )
        : (
            <ReportSummaryCards
              items={[
                { label: 'Movements', value: summary.movementCount },
                { label: 'Incoming Transactions', value: summary.incomingCount },
                { label: 'Outgoing Transactions', value: summary.outgoingCount },
              ]}
            />
          )

  return (
    <>
      <ReportPageLayout
        categoryLabel="Inventory"
        title="Stock Movements"
        description="Track incoming and outgoing inventory transactions."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting || isLoading || !report || report.summary.movementCount === 0
        }
        filters={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <DateField
              label="From Date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(0)
              }}
            />
            <DateField
              label="To Date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(0)
              }}
            />
            <Select
              label="Item"
              value={itemId === '' ? '' : itemId}
              onChange={(v) => {
                setItemId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Items' },
                ...items.map((item) => ({
                  value: item.id,
                  label: `${item.name} (${item.itemCode})`,
                })),
              ]}
            />
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
              label="Movement Type"
              value={movementType}
              onChange={(v) => {
                setMovementType(v as MovementTypeFilter)
                setPage(0)
              }}
              options={MOVEMENT_TYPE_OPTIONS}
            />
            <Input
              label="Reference Number"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value)
                setPage(0)
              }}
              placeholder="Search reference..."
            />
          </div>
        }
        summary={summaryCards}
        footer={
          report && report.movements.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.movements.content.length} of {report.movements.totalElements}{' '}
                rows
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
                  Page {page + 1} of {Math.max(1, report.movements.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= report.movements.totalPages || isLoading}
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
                <TH>Date / Reference</TH>
                <TH>Item</TH>
                <TH>Warehouse</TH>
                <TH>Movement</TH>
                <TH className="text-right">In</TH>
                <TH className="text-right">Out</TH>
                <TH className="text-right">Balance</TH>
                <TH>UOM</TH>
              </tr>
            </THead>
            <TBody>
              {isLoading && !report ? (
                <TR>
                  <TD colSpan={8} className="py-14 text-center text-muted-foreground">
                    Loading stock movements...
                  </TD>
                </TR>
              ) : !report || report.movements.content.length === 0 ? (
                <TR>
                  <TD colSpan={8} className="py-14 text-center text-muted-foreground">
                    No stock movements match the selected filters.
                  </TD>
                </TR>
              ) : (
                report.movements.content.map((row, index) => {
                  const openable = canOpenReference(row)
                  const refKey =
                    row.goodsReceiptId != null
                      ? `grn-${row.goodsReceiptId}`
                      : row.openingStockId != null
                        ? `os-${row.openingStockId}`
                        : row.stockTransferId != null
                          ? `st-${row.stockTransferId}`
                          : row.stockAdjustmentId != null
                            ? `sa-${row.stockAdjustmentId}`
                            : row.dispatchOrderId != null
                              ? `do-${row.dispatchOrderId}`
                              : null
                  const isRefLoading = refKey != null && loadingRefKey === refKey
                  const rowKey = row.openingBalanceRow
                    ? `opening-${row.itemId}-${row.warehouseId}`
                    : String(row.id ?? `${row.movementDate}-${index}`)

                  return (
                    <TR
                      key={rowKey}
                      clickable={openable}
                      onClick={openable ? () => void openReference(row) : undefined}
                    >
                      <TD className="whitespace-nowrap">
                        <div className="text-sm text-foreground">{formatDate(row.movementDate)}</div>
                        {row.openingBalanceRow ? (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        ) : openable ? (
                          <RefLink className="text-[11px] inline-flex items-center gap-1">
                            {row.referenceNumber || '—'}
                            {isRefLoading && (
                              <span className="h-3 w-3 animate-spin rounded-full border border-info border-t-transparent inline-block" />
                            )}
                          </RefLink>
                        ) : (
                          <RefCode className="text-[11px] text-muted-foreground">
                            {row.referenceNumber || '—'}
                          </RefCode>
                        )}
                      </TD>
                      <TD>
                        <div className="text-sm font-medium text-foreground">{row.itemName}</div>
                        <RefCode className="text-[11px] text-muted-foreground">{row.itemCode}</RefCode>
                      </TD>
                      <TD className="text-sm text-foreground">{row.warehouseName}</TD>
                      <TD className="text-sm text-foreground">{row.movementTypeLabel}</TD>
                      <TD className="text-right font-mono text-xs tabular-nums text-success">
                        {row.quantityIn != null ? formatQty(row.quantityIn) : '—'}
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums text-destructive">
                        {row.quantityOut != null ? formatQty(row.quantityOut) : '—'}
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums font-medium text-foreground">
                        {formatQty(row.runningBalance)}
                      </TD>
                      <TD className="text-xs text-muted-foreground">{row.unitOfMeasure}</TD>
                    </TR>
                  )
                })
              )}
            </TBody>
          </Table>
        </div>
      </ReportPageLayout>

      <GoodsReceiptDetailsModal
        isOpen={isGrnOpen}
        receipt={selectedGrn}
        onClose={() => {
          setIsGrnOpen(false)
          setSelectedGrn(null)
        }}
      />
      <OpeningStockDetailsModal
        isOpen={isOpeningStockOpen}
        openingStock={selectedOpeningStock}
        onClose={() => {
          setIsOpeningStockOpen(false)
          setSelectedOpeningStock(null)
        }}
      />
      <StockTransferDetailsModal
        isOpen={isTransferOpen}
        transfer={selectedTransfer}
        onClose={() => {
          setIsTransferOpen(false)
          setSelectedTransfer(null)
        }}
      />
      <StockAdjustmentDetailsModal
        isOpen={isAdjustmentOpen}
        adjustment={selectedAdjustment}
        onClose={() => {
          setIsAdjustmentOpen(false)
          setSelectedAdjustment(null)
        }}
      />
      <DispatchDetailsModal
        isOpen={isDispatchOpen}
        dispatch={selectedDispatch}
        onClose={() => {
          setIsDispatchOpen(false)
          setSelectedDispatch(null)
        }}
      />
    </>
  )
}
