import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { MaintenanceWorkOrderDetailsModal } from '../maintenance/MaintenanceWorkOrderDetailsModal'
import { maintenanceService } from '../../services/maintenanceService'
import { reportsService } from '../../services/reportsService'
import type { Equipment, MaintenanceWorkOrder } from '../../types/maintenance'
import type {
  MaintenanceHistoryReport as MaintenanceHistoryReportData,
  MaintenanceHistoryRow,
  MaintenanceHistoryTypeFilter,
} from '../../types/reports'

export interface MaintenanceHistoryReportProps {
  onBack: () => void
}

type TypeFilter = '' | MaintenanceHistoryTypeFilter
type OperationalFilter = '' | 'true' | 'false'

function firstDayOfMonthIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const datePart = value.length >= 10 ? value.slice(0, 10) : value
  const d = new Date(datePart + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
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

function typeBadge(type: MaintenanceHistoryTypeFilter) {
  if (type === 'BREAKDOWN') return <Badge variant="warning">Breakdown</Badge>
  return <Badge variant="success">Preventive</Badge>
}

function priorityBadge(priority: MaintenanceHistoryRow['priority']) {
  if (priority === 'HIGH') return <Badge variant="destructive">High</Badge>
  if (priority === 'LOW') return <Badge variant="neutral">Low</Badge>
  return <Badge variant="warning">Medium</Badge>
}

export function MaintenanceHistoryReport({ onBack }: MaintenanceHistoryReportProps) {
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso)
  const [toDate, setToDate] = useState(todayIso)
  const [equipmentId, setEquipmentId] = useState<number | ''>('')
  const [maintenanceType, setMaintenanceType] = useState<TypeFilter>('')
  const [technician, setTechnician] = useState('')
  const [machineOperational, setMachineOperational] = useState<OperationalFilter>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [report, setReport] = useState<MaintenanceHistoryReportData | null>(null)
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
    maintenanceType: maintenanceType || undefined,
    technician: technician || undefined,
    machineOperational:
      machineOperational === '' ? undefined : machineOperational === 'true',
  }

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getMaintenanceHistory({
        ...filterParams,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load maintenance history.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filter fields listed individually
  }, [
    fromDate,
    toDate,
    equipmentId,
    maintenanceType,
    technician,
    machineOperational,
    page,
    pageSize,
  ])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const maxEquipmentOrders = useMemo(() => {
    if (!report?.byEquipment.length) return 0
    return Math.max(...report.byEquipment.map((e) => e.totalWorkOrders))
  }, [report])

  const openWorkOrder = async (row: MaintenanceHistoryRow) => {
    try {
      const workOrder = await maintenanceService.getWorkOrderById(row.workOrderId)
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
      await reportsService.exportMaintenanceHistoryCsv(filterParams)
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
        title="Maintenance History"
        description="Completed preventive and breakdown work orders, with duration and restoration outcome."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting || isLoading || !report || report.summary.completedWorkOrders === 0
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
              label="Maintenance Type"
              value={maintenanceType}
              onChange={(v) => {
                setMaintenanceType(v as TypeFilter)
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Types' },
                { value: 'PREVENTIVE', label: 'Preventive' },
                { value: 'BREAKDOWN', label: 'Breakdown' },
              ]}
            />
            <Select
              label="Technician"
              value={technician}
              onChange={(v) => {
                setTechnician(v)
                setPage(0)
              }}
              options={[
                { value: '', label: 'All Technicians' },
                ...(report?.technicians || []).map((name) => ({
                  value: name,
                  label: name,
                })),
              ]}
            />
            <Select
              label="Operational After Maintenance"
              value={machineOperational}
              onChange={(v) => {
                setMachineOperational(v as OperationalFilter)
                setPage(0)
              }}
              options={[
                { value: '', label: 'All' },
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]}
            />
          </div>
        }
        summary={
          report ? (
            <ReportSummaryCards
              items={[
                {
                  label: 'Completed Work Orders',
                  value: report.summary.completedWorkOrders,
                },
                {
                  label: 'Preventive Maintenance',
                  value: report.summary.preventiveMaintenance,
                },
                {
                  label: 'Breakdown Work Orders',
                  value: report.summary.breakdownWorkOrders,
                },
                {
                  label: 'Total Maintenance Duration',
                  value: formatDuration(report.summary.totalDurationMinutes),
                },
              ]}
            />
          ) : null
        }
        footer={
          report && report.workOrders.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.workOrders.content.length} of {report.workOrders.totalElements}{' '}
                work orders
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
                  Page {page + 1} of {Math.max(1, report.workOrders.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= report.workOrders.totalPages || isLoading}
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

        <section className="space-y-2 mb-5">
          <h2 className="text-sm font-semibold text-foreground">Maintenance records</h2>
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
            <Table className="border-0 rounded-none shadow-none bg-transparent">
              <THead>
                <tr>
                  <TH>Equipment / WO</TH>
                  <TH>Type</TH>
                  <TH>Priority</TH>
                  <TH>Technician</TH>
                  <TH>Start</TH>
                  <TH>Completed</TH>
                  <TH>Duration</TH>
                  <TH>Operational After Work</TH>
                </tr>
              </THead>
              <TBody>
                {isLoading && !report ? (
                  <TR>
                    <TD colSpan={8} className="py-14 text-center text-muted-foreground">
                      Loading maintenance history...
                    </TD>
                  </TR>
                ) : !report || report.workOrders.content.length === 0 ? (
                  <TR>
                    <TD colSpan={8} className="py-14 text-center text-muted-foreground">
                      No completed work orders match the selected filters.
                    </TD>
                  </TR>
                ) : (
                  report.workOrders.content.map((row) => (
                    <TR
                      key={row.workOrderId}
                      className="cursor-pointer"
                      onClick={() => void openWorkOrder(row)}
                    >
                      <TD>
                        <div className="text-sm text-foreground">{row.equipmentName}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <RefLink>{row.workOrderNumber}</RefLink>
                          <span className="text-xs text-muted-foreground">
                            · {formatDate(row.actualEndAt)}
                          </span>
                        </div>
                        <div className="text-xs text-ref text-muted-foreground mt-0.5">
                          {row.equipmentCode}
                          {row.maintenancePlanName ? ` · ${row.maintenancePlanName}` : ''}
                        </div>
                      </TD>
                      <TD>{typeBadge(row.maintenanceType)}</TD>
                      <TD>{priorityBadge(row.priority)}</TD>
                      <TD className="text-sm text-muted-foreground">
                        {row.technician?.trim() ? row.technician : '—'}
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {formatDateTime(row.actualStartAt)}
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {formatDateTime(row.actualEndAt)}
                      </TD>
                      <TD className="tabular-nums text-xs tabular-nums">
                        {formatDuration(row.durationMinutes)}
                      </TD>
                      <TD
                        className={`text-sm font-medium ${
                          row.machineOperational ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {row.machineOperational == null
                          ? '—'
                          : row.machineOperational
                            ? 'Yes'
                            : 'No'}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </section>

        {report && report.byEquipment.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Maintenance work orders by equipment
            </h2>
            <div className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-4">
              {report.byEquipment.map((item) => {
                const widthPct =
                  maxEquipmentOrders > 0
                    ? Math.max(8, Math.round((item.totalWorkOrders / maxEquipmentOrders) * 100))
                    : 0
                const preventivePct =
                  item.totalWorkOrders > 0
                    ? (item.preventiveCount / item.totalWorkOrders) * 100
                    : 0
                const breakdownPct =
                  item.totalWorkOrders > 0
                    ? (item.breakdownCount / item.totalWorkOrders) * 100
                    : 0
                return (
                  <div key={item.equipmentId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {item.equipmentName}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {item.totalWorkOrders} work order
                        {item.totalWorkOrders === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-md bg-secondary overflow-hidden flex"
                      style={{ width: `${widthPct}%` }}
                    >
                      <div
                        className="h-full bg-success"
                        style={{ width: `${preventivePct}%` }}
                      />
                      <div
                        className="h-full bg-warning"
                        style={{ width: `${breakdownPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-md bg-success" />
                  Preventive
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-md bg-warning" />
                  Breakdown
                </span>
              </div>
            </div>
          </section>
        )}
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
