import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { SalesOrderDetailsModal } from '../sales/SalesOrderDetailsModal'
import { masterDataService } from '../../services/masterDataService'
import { salesService } from '../../services/salesService'
import { reportsService } from '../../services/reportsService'
import { useAuth } from '../../hooks/useAuth'
import type { SalesOrder } from '../../types/sales'
import type {
  DeliveryScheduleStatus,
  PendingDispatchReport as PendingDispatchReportData,
  PendingDispatchRow,
  PendingDispatchStockFilter,
} from '../../types/reports'
import type { Customer, Item, Warehouse } from '../../types/masterData'

export interface PendingDispatchesReportProps {
  onBack: () => void
}

type DeliveryFilter = 'all' | DeliveryScheduleStatus
type StockFilter = '' | PendingDispatchStockFilter

function formatMoney(amount: number, currency: string) {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function formatQty(value: number) {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: 3,
  })
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function deliveryBadge(status: DeliveryScheduleStatus) {
  if (status === 'OVERDUE') return <Badge variant="destructive">Overdue</Badge>
  if (status === 'DUE_TODAY') return <Badge variant="warning">Due Today</Badge>
  if (status === 'UPCOMING') return <Badge variant="neutral">Upcoming</Badge>
  return <Badge variant="neutral">Not Scheduled</Badge>
}

