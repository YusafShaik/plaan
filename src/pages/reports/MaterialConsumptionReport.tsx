import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, RefLink, RefCode } from '../../components/ui/Table'
import { ProductionOrderDetailsModal } from '../manufacturing/ProductionOrderDetailsModal'
import { cn } from '../../lib/cn'
import { masterDataService } from '../../services/masterDataService'
import { manufacturingService } from '../../services/manufacturingService'
import { reportsService } from '../../services/reportsService'
import type { Item, Warehouse } from '../../types/masterData'
import type { ProductionOrder } from '../../types/manufacturing'
import type {
  MaterialConsumptionGroup,
  MaterialConsumptionReport as MaterialConsumptionReportData,
  ProductionSummaryStatusFilter,
} from '../../types/reports'

export interface MaterialConsumptionReportProps {
  onBack: () => void
}

type StatusFilter = '' | ProductionSummaryStatusFilter
type UnreconciledFilter = '' | 'true'

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

function statusLabel(status: ProductionSummaryStatusFilter) {
  if (status === 'IN_PROGRESS') return 'In Progress'
  if (status === 'RELEASED') return 'Released'
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'CLOSED') return 'Closed'
  return status
}

function statusBadge(status: ProductionSummaryStatusFilter) {
  if (status === 'COMPLETED' || status === 'CLOSED') {
    return <Badge variant="success">{statusLabel(status)}</Badge>
  }
  if (status === 'IN_PROGRESS') return <Badge variant="warning">In Progress</Badge>
  return <Badge variant="neutral">{statusLabel(status)}</Badge>
}

