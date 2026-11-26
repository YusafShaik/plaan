import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { MaintenanceWorkOrderDetailsModal } from '../maintenance/MaintenanceWorkOrderDetailsModal'
import { maintenanceService } from '../../services/maintenanceService'
import { reportsService } from '../../services/reportsService'
import type { Equipment, MaintenanceWorkOrder } from '../../types/maintenance'
import type {
  EquipmentDowntimeReport as EquipmentDowntimeReportData,
  EquipmentDowntimeRow,
  EquipmentDowntimeRestorationStatus,
} from '../../types/reports'

export interface EquipmentDowntimeReportProps {
  onBack: () => void
}

type RestorationFilter = '' | EquipmentDowntimeRestorationStatus

function firstDayOfMonthIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(minutes?: number | null) {
  if (minutes == null) return '—'
  const hours = minutes / 60
  const formatted = hours.toLocaleString('en-IN', {
    minimumFractionDigits: hours % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })
  return `${formatted} hrs`
}

export function EquipmentDowntimeReport({ onBack }: EquipmentDowntimeReportProps) {
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso)
  const [toDate, setToDate] = useState(todayIso)
  const [equipmentId, setEquipmentId] = useState<number | ''>('')
  const [restorationStatus, setRestorationStatus] = useState<RestorationFilter>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [report, setReport] = useState<EquipmentDowntimeReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedWorkOrder, setSelectedWorkOrder] = useState<MaintenanceWorkOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    maintenanceService
      .getEquipment({ size: 200 })
      .then((pageData) => setEquipment(pageData.content))
      .catch(() => setEquipment([]))
  }, [])

  const filterParams = {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    equipmentId: equipmentId === '' ? undefined : equipmentId,
    restorationStatus: restorationStatus || undefined,
  }

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getEquipmentDowntime({
        ...filterParams,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load equipment downtime.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filter fields listed individually
  }, [fromDate, toDate, equipmentId, restorationStatus, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const maxDowntime = useMemo(() => {
    if (!report?.byEquipment.length) return 0
    return Math.max(...report.byEquipment.map((e) => e.downtimeMinutes))
  }, [report])

  const openWorkOrder = async (row: EquipmentDowntimeRow) => {
    try {
      const workOrder = await maintenanceService.getWorkOrderById(row.rootWorkOrderId)
      setSelectedWorkOrder(workOrder)
      setIsDetailsOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open work order')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportEquipmentDowntimeCsv(filterParams)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <ReportPageLayout
        categoryLabel="Maintenance"
        title="Equipment Downtime"
        description="Breakdown downtime across equipment, including ongoing and restored events."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting || isLoading || !report || report.summary.totalBreakdownEvents === 0
        }
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
              label="Equipment"
              value={equipmentId === '' ? '' : equipmentId}
              onChange={(v) => {
                setEquipmentId(v ? Number(v) : '')
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Equipment' },
                ...equipment.map((eq) => ({
                  value: eq.id,
                  label: `${eq.equipmentCode} — ${eq.equipmentName}`,
                })),
              ]}
            />
            <Select
              label="Restoration Status"
              value={restorationStatus}
              onChange={(v) => {
                setRestorationStatus(v as RestorationFilter)
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'RESTORED', label: 'Restored' },
                { value: 'ONGOING', label: 'Ongoing' },
              ]}
            />
          </div>
        }
        summary={
          report ? (
            <ReportSummaryCards
              items={[
                {
                  label: 'Total Breakdown Events',
                  value: report.summary.totalBreakdownEvents,
                },
                {
                  label: 'Total Downtime',
                  value: formatDuration(report.summary.totalDowntimeMinutes),
                },
                {
                  label: 'Restored Events',
                  value: report.summary.restoredEvents,
                },
                {
                  label: 'Ongoing Breakdowns',
                  value: report.summary.ongoingBreakdowns,
                },
              ]}
            />
          ) : null
        }
        footer={
          report && report.events.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.events.content.length} of {report.events.totalElements} events
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
                  Page {page + 1} of {Math.max(1, report.events.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= report.events.totalPages || isLoading}
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

        {report && report.byEquipment.length > 0 && (
          <section className="space-y-3 mb-5">
            <h2 className="text-sm font-semibold text-foreground">Downtime by equipment</h2>
            <div className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-4">
              {report.byEquipment.map((item) => {
                const pct =
                  maxDowntime > 0
                    ? Math.max(4, Math.round((item.downtimeMinutes / maxDowntime) * 100))
                    : 0
                return (
                  <div key={item.equipmentId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {item.equipmentName}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatDuration(item.downtimeMinutes)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-md bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-md bg-foreground"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Breakdown history</h2>
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
            <Table className="border-0 rounded-none shadow-none bg-transparent">
              <THead>
                <tr>
                  <TH>Equipment / WO</TH>
                  <TH>Breakdown</TH>
                  <TH>Maintenance Start</TH>
                  <TH>Restored</TH>
                  <TH>Downtime</TH>
                  <TH>In Period</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {isLoading && !report ? (
                  <TR>
                    <TD colSpan={7} className="py-14 text-center text-muted-foreground">
                      Loading equipment downtime...
                    </TD>
                  </TR>
                ) : !report || report.events.content.length === 0 ? (
                  <TR>
                    <TD colSpan={7} className="py-14 text-center text-muted-foreground">
                      No breakdown events match the selected filters.
                    </TD>
                  </TR>
                ) : (
                  report.events.content.map((row) => (
                    <TR
                      key={row.rootWorkOrderId}
                      className="cursor-pointer"
                      onClick={() => void openWorkOrder(row)}
                    >
                      <TD>
                        <div className="text-sm text-foreground">{row.equipmentName}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <RefLink>{row.workOrderNumber}</RefLink>
                          <span className="text-[11px] text-ref text-muted-foreground">
                            {row.equipmentCode}
                          </span>
                        </div>
                        {row.breakdownDescription && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {row.breakdownDescription}
                          </div>
                        )}
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {formatDateTime(row.breakdownAt)}
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {formatDateTime(row.maintenanceStartAt)}
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {formatDateTime(row.restorationAt)}
                      </TD>
                      <TD className="font-mono text-xs tabular-nums">
                        {formatDuration(row.downtimeMinutes)}
                      </TD>
                      <TD className="font-mono text-xs tabular-nums">
                        {formatDuration(row.downtimeInPeriodMinutes)}
                      </TD>
                      <TD
                        className={`text-sm font-medium ${
                          row.restorationStatus === 'RESTORED'
                            ? 'text-success'
                            : 'text-destructive'
                        }`}
                      >
                        {row.restorationStatus === 'RESTORED' ? 'Restored' : 'Ongoing'}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </section>
      </ReportPageLayout>

      <MaintenanceWorkOrderDetailsModal
        isOpen={isDetailsOpen}
        workOrder={selectedWorkOrder}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedWorkOrder(null)
        }}
      />
    </>
  )
}
