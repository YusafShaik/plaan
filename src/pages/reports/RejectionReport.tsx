import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { Table, THead, TBody, TR, TH, TD, RefLink, RefCode } from '../../components/ui/Table'
import { IncomingInspectionForm } from '../quality/IncomingInspectionForm'
import { FinishedGoodsInspectionForm } from '../quality/FinishedGoodsInspectionForm'
import { masterDataService } from '../../services/masterDataService'
import { manufacturingService } from '../../services/manufacturingService'
import { reportsService } from '../../services/reportsService'
import type { Item, Supplier, Warehouse } from '../../types/masterData'
import type { ProductionOrder } from '../../types/manufacturing'
import type {
  InspectionSummaryTypeFilter,
  RejectionReport as RejectionReportData,
  RejectionReportRow,
} from '../../types/reports'

export interface RejectionReportProps {
  onBack: () => void
}

type TypeFilter = 'all' | InspectionSummaryTypeFilter

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

function sourceParty(row: RejectionReportRow) {
  if (row.inspectionType === 'INCOMING') {
    return row.supplierName || '—'
  }
  return row.productionOrderNumber || '—'
}

export function RejectionReport({ onBack }: RejectionReportProps) {
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso)
  const [toDate, setToDate] = useState(todayIso)
  const [inspectionType, setInspectionType] = useState<TypeFilter>('all')
  const [itemId, setItemId] = useState<number | ''>('')
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [productionOrderId, setProductionOrderId] = useState<number | ''>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [items, setItems] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([])
  const [report, setReport] = useState<RejectionReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [iqcId, setIqcId] = useState<number | null>(null)
  const [isIqcOpen, setIsIqcOpen] = useState(false)
  const [fgiId, setFgiId] = useState<number | null>(null)
  const [isFgiOpen, setIsFgiOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      masterDataService.getItems({ size: 200 }),
      masterDataService.getWarehouses({ size: 200 }),
      masterDataService.getSuppliers({ size: 200 }),
      manufacturingService.getProductionOrders({ size: 200 }),
    ])
      .then(([itemPage, warehousePage, supplierPage, orderPage]) => {
        setItems(itemPage.content)
        setWarehouses(warehousePage.content)
        setSuppliers(supplierPage.content)
        setProductionOrders(orderPage.content)
      })
      .catch(() => {
        setItems([])
        setWarehouses([])
        setSuppliers([])
        setProductionOrders([])
      })
  }, [])

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getRejectionReport({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        inspectionType: inspectionType === 'all' ? undefined : inspectionType,
        itemId: itemId === '' ? undefined : itemId,
        warehouseId: warehouseId === '' ? undefined : warehouseId,
        supplierId: supplierId === '' ? undefined : supplierId,
        productionOrderId: productionOrderId === '' ? undefined : productionOrderId,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load rejection report.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
  }, [
    fromDate,
    toDate,
    inspectionType,
    itemId,
    warehouseId,
    supplierId,
    productionOrderId,
    page,
    pageSize,
  ])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const openInspection = (row: RejectionReportRow) => {
    if (row.inspectionType === 'INCOMING') {
      setIqcId(row.id)
      setIsIqcOpen(true)
    } else {
      setFgiId(row.id)
      setIsFgiOpen(true)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportRejectionReportCsv({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        inspectionType: inspectionType === 'all' ? undefined : inspectionType,
        itemId: itemId === '' ? undefined : itemId,
        warehouseId: warehouseId === '' ? undefined : warehouseId,
        supplierId: supplierId === '' ? undefined : supplierId,
        productionOrderId: productionOrderId === '' ? undefined : productionOrderId,
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
        categoryLabel="Quality"
        title="Rejection Report"
        description="Identify rejected materials and finished goods, their sources, and rejection remarks."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting ||
          isLoading ||
          !report ||
          report.summary.inspectionsWithRejections === 0
        }
        filters={
          <div className="space-y-3">
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
                label="Production Order"
                value={productionOrderId === '' ? '' : productionOrderId}
                onChange={(v) => {
                  setProductionOrderId(v ? Number(v) : '')
                  setPage(0)
                }}
                options={[
                  { value: '', label: 'All Orders' },
                  ...productionOrders.map((o) => ({
                    value: o.id,
                    label: `${o.orderNumber} — ${o.productName}`,
                  })),
                ]}
              />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-2">Inspection Type</p>
              <UnderlineTabs
                items={[
                  { id: 'all', label: 'All Types' },
                  { id: 'INCOMING', label: 'Incoming' },
                  { id: 'FINISHED_GOODS', label: 'Finished Goods' },
                ]}
                value={inspectionType}
                onChange={(id) => {
                  setInspectionType(id as TypeFilter)
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
                {
                  label: 'Inspections with Rejections',
                  value: report.summary.inspectionsWithRejections,
                },
                { label: 'Affected Items', value: report.summary.affectedItems },
                { label: 'Incoming Rejections', value: report.summary.incomingRejections },
                {
                  label: 'Finished Goods Rejections',
                  value: report.summary.finishedGoodsRejections,
                },
              ]}
            />
          ) : null
        }
        footer={
          report && report.rejections.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.rejections.content.length} of {report.rejections.totalElements}{' '}
                rejections
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
                  Page {page + 1} of {Math.max(1, report.rejections.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= report.rejections.totalPages || isLoading}
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
                  <TH>Item / Source</TH>
                  <TH className="text-right">Inspected</TH>
                  <TH className="text-right">Rejected</TH>
                  <TH className="text-right">Rejection %</TH>
                </tr>
              </THead>
              <TBody>
                {isLoading && !report ? (
                  <TR>
                    <TD colSpan={4} className="py-14 text-center text-muted-foreground">
                      Loading rejection report...
                    </TD>
                  </TR>
                ) : !report || report.rejections.content.length === 0 ? (
                  <TR>
                    <TD colSpan={4} className="py-14 text-center text-muted-foreground">
                      No rejections match the selected filters.
                    </TD>
                  </TR>
                ) : (
                  report.rejections.content.map((row) => (
                    <TR
                      key={`${row.inspectionType}-${row.id}`}
                      clickable
                      onClick={() => openInspection(row)}
                    >
                      <TD>
                        <div className="text-sm font-medium text-foreground">{row.itemName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          <RefLink className="text-[11px]">{row.inspectionNumber}</RefLink>
                          <span> · {sourceParty(row)}</span>
                        </div>
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums">
                        {formatQty(row.inspectedQuantity)}
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums text-destructive">
                        {formatQty(row.rejectedQuantity)}
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums text-destructive">
                        {formatPercent(row.rejectionRate)}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </section>

        {report && report.remarks.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-foreground">Rejection remarks</h2>
            <div className="rounded-md border border-border bg-card shadow-xs divide-y divide-border/80">
              {report.remarks.map((row) => (
                <button
                  key={`remark-${row.inspectionType}-${row.id}`}
                  type="button"
                  onClick={() => openInspection(row)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{row.itemName}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {row.remarks ||
                            (row.failedParameters.length > 0
                              ? `Failed: ${row.failedParameters.join(', ')}`
                              : 'No remarks recorded')}
                        </p>
                        {row.remarks && row.failedParameters.length > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Failed: {row.failedParameters.join(', ')}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <RefCode className="text-[11px]">{row.inspectionNumber}</RefCode>
                          {row.sourceReference ? ` · ${row.sourceReference}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-destructive shrink-0">
                        {formatQty(row.rejectedQuantity)} {row.unitOfMeasure}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </ReportPageLayout>

      <IncomingInspectionForm
        isOpen={isIqcOpen}
        inspectionId={iqcId}
        onClose={() => {
          setIsIqcOpen(false)
          setIqcId(null)
        }}
        onCompleted={() => {
          setIsIqcOpen(false)
          setIqcId(null)
          load()
        }}
      />
      <FinishedGoodsInspectionForm
        isOpen={isFgiOpen}
        inspectionId={fgiId}
        onClose={() => {
          setIsFgiOpen(false)
          setFgiId(null)
        }}
        onCompleted={() => {
          setIsFgiOpen(false)
          setFgiId(null)
          load()
        }}
      />
    </>
  )
}
