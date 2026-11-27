import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, RefLink, RefCode } from '../../components/ui/Table'
import { ProductionOrderDetailsModal } from '../manufacturing/ProductionOrderDetailsModal'
import { masterDataService } from '../../services/masterDataService'
import { manufacturingService } from '../../services/manufacturingService'
import { reportsService } from '../../services/reportsService'
import type { Item, Warehouse } from '../../types/masterData'
import type { ProductionOrder } from '../../types/manufacturing'
import type {
  ProductionSummaryReport as ProductionSummaryReportData,
  ProductionSummaryRow,
  ProductionSummaryStatusFilter,
} from '../../types/reports'

export interface ProductionSummaryReportProps {
  onBack: () => void
}

type StatusFilter = '' | ProductionSummaryStatusFilter

function firstDayOfMonthIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatQty(value: number) {
  if (value % 1 === 0) {
    return value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  }
  return value.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
}

function formatPercent(value: number) {
  return `${value.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusBadge(status: ProductionSummaryStatusFilter) {
  if (status === 'COMPLETED' || status === 'CLOSED') {
    return (
      <Badge variant="success">{status === 'CLOSED' ? 'Closed' : 'Completed'}</Badge>
    )
  }
  if (status === 'IN_PROGRESS') return <Badge variant="warning">In Progress</Badge>
  if (status === 'RELEASED') return <Badge variant="neutral">Released</Badge>
  return <Badge variant="neutral">{status}</Badge>
}

export function ProductionSummaryReport({ onBack }: ProductionSummaryReportProps) {
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso)
  const [toDate, setToDate] = useState(todayIso)
  const [productId, setProductId] = useState<number | ''>('')
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number | ''>('')
  const [finishedGoodsWarehouseId, setFinishedGoodsWarehouseId] = useState<number | ''>('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [products, setProducts] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [report, setReport] = useState<ProductionSummaryReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      masterDataService.getItems({ size: 200 }),
      masterDataService.getWarehouses({ size: 200 }),
    ])
      .then(([itemPage, warehousePage]) => {
        setProducts(itemPage.content)
        setWarehouses(warehousePage.content)
      })
      .catch(() => {
        setProducts([])
        setWarehouses([])
      })
  }, [])

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getProductionSummary({
        fromDate,
        toDate,
        productId: productId === '' ? undefined : productId,
        sourceWarehouseId: sourceWarehouseId === '' ? undefined : sourceWarehouseId,
        finishedGoodsWarehouseId:
          finishedGoodsWarehouseId === '' ? undefined : finishedGoodsWarehouseId,
        status: status || undefined,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load production summary.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
  }, [
    fromDate,
    toDate,
    productId,
    sourceWarehouseId,
    finishedGoodsWarehouseId,
    status,
    page,
    pageSize,
  ])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const openOrder = async (row: ProductionSummaryRow) => {
    try {
      const order = await manufacturingService.getProductionOrderById(row.id)
      setSelectedOrder(order)
      setIsDetailsOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open production order')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportProductionSummaryCsv({
        fromDate,
        toDate,
        productId: productId === '' ? undefined : productId,
        sourceWarehouseId: sourceWarehouseId === '' ? undefined : sourceWarehouseId,
        finishedGoodsWarehouseId:
          finishedGoodsWarehouseId === '' ? undefined : finishedGoodsWarehouseId,
        status: status || undefined,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  const productOptions = useMemo(
    () =>
      products.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.itemCode})`,
      })),
    [products]
  )

  return (
    <>
      <ReportPageLayout
        categoryLabel="Manufacturing"
        title="Production Summary"
        description="Track planned versus produced quantities across production orders."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting || isLoading || !report || report.summary.productionOrders === 0
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
              label="Product"
              value={productId === '' ? '' : productId}
              onChange={(v) => {
                setProductId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Products' },
                ...productOptions,
              ]}
            />
            <Select
              label="Source Warehouse"
              value={sourceWarehouseId === '' ? '' : sourceWarehouseId}
              onChange={(v) => {
                setSourceWarehouseId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Warehouses' },
                ...warehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
            <Select
              label="Destination Warehouse"
              value={finishedGoodsWarehouseId === '' ? '' : finishedGoodsWarehouseId}
              onChange={(v) => {
                setFinishedGoodsWarehouseId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Warehouses' },
                ...warehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(v) => {
                setStatus(v as StatusFilter)
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'RELEASED', label: 'Released' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CLOSED', label: 'Closed' },
              ]}
            />
          </div>
        }
        summary={
          report ? (
            <ReportSummaryCards
              items={[
                { label: 'Production Orders', value: report.summary.productionOrders },
                { label: 'Released', value: report.summary.released },
                { label: 'In Progress', value: report.summary.inProgress },
                { label: 'Completed / Closed', value: report.summary.completedOrClosed },
              ]}
            />
          ) : null
        }
        footer={
          report && report.orders.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.orders.content.length} of {report.orders.totalElements} orders
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
                  Page {page + 1} of {Math.max(1, report.orders.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= report.orders.totalPages || isLoading}
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

        <section className="space-y-2">
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
            <Table className="border-0 rounded-none shadow-none bg-transparent">
              <THead>
                <tr>
                  <TH>Product / Order</TH>
                  <TH>Order Date</TH>
                  <TH className="text-right">Planned</TH>
                  <TH className="text-right">Produced</TH>
                  <TH className="text-right">Pending</TH>
                  <TH>UOM</TH>
                  <TH className="text-right">Completion</TH>
                  <TH>Planned End</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {isLoading && !report ? (
                  <TR>
                    <TD colSpan={9} className="py-14 text-center text-muted-foreground">
                      Loading production summary...
                    </TD>
                  </TR>
                ) : !report || report.orders.content.length === 0 ? (
                  <TR>
                    <TD colSpan={9} className="py-14 text-center text-muted-foreground">
                      No production orders match the selected filters.
                    </TD>
                  </TR>
                ) : (
                  report.orders.content.map((row) => (
                    <TR
                      key={row.id}
                      clickable
                      onClick={() => void openOrder(row)}
                    >
                      <TD>
                        <div className="text-sm font-medium text-foreground">{row.productName}</div>
                        <RefLink className="text-xs">{row.orderNumber}</RefLink>
                        <div>
                          <RefCode className="text-xs text-muted-foreground">
                            {row.productCode}
                          </RefCode>
                        </div>
                      </TD>
                      <TD className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(row.orderDate)}
                      </TD>
                      <TD className="text-right tabular-nums text-xs tabular-nums">
                        {formatQty(row.plannedQuantity)}
                      </TD>
                      <TD className="text-right tabular-nums text-xs tabular-nums">
                        {formatQty(row.producedQuantity)}
                      </TD>
                      <TD className="text-right tabular-nums text-xs tabular-nums">
                        {formatQty(row.pendingQuantity)}
                      </TD>
                      <TD className="text-xs text-muted-foreground">{row.unitOfMeasure}</TD>
                      <TD className="text-right tabular-nums text-xs tabular-nums">
                        {formatPercent(row.completionPercent)}
                      </TD>
                      <TD className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(row.plannedCompletionDate)}
                      </TD>
                      <TD>{statusBadge(row.status)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </section>

        {report && report.byProduct.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-foreground">
              Production progress by product
            </h2>
            <div className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-4">
              {report.byProduct.map((product) => {
                const pct =
                  product.plannedQuantity > 0
                    ? Math.min(
                        100,
                        Math.round((product.producedQuantity / product.plannedQuantity) * 100)
                      )
                    : 0
                return (
                  <div key={product.productId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {product.productName}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatQty(product.producedQuantity)} / {formatQty(product.plannedQuantity)}{' '}
                        {product.unitOfMeasure}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-md bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-md bg-success"
                        style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </ReportPageLayout>

      <ProductionOrderDetailsModal
        isOpen={isDetailsOpen}
        order={selectedOrder}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedOrder(null)
        }}
      />
    </>
  )
}
