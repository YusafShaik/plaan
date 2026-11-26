import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, RefLink, RefCode } from '../../components/ui/Table'
import { IncomingInspectionForm } from '../quality/IncomingInspectionForm'
import { FinishedGoodsInspectionForm } from '../quality/FinishedGoodsInspectionForm'
import { cn } from '../../lib/cn'
import { masterDataService } from '../../services/masterDataService'
import { reportsService } from '../../services/reportsService'
import type { Item, Warehouse } from '../../types/masterData'
import type {
  InspectionSummaryItemPerformance,
  InspectionSummaryReport as InspectionSummaryReportData,
  InspectionSummaryRow,
  InspectionSummaryStatusFilter,
  InspectionSummaryTypeFilter,
} from '../../types/reports'

export interface InspectionSummaryReportProps {
  onBack: () => void
}

type TypeFilter = '' | InspectionSummaryTypeFilter
type StatusFilter = '' | InspectionSummaryStatusFilter

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

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return `${value.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function typeLabel(type: InspectionSummaryTypeFilter) {
  return type === 'FINISHED_GOODS' ? 'Finished Goods' : 'Incoming'
}

function statusBadge(status: InspectionSummaryStatusFilter) {
  if (status === 'COMPLETED') return <Badge variant="success">Completed</Badge>
  if (status === 'DRAFT') return <Badge variant="info">Draft</Badge>
  return <Badge variant="warning">Pending</Badge>
}

export function InspectionSummaryReport({ onBack }: InspectionSummaryReportProps) {
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso)
  const [toDate, setToDate] = useState(todayIso)
  const [inspectionType, setInspectionType] = useState<TypeFilter>('')
  const [itemId, setItemId] = useState<number | ''>('')
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [items, setItems] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [report, setReport] = useState<InspectionSummaryReportData | null>(null)
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
      .getInspectionSummary({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        inspectionType: inspectionType || undefined,
        itemId: itemId === '' ? undefined : itemId,
        warehouseId: warehouseId === '' ? undefined : warehouseId,
        status: status || undefined,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load inspection summary.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
  }, [fromDate, toDate, inspectionType, itemId, warehouseId, status, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const openInspection = (row: InspectionSummaryRow) => {
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
      await reportsService.exportInspectionSummaryCsv({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        inspectionType: inspectionType || undefined,
        itemId: itemId === '' ? undefined : itemId,
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
        categoryLabel="Quality"
        title="Inspection Summary"
        description="Track incoming and finished goods inspection outcomes and quality performance."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting || isLoading || !report || report.summary.totalInspections === 0
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
              label="Inspection Type"
              value={inspectionType}
              onChange={(v) => {
                setInspectionType(v as TypeFilter)
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Types' },
                { value: 'INCOMING', label: 'Incoming' },
                { value: 'FINISHED_GOODS', label: 'Finished Goods' },
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
              label="Status"
              value={status}
              onChange={(v) => {
                setStatus(v as StatusFilter)
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'COMPLETED', label: 'Completed' },
              ]}
            />
          </div>
        }
        summary={
          report ? (
            <ReportSummaryCards
              items={[
                { label: 'Total Inspections', value: report.summary.totalInspections },
                { label: 'Completed', value: report.summary.completed },
                { label: 'Awaiting Completion', value: report.summary.awaitingCompletion },
                {
                  label: 'Inspections with Rejections',
                  value: report.summary.inspectionsWithRejections,
                },
              ]}
            />
          ) : null
        }
        footer={
          report && report.inspections.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.inspections.content.length} of {report.inspections.totalElements}{' '}
                inspections
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
                  Page {page + 1} of {Math.max(1, report.inspections.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= report.inspections.totalPages || isLoading}
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
                  <TH>Item / Inspection</TH>
                  <TH>Date</TH>
                  <TH>Type</TH>
                  <TH>Source</TH>
                  <TH className="text-right">Quantity</TH>
                  <TH className="text-right">Accepted</TH>
                  <TH className="text-right">Rejected</TH>
                  <TH className="text-right">Acceptance</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {isLoading && !report ? (
                  <TR>
                    <TD colSpan={9} className="py-14 text-center text-muted-foreground">
                      Loading inspection summary...
                    </TD>
                  </TR>
                ) : !report || report.inspections.content.length === 0 ? (
                  <TR>
                    <TD colSpan={9} className="py-14 text-center text-muted-foreground">
                      No inspections match the selected filters.
                    </TD>
                  </TR>
                ) : (
                  report.inspections.content.map((row) => (
                    <TR key={`${row.inspectionType}-${row.id}`} clickable onClick={() => openInspection(row)}>
                      <TD>
                        <div className="text-sm font-medium text-foreground">{row.itemName}</div>
                        <RefLink className="text-[11px]">{row.inspectionNumber}</RefLink>
                        <div>
                          <RefCode className="text-[11px] text-muted-foreground">{row.itemCode}</RefCode>
                        </div>
                      </TD>
                      <TD className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(row.inspectionDate)}
                      </TD>
                      <TD className="text-xs text-muted-foreground">{typeLabel(row.inspectionType)}</TD>
                      <TD>
                        {row.sourceReference ? (
                          <RefCode className="text-xs">{row.sourceReference}</RefCode>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums">
                        {formatQty(row.inspectionQuantity)}
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums text-success">
                        {formatQty(row.acceptedQuantity)}
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums text-destructive">
                        {formatQty(row.rejectedQuantity)}
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums">
                        {formatPercent(row.acceptanceRate)}
                      </TD>
                      <TD>{statusBadge(row.status)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </section>

        {report && report.byItem.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-foreground">Item-wise quality performance</h2>
            <div className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-4">
              {report.byItem.map((item) => (
                <ItemPerformanceBar key={`${item.inspectionType}-${item.itemId}`} item={item} />
              ))}
              <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-md bg-success" />
                  Accepted
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-md bg-destructive" />
                  Rejected
                </span>
              </div>
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

function ItemPerformanceBar({ item }: { item: InspectionSummaryItemPerformance }) {
  const acceptedPct =
    item.inspectedQuantity > 0
      ? Math.min(100, (item.acceptedQuantity / item.inspectedQuantity) * 100)
      : 0
  const rejectedPct = Math.max(0, 100 - acceptedPct)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground">{item.itemName}</span>
          <span className="ml-2 text-xs text-muted-foreground">{typeLabel(item.inspectionType)}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
          {formatPercent(item.acceptanceRate)} accepted
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-md bg-secondary">
        <div className="h-full bg-success" style={{ width: `${acceptedPct}%` }} />
        <div
          className={cn('h-full bg-destructive', rejectedPct <= 0 && 'hidden')}
          style={{ width: `${rejectedPct}%` }}
        />
      </div>
    </div>
  )
}