export function PendingDispatchesReport({ onBack }: PendingDispatchesReportProps) {
  const { organization } = useAuth()
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [itemId, setItemId] = useState<number | ''>('')
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryFilter>('all')
  const [expectedFrom, setExpectedFrom] = useState('')
  const [expectedTo, setExpectedTo] = useState('')
  const [stockAvailability, setStockAvailability] = useState<StockFilter>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [report, setReport] = useState<PendingDispatchReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      masterDataService.getCustomers({ size: 200 }),
      masterDataService.getItems({ size: 200 }),
      masterDataService.getWarehouses({ size: 200 }),
    ])
      .then(([customerPage, itemPage, warehousePage]) => {
        setCustomers(customerPage.content)
        setItems(itemPage.content)
        setWarehouses(warehousePage.content)
      })
      .catch(() => {
        setCustomers([])
        setItems([])
        setWarehouses([])
      })
  }, [])

  const filterParams = {
    customerId: customerId === '' ? undefined : customerId,
    itemId: itemId === '' ? undefined : itemId,
    warehouseId: warehouseId === '' ? undefined : warehouseId,
    deliveryStatus: deliveryStatus === 'all' ? undefined : deliveryStatus,
    expectedFrom: expectedFrom || undefined,
    expectedTo: expectedTo || undefined,
    stockAvailability: stockAvailability || undefined,
  }

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getPendingDispatches({
        ...filterParams,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load pending dispatches.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filter fields listed individually
  }, [
    customerId,
    itemId,
    warehouseId,
    deliveryStatus,
    expectedFrom,
    expectedTo,
    stockAvailability,
    page,
    pageSize,
  ])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const currency = report?.currency || organization?.baseCurrency || 'INR'

  const openSo = async (row: PendingDispatchRow) => {
    try {
      const order = await salesService.getSalesOrderById(row.salesOrderId)
      setSelectedOrder(order)
      setIsDetailsOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open sales order')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportPendingDispatchesCsv(filterParams)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <ReportPageLayout
        categoryLabel="Sales & Dispatch"
        title="Pending Dispatches"
        description="Customer order lines still awaiting dispatch, with stock readiness and delivery urgency."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting || isLoading || !report || report.summary.pendingSalesOrders === 0
        }
        filters={
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Delivery Status
              </p>
              <UnderlineTabs
                items={[
                  { id: 'all', label: 'All' },
                  { id: 'OVERDUE', label: 'Overdue' },
                  { id: 'DUE_TODAY', label: 'Due Today' },
                  { id: 'UPCOMING', label: 'Upcoming' },
                  { id: 'NOT_SCHEDULED', label: 'Not Scheduled' },
                ]}
                value={deliveryStatus}
                onChange={(id) => {
                  setDeliveryStatus(id as DeliveryFilter)
                  setPage(0)
                }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Select
                label="Customer"
                value={customerId === '' ? '' : customerId}
                onChange={(v) => {
                  setCustomerId(v ? Number(v) : '')
                  setPage(0)
                }}
                options={[
                  { value: '', label: 'All Customers' },
                  ...customers.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <Select
                label="Product"
                value={itemId === '' ? '' : itemId}
                onChange={(v) => {
                  setItemId(v ? Number(v) : '')
                  setPage(0)
                }}
                options={[
                  { value: '', label: 'All Products' },
                  ...items.map((i) => ({
                    value: i.id,
                    label: `${i.itemCode} — ${i.name}`,
                  })),
                ]}
              />
              <Select
                label="Dispatch Warehouse"
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
                label="Stock Availability"
                value={stockAvailability}
                onChange={(v) => {
                  setStockAvailability(v as StockFilter)
                  setPage(0)
                }}
                options={[
                  { value: '', label: 'All' },
                  { value: 'READY', label: 'Ready to Dispatch' },
                  { value: 'SHORTAGE', label: 'Stock Shortage' },
                ]}
              />
              <DateField
                label="Expected From"
                value={expectedFrom}
                onChange={(e) => {
                  setExpectedFrom(e.target.value)
                  setPage(0)
                }}
              />
              <DateField
                label="Expected To"
                value={expectedTo}
                onChange={(e) => {
                  setExpectedTo(e.target.value)
                  setPage(0)
                }}
              />
            </div>
          </div>
        }
        summary={
          report ? (
            <ReportSummaryCards
              items={[
                { label: 'Pending Sales Orders', value: report.summary.pendingSalesOrders },
                { label: 'Overdue Orders', value: report.summary.overdueOrders },
                {
                  label: 'Pending Order Value',
                  value: formatMoney(report.summary.pendingOrderValue, currency),
                },
                {
                  label: 'Lines with Stock Shortage',
                  value: report.summary.linesWithStockShortage,
                },
              ]}
            />
          ) : null
        }
        footer={
          report && report.lines.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.lines.content.length} of {report.lines.totalElements} pending
                lines
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
                  Page {page + 1} of {Math.max(1, report.lines.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= report.lines.totalPages || isLoading}
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
                <TH>Order / Product</TH>
                <TH>Warehouse</TH>
                <TH>Ordered</TH>
                <TH>Dispatched</TH>
                <TH>Pending</TH>
                <TH>Available</TH>
                <TH>Shortage</TH>
                <TH>Pending Value</TH>
                <TH>Expected</TH>
                <TH>Days Overdue</TH>
              </tr>
            </THead>
            <TBody>
              {isLoading && !report ? (
                <TR>
                  <TD colSpan={10} className="py-14 text-center text-muted-foreground">
                    Loading pending dispatches...
                  </TD>
                </TR>
              ) : !report || report.lines.content.length === 0 ? (
                <TR>
                  <TD colSpan={10} className="py-14 text-center text-muted-foreground">
                    No pending dispatch lines match the selected filters.
                  </TD>
                </TR>
              ) : (
                report.lines.content.map((row) => (
                  <TR
                    key={row.salesOrderItemId}
                    className="cursor-pointer"
                    onClick={() => void openSo(row)}
                  >
                    <TD>
                      <div className="text-sm text-foreground">{row.itemName}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <RefLink>{row.orderNumber}</RefLink>
                        <span className="text-xs text-muted-foreground">
                          · {row.customerName}
                        </span>
                        {deliveryBadge(row.deliveryStatus)}
                      </div>
                      <div className="text-xs text-ref text-muted-foreground mt-0.5">
                        {row.itemCode}
                      </div>
                    </TD>
                    <TD className="text-xs text-muted-foreground">{row.warehouseName}</TD>
                    <TD className="tabular-nums text-xs tabular-nums">
                      {formatQty(row.orderedQuantity)} {row.unitOfMeasure}
                    </TD>
                    <TD className="tabular-nums text-xs tabular-nums">
                      {formatQty(row.dispatchedQuantity)} {row.unitOfMeasure}
                    </TD>
                    <TD className="tabular-nums text-xs tabular-nums font-medium text-foreground">
                      {formatQty(row.pendingQuantity)} {row.unitOfMeasure}
                    </TD>
                    <TD
                      className={`tabular-nums text-xs tabular-nums ${
                        row.availableStock >= row.pendingQuantity
                          ? 'text-success'
                          : 'text-destructive'
                      }`}
                    >
                      {formatQty(row.availableStock)}
                    </TD>
                    <TD
                      className={`tabular-nums text-xs tabular-nums ${
                        row.shortageQuantity > 0 ? 'text-warning' : 'text-muted-foreground'
                      }`}
                    >
                      {row.shortageQuantity > 0 ? formatQty(row.shortageQuantity) : '—'}
                    </TD>
                    <TD className="tabular-nums text-xs tabular-nums">
                      {formatMoney(row.pendingValue, currency)}
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {formatDate(row.expectedDeliveryDate)}
                    </TD>
                    <TD className="tabular-nums text-xs tabular-nums text-muted-foreground">
                      {row.daysOverdue != null ? row.daysOverdue : '—'}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>

        {report && report.lines.content.length > 0 && (
          <div className="mt-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Dispatch readiness</h2>
            <ul className="rounded-md border border-border bg-card shadow-xs divide-y divide-border/80">
              {report.lines.content.map((row) => (
                <li key={`ready-${row.salesOrderItemId}`}>
                  <button
                    type="button"
                    onClick={() => void openSo(row)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    {row.readyForDispatch ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {row.orderNumber} — {row.itemName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Expected delivery: {formatDate(row.expectedDeliveryDate)}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-medium shrink-0 ${
                        row.readyForDispatch ? 'text-success' : 'text-warning'
                      }`}
                    >
                      {row.readyForDispatch
                        ? 'Ready for Dispatch'
                        : `Shortage: ${formatQty(row.shortageQuantity)} ${row.unitOfMeasure}`}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ReportPageLayout>

      <SalesOrderDetailsModal
        isOpen={isDetailsOpen}
        order={selectedOrder}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedOrder(null)
        }}
        onOrderUpdated={load}
      />
    </>
  )
}
