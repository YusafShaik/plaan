import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { PurchaseOrderDetailsModal } from '../procurement/PurchaseOrderDetailsModal'
import { masterDataService } from '../../services/masterDataService'
import { procurementService } from '../../services/procurementService'
import { reportsService } from '../../services/reportsService'
import { useAuth } from '../../hooks/useAuth'
import type { PurchaseOrder } from '../../types/procurement'
import type {
  DeliveryScheduleStatus,
  PendingPurchaseOrderReport as PendingPurchaseOrderReportData,
  PendingPurchaseOrderRow,
} from '../../types/reports'
import type { Item, Supplier, Warehouse } from '../../types/masterData'

export interface PendingPurchaseOrdersReportProps {
  onBack: () => void
}

type DeliveryFilter = '' | DeliveryScheduleStatus

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
  if (status === 'UPCOMING') return <Badge variant="success">Upcoming</Badge>
  return <Badge variant="neutral">Not Scheduled</Badge>
}

export function PendingPurchaseOrdersReport({ onBack }: PendingPurchaseOrdersReportProps) {
  const { organization } = useAuth()
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [itemId, setItemId] = useState<number | ''>('')
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryFilter>('')
  const [expectedFrom, setExpectedFrom] = useState('')
  const [expectedTo, setExpectedTo] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [report, setReport] = useState<PendingPurchaseOrderReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      masterDataService.getSuppliers({ size: 200 }),
      masterDataService.getItems({ size: 200 }),
      masterDataService.getWarehouses({ size: 200 }),
    ])
      .then(([supplierPage, itemPage, warehousePage]) => {
        setSuppliers(supplierPage.content)
        setItems(itemPage.content)
        setWarehouses(warehousePage.content)
      })
      .catch(() => {
        setSuppliers([])
        setItems([])
        setWarehouses([])
      })
  }, [])

  const filterParams = {
    supplierId: supplierId === '' ? undefined : supplierId,
    itemId: itemId === '' ? undefined : itemId,
    warehouseId: warehouseId === '' ? undefined : warehouseId,
    deliveryStatus: deliveryStatus || undefined,
    expectedFrom: expectedFrom || undefined,
    expectedTo: expectedTo || undefined,
  }

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getPendingPurchaseOrders({
        ...filterParams,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load pending purchase orders.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filter fields listed individually
  }, [supplierId, itemId, warehouseId, deliveryStatus, expectedFrom, expectedTo, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const currency = report?.currency || organization?.baseCurrency || 'INR'

  const openPo = async (row: PendingPurchaseOrderRow) => {
    try {
      const order = await procurementService.getPurchaseOrderById(row.purchaseOrderId)
      setSelectedOrder(order)
      setIsDetailsOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open purchase order')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportPendingPurchaseOrdersCsv(filterParams)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <ReportPageLayout
        categoryLabel="Procurement"
        title="Pending Purchase Orders"
        description="Line items still awaiting delivery from suppliers on issued and partially received purchase orders."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={isExporting || isLoading || !report || report.summary.pendingPos === 0}
        filters={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Select
              label="Supplier"
              value={supplierId === '' ? '' : supplierId}
              onChange={(v) => {
                setSupplierId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Suppliers' },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
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
                ...items.map((i) => ({
                  value: i.id,
                  label: `${i.itemCode} — ${i.name}`,
                })),
              ]}
            />
            <Select
              label="Receiving Warehouse"
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
              label="Delivery Status"
              value={deliveryStatus}
              onChange={(v) => {
                setDeliveryStatus(v as DeliveryFilter)
                setPage(0)
              }}
              options={[
                { value: '', label: 'All' },
                { value: 'OVERDUE', label: 'Overdue' },
                { value: 'DUE_TODAY', label: 'Due Today' },
                { value: 'UPCOMING', label: 'Upcoming' },
                { value: 'NOT_SCHEDULED', label: 'Not Scheduled' },
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
        }
        summary={
          report ? (
            <ReportSummaryCards
              items={[
                { label: 'Pending POs', value: report.summary.pendingPos },
                {
                  label: 'Pending Value',
                  value: formatMoney(report.summary.pendingValue, currency),
                },
                { label: 'Overdue POs', value: report.summary.overduePos },
              ]}
            />
          ) : null
        }
        footer={
          report && report.lines.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.lines.content.length} of {report.lines.totalElements} pending lines
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
                <TH>PO Number</TH>
                <TH>PO Date</TH>
                <TH>Supplier</TH>
                <TH>Item</TH>
                <TH>Warehouse</TH>
                <TH>Ordered</TH>
                <TH>Received</TH>
                <TH>Pending</TH>
                <TH>Pending Value</TH>
                <TH>Expected</TH>
                <TH>Status</TH>
                <TH>Days Overdue</TH>
              </tr>
            </THead>
            <TBody>
              {isLoading && !report ? (
                <TR>
                  <TD colSpan={12} className="py-14 text-center text-muted-foreground">
                    Loading pending purchase orders...
                  </TD>
                </TR>
              ) : !report || report.lines.content.length === 0 ? (
                <TR>
                  <TD colSpan={12} className="py-14 text-center text-muted-foreground">
                    No pending purchase order lines match the selected filters.
                  </TD>
                </TR>
              ) : (
                report.lines.content.map((row) => (
                  <TR
                    key={`${row.purchaseOrderItemId}`}
                    className="cursor-pointer"
                    onClick={() => void openPo(row)}
                  >
                    <TD>
                      <RefLink>{row.poNumber}</RefLink>
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {formatDate(row.orderDate)}
                    </TD>
                    <TD className="text-sm text-foreground">{row.supplierName}</TD>
                    <TD>
                      <div className="text-sm text-foreground">{row.itemName}</div>
                      <div className="text-[11px] text-ref text-muted-foreground">
                        {row.itemCode}
                      </div>
                    </TD>
                    <TD className="text-xs text-muted-foreground">{row.warehouseName}</TD>
                    <TD className="font-mono text-xs tabular-nums">
                      {formatQty(row.orderedQuantity)} {row.unitOfMeasure}
                    </TD>
                    <TD className="font-mono text-xs tabular-nums">
                      {formatQty(row.receivedQuantity)} {row.unitOfMeasure}
                    </TD>
                    <TD className="font-mono text-xs tabular-nums font-medium text-foreground">
                      {formatQty(row.pendingQuantity)} {row.unitOfMeasure}
                    </TD>
                    <TD className="font-mono text-xs tabular-nums">
                      {formatMoney(row.pendingValue, currency)}
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {formatDate(row.expectedDeliveryDate)}
                    </TD>
                    <TD>{deliveryBadge(row.deliveryStatus)}</TD>
                    <TD className="font-mono text-xs tabular-nums text-muted-foreground">
                      {row.daysOverdue != null ? row.daysOverdue : '—'}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </ReportPageLayout>

      <PurchaseOrderDetailsModal
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
