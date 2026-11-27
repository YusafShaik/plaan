import { useCallback, useEffect, useMemo, useState } from 'react'
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
import type { PurchaseOrder, PurchaseOrderStatus } from '../../types/procurement'
import type {
  PurchaseSummaryReport as PurchaseSummaryReportData,
  PurchaseSummaryRow,
} from '../../types/reports'
import type { Supplier, Warehouse } from '../../types/masterData'

export interface PurchaseSummaryReportProps {
  onBack: () => void
}

type StatusFilter = '' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED'

function firstDayOfMonthIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMoney(amount: number, currency: string) {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusBadge(status: PurchaseOrderStatus) {
  if (status === 'COMPLETED') return <Badge variant="success">Fully Received</Badge>
  if (status === 'PARTIALLY_RECEIVED') return <Badge variant="warning">Partially Received</Badge>
  if (status === 'ISSUED') return <Badge variant="neutral">Issued</Badge>
  return <Badge variant="neutral">{status}</Badge>
}

export function PurchaseSummaryReport({ onBack }: PurchaseSummaryReportProps) {
  const { organization } = useAuth()
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso)
  const [toDate, setToDate] = useState(todayIso)
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [report, setReport] = useState<PurchaseSummaryReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      masterDataService.getSuppliers({ size: 200 }),
      masterDataService.getWarehouses({ size: 200 }),
    ])
      .then(([supplierPage, warehousePage]) => {
        setSuppliers(supplierPage.content)
        setWarehouses(warehousePage.content)
      })
      .catch(() => {
        setSuppliers([])
        setWarehouses([])
      })
  }, [])

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getPurchaseSummary({
        fromDate,
        toDate,
        supplierId: supplierId === '' ? undefined : supplierId,
        warehouseId: warehouseId === '' ? undefined : warehouseId,
        status: status || undefined,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load purchase summary.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
  }, [fromDate, toDate, supplierId, warehouseId, status, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const currency = report?.currency || organization?.baseCurrency || 'INR'
  const maxSupplierValue = useMemo(() => {
    if (!report?.bySupplier.length) return 0
    return Math.max(...report.bySupplier.map((s) => s.orderValue))
  }, [report])

  const openPo = async (row: PurchaseSummaryRow) => {
    try {
      const order = await procurementService.getPurchaseOrderById(row.id)
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
      await reportsService.exportPurchaseSummaryCsv({
        fromDate,
        toDate,
        supplierId: supplierId === '' ? undefined : supplierId,
        warehouseId: warehouseId === '' ? undefined : warehouseId,
        status: status || undefined,
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
        categoryLabel="Procurement"
        title="Purchase Summary"
        description="Purchase order volume, value and fulfillment status for the selected period."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={isExporting || isLoading || !report || report.summary.totalPurchaseOrders === 0}
        filters={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              label="Supplier"
              value={supplierId === '' ? '' : supplierId}
              onChange={(v) => {
                setSupplierId(v ? Number(v) : '')
                setPage(0)
              }}
              placeholder="All Suppliers"
              options={[
                { value: '', label: 'All Suppliers' },
                ...suppliers.map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
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
                { value: 'ISSUED', label: 'Issued' },
                { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
                { value: 'COMPLETED', label: 'Fully Received' },
              ]}
            />
            <Select
              label="Warehouse"
              value={warehouseId === '' ? '' : warehouseId}
              onChange={(v) => {
                setWarehouseId(v ? Number(v) : '')
                setPage(0)
              }}
              placeholder="All Warehouses"
              options={[
                { value: '', label: 'All Warehouses' },
                ...warehouses.map((w) => ({
                  value: w.id,
                  label: w.name,
                })),
              ]}
            />
          </div>
        }
        summary={
          report ? (
            <ReportSummaryCards
              items={[
                { label: 'Total Purchase Orders', value: report.summary.totalPurchaseOrders },
                {
                  label: 'Total Order Value',
                  value: formatMoney(report.summary.totalOrderValue, currency),
                },
                { label: 'Fully Received', value: report.summary.fullyReceived },
                { label: 'Pending Orders', value: report.summary.pendingOrders },
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
          <h2 className="text-sm font-semibold text-foreground">Purchase Order Details</h2>
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
            <Table className="border-0 rounded-none shadow-none bg-transparent">
              <THead>
                <tr>
                  <TH>PO Number</TH>
                  <TH>PO Date</TH>
                  <TH>Supplier</TH>
                  <TH>Warehouse</TH>
                  <TH>Expected Delivery</TH>
                  <TH>Order Value</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {isLoading && !report ? (
                  <TR>
                    <TD colSpan={7} className="py-14 text-center text-muted-foreground">
                      Loading purchase summary...
                    </TD>
                  </TR>
                ) : !report || report.orders.content.length === 0 ? (
                  <TR>
                    <TD colSpan={7} className="py-14 text-center text-muted-foreground">
                      No purchase orders match the selected filters.
                    </TD>
                  </TR>
                ) : (
                  report.orders.content.map((row) => (
                    <TR
                      key={row.id}
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
                      <TD className="text-xs text-muted-foreground">{row.warehouseName}</TD>
                      <TD className="text-xs text-muted-foreground">
                        {formatDate(row.expectedDeliveryDate)}
                      </TD>
                      <TD className="tabular-nums text-xs tabular-nums">
                        {formatMoney(row.orderValue, currency)}
                      </TD>
                      <TD>{statusBadge(row.status)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </section>

        {report && report.bySupplier.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-foreground">
              Purchase order value by supplier
            </h2>
            <div className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-4">
              {report.bySupplier.map((supplier) => {
                const pct =
                  maxSupplierValue > 0
                    ? Math.max(4, Math.round((supplier.orderValue / maxSupplierValue) * 100))
                    : 0
                return (
                  <div key={supplier.supplierId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {supplier.supplierName}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(supplier.orderValue, currency)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-md bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-md bg-success"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
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