export function MaterialConsumptionReport({ onBack }: MaterialConsumptionReportProps) {
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso)
  const [toDate, setToDate] = useState(todayIso)
  const [productionOrderId, setProductionOrderId] = useState<number | ''>('')
  const [productId, setProductId] = useState<number | ''>('')
  const [materialId, setMaterialId] = useState<number | ''>('')
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number | ''>('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [unreconciledOnly, setUnreconciledOnly] = useState<UnreconciledFilter>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [report, setReport] = useState<MaterialConsumptionReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      manufacturingService.getProductionOrders({ size: 200 }),
      masterDataService.getItems({ size: 200 }),
      masterDataService.getWarehouses({ size: 200 }),
    ])
      .then(([orderPage, itemPage, warehousePage]) => {
        setProductionOrders(orderPage.content)
        setItems(itemPage.content)
        setWarehouses(warehousePage.content)
      })
      .catch(() => {
        setProductionOrders([])
        setItems([])
        setWarehouses([])
      })
  }, [])

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getMaterialConsumption({
        fromDate,
        toDate,
        productionOrderId: productionOrderId === '' ? undefined : productionOrderId,
        productId: productId === '' ? undefined : productId,
        materialId: materialId === '' ? undefined : materialId,
        sourceWarehouseId: sourceWarehouseId === '' ? undefined : sourceWarehouseId,
        status: status || undefined,
        unreconciledOnly: unreconciledOnly === 'true' ? true : undefined,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load material consumption.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
  }, [
    fromDate,
    toDate,
    productionOrderId,
    productId,
    materialId,
    sourceWarehouseId,
    status,
    unreconciledOnly,
    page,
    pageSize,
  ])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const openOrder = async (group: MaterialConsumptionGroup) => {
    try {
      const order = await manufacturingService.getProductionOrderById(group.productionOrderId)
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
      await reportsService.exportMaterialConsumptionCsv({
        fromDate,
        toDate,
        productionOrderId: productionOrderId === '' ? undefined : productionOrderId,
        productId: productId === '' ? undefined : productId,
        materialId: materialId === '' ? undefined : materialId,
        sourceWarehouseId: sourceWarehouseId === '' ? undefined : sourceWarehouseId,
        status: status || undefined,
        unreconciledOnly: unreconciledOnly === 'true' ? true : undefined,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <ReportPageLayout
        categoryLabel="Manufacturing"
        title="Material Consumption"
        description="Track required, issued, consumed and returned materials across production orders."
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
              label="Production Order"
              value={productionOrderId === '' ? '' : productionOrderId}
              onChange={(v) => {
                setProductionOrderId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Production Orders' },
                ...productionOrders.map((o) => ({
                  value: o.id,
                  label: `${o.orderNumber} — ${o.productName}`,
                })),
              ]}
            />
            <Select
              label="Finished Product"
              value={productId === '' ? '' : productId}
              onChange={(v) => {
                setProductId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Products' },
                ...items.map((item) => ({
                  value: item.id,
                  label: `${item.name} (${item.itemCode})`,
                })),
              ]}
            />
            <Select
              label="Material"
              value={materialId === '' ? '' : materialId}
              onChange={(v) => {
                setMaterialId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Materials' },
                ...items.map((item) => ({
                  value: item.id,
                  label: `${item.name} (${item.itemCode})`,
                })),
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
            <Select
              label="Unreconciled Materials Only"
              value={unreconciledOnly}
              onChange={(v) => {
                setUnreconciledOnly(v as UnreconciledFilter)
                setPage(0)
              }}
              options={[
                { value: '', label: 'No' },
                { value: 'true', label: 'Yes' },
              ]}
            />
          </div>
        }
        summary={
          report ? (
            <ReportSummaryCards
              items={[
                { label: 'Production Orders', value: report.summary.productionOrders },
                { label: 'Unique Materials', value: report.summary.uniqueMaterials },
                { label: 'Unreconciled Lines', value: report.summary.unreconciledLines },
              ]}
            />
          ) : null
        }
        footer={
          report && report.orders.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.orders.content.length} of {report.orders.totalElements} production
                orders
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

        {isLoading && !report ? (
          <div className="rounded-md border border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground shadow-xs">
            Loading material consumption...
          </div>
        ) : !report || report.orders.content.length === 0 ? (
          <div className="rounded-md border border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground shadow-xs">
            No material consumption records match the selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            {report.orders.content.map((group) => (
              <section
                key={group.productionOrderId}
                className="overflow-hidden rounded-md border border-border bg-card shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 px-4 py-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => void openOrder(group)}
                      className="text-left cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <RefLink>{group.orderNumber}</RefLink>
                        <span className="text-sm font-medium text-foreground">
                          — {group.productName}
                        </span>
                      </div>
                    </button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Planned production: {formatQty(group.plannedQuantity)}{' '}
                      {group.productUnitOfMeasure} · {statusLabel(group.status)}
                    </p>
                  </div>
                  {statusBadge(group.status)}
                </div>

                <Table className="border-0 rounded-none shadow-none bg-transparent">
                  <THead>
                    <tr>
                      <TH>Material</TH>
                      <TH className="text-right">Required</TH>
                      <TH className="text-right">Issued</TH>
                      <TH className="text-right">Consumed</TH>
                      <TH className="text-right">Returned</TH>
                      <TH className="text-right">Remaining</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {group.lines.map((line) => (
                      <TR
                        key={line.productionOrderItemId}
                        clickable
                        onClick={() => void openOrder(group)}
                      >
                        <TD>
                          <div className="text-sm font-medium text-foreground">
                            {line.materialName}
                          </div>
                          <RefCode className="text-[11px] text-muted-foreground">
                            {line.materialCode}
                          </RefCode>
                        </TD>
                        <TD className="text-right font-mono text-xs tabular-nums">
                          {formatQty(line.requiredQuantity)}
                        </TD>
                        <TD className="text-right font-mono text-xs tabular-nums">
                          {formatQty(line.issuedQuantity)}
                        </TD>
                        <TD className="text-right font-mono text-xs tabular-nums">
                          {formatQty(line.consumedQuantity)}
                        </TD>
                        <TD className="text-right font-mono text-xs tabular-nums">
                          {formatQty(line.returnedQuantity)}
                        </TD>
                        <TD
                          className={cn(
                            'text-right font-mono text-xs tabular-nums font-medium',
                            line.unreconciled ? 'text-warning' : 'text-foreground'
                          )}
                        >
                          {formatQty(line.remainingQuantity)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </section>
            ))}
          </div>
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
