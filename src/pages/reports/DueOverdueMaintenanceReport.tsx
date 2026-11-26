import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { MaintenancePlanDetailsModal } from '../maintenance/MaintenancePlanDetailsModal'
import { MaintenanceWorkOrderDetailsModal } from '../maintenance/MaintenanceWorkOrderDetailsModal'
import { maintenanceService } from '../../services/maintenanceService'
import { reportsService } from '../../services/reportsService'
import type {
  Equipment,
  MaintenancePlan,
  MaintenanceScheduleStatus,
  MaintenanceWorkOrder,
} from '../../types/maintenance'
import type {
  DueOverdueMaintenanceReport as DueOverdueMaintenanceReportData,
  DueOverdueMaintenanceRow,
  DueOverdueWorkOrderStatusFilter,
} from '../../types/reports'

export interface DueOverdueMaintenanceReportProps {
  onBack: () => void
}

type DueFilter = 'all' | MaintenanceScheduleStatus
type WorkOrderFilter = '' | DueOverdueWorkOrderStatusFilter

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dueBadge(status: MaintenanceScheduleStatus) {
  if (status === 'OVERDUE') return <Badge variant="destructive">Overdue</Badge>
  if (status === 'DUE_TODAY') return <Badge variant="warning">Due Today</Badge>
  return <Badge variant="neutral">Upcoming</Badge>
}

function workOrderStatusLabel(row: DueOverdueMaintenanceRow) {
  if (!row.workOrderStatus) return 'Not Created'
  if (row.workOrderStatus === 'IN_PROGRESS') return 'In Progress'
  return 'Open'
}

export function DueOverdueMaintenanceReport({ onBack }: DueOverdueMaintenanceReportProps) {
  const [equipmentId, setEquipmentId] = useState<number | ''>('')
  const [dueStatus, setDueStatus] = useState<DueFilter>('all')
  const [nextDueFrom, setNextDueFrom] = useState('')
  const [nextDueTo, setNextDueTo] = useState('')
  const [workOrderStatus, setWorkOrderStatus] = useState<WorkOrderFilter>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [report, setReport] = useState<DueOverdueMaintenanceReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null)
  const [isPlanOpen, setIsPlanOpen] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<MaintenanceWorkOrder | null>(null)
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false)

  useEffect(() => {
    maintenanceService
      .getEquipment({ size: 200, recordStatus: 'ACTIVE' })
      .then((pageData) => setEquipment(pageData.content))
      .catch(() => setEquipment([]))
  }, [])

  const filterParams = {
    equipmentId: equipmentId === '' ? undefined : equipmentId,
    dueStatus: dueStatus === 'all' ? undefined : dueStatus,
    nextDueFrom: nextDueFrom || undefined,
    nextDueTo: nextDueTo || undefined,
    workOrderStatus: workOrderStatus || undefined,
  }

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getDueOverdueMaintenance({
        ...filterParams,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load due & overdue maintenance.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filter fields listed individually
  }, [equipmentId, dueStatus, nextDueFrom, nextDueTo, workOrderStatus, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const openPlan = async (row: DueOverdueMaintenanceRow) => {
    try {
      const plan = await maintenanceService.getMaintenancePlanById(row.maintenancePlanId)
      setSelectedPlan(plan)
      setIsPlanOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open maintenance plan')
    }
  }

  const openWorkOrder = async (
    event: MouseEvent,
    row: DueOverdueMaintenanceRow
  ) => {
    event.stopPropagation()
    if (!row.workOrderId) return
    try {
      const workOrder = await maintenanceService.getWorkOrderById(row.workOrderId)
      setSelectedWorkOrder(workOrder)
      setIsWorkOrderOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open work order')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportDueOverdueMaintenanceCsv(filterParams)
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
        title="Due & Overdue Maintenance"
        description="Active preventive maintenance plans with due status and linked open work orders."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting || isLoading || !report || report.summary.maintenancePlans === 0
        }
        filters={
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-2">Due Status</p>
              <UnderlineTabs
                items={[
                  { id: 'all', label: 'All' },
                  { id: 'OVERDUE', label: 'Overdue' },
                  { id: 'DUE_TODAY', label: 'Due Today' },
                  { id: 'UPCOMING', label: 'Upcoming' },
                ]}
                value={dueStatus}
                onChange={(id) => {
                  setDueStatus(id as DueFilter)
                  setPage(0)
                }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                label="Work Order Status"
                value={workOrderStatus}
                onChange={(v) => {
                  setWorkOrderStatus(v as WorkOrderFilter)
                  setPage(0)
                }}
                options={[
                  { value: '', label: 'All' },
                  { value: 'NOT_CREATED', label: 'Not Created' },
                  { value: 'OPEN', label: 'Open' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                ]}
              />
              <DateField
                label="Next Due From"
                value={nextDueFrom}
                onChange={(e) => {
                  setNextDueFrom(e.target.value)
                  setPage(0)
                }}
              />
              <DateField
                label="Next Due To"
                value={nextDueTo}
                onChange={(e) => {
                  setNextDueTo(e.target.value)
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
                { label: 'Maintenance Plans', value: report.summary.maintenancePlans },
                { label: 'Overdue', value: report.summary.overdue },
                { label: 'Due Today', value: report.summary.dueToday },
                { label: 'Upcoming', value: report.summary.upcoming },
              ]}
            />
          ) : null
        }
        footer={
          report && report.plans.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.plans.content.length} of {report.plans.totalElements} plans
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
                  Page {page + 1} of {Math.max(1, report.plans.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= report.plans.totalPages || isLoading}
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
                <TH>Equipment / Plan</TH>
                <TH>Frequency</TH>
                <TH>Last Completed</TH>
                <TH>Next Due</TH>
                <TH>Status</TH>
                <TH>Work Order</TH>
              </tr>
            </THead>
            <TBody>
              {isLoading && !report ? (
                <TR>
                  <TD colSpan={6} className="py-14 text-center text-muted-foreground">
                    Loading due & overdue maintenance...
                  </TD>
                </TR>
              ) : !report || report.plans.content.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="py-14 text-center text-muted-foreground">
                    No active maintenance plans match the selected filters.
                  </TD>
                </TR>
              ) : (
                report.plans.content.map((row) => (
                  <TR
                    key={row.maintenancePlanId}
                    className="cursor-pointer"
                    onClick={() => void openPlan(row)}
                  >
                    <TD>
                      <div className="text-sm text-foreground">{row.equipmentName}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{row.planName}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <RefLink>{row.planNumber}</RefLink>
                        <span className="text-[11px] text-ref text-muted-foreground">
                          {row.equipmentCode}
                        </span>
                      </div>
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      Every {row.frequencyDays} days
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {formatDate(row.lastCompletedDate)}
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {formatDate(row.nextDueDate)}
                    </TD>
                    <TD>
                      <div className="space-y-1">
                        {dueBadge(row.dueStatus)}
                        {row.daysOverdue != null && (
                          <div className="text-[11px] text-destructive">
                            {row.daysOverdue}d overdue
                          </div>
                        )}
                      </div>
                    </TD>
                    <TD>
                      {row.workOrderNumber ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            className="text-ref-link cursor-pointer"
                            onClick={(e) => void openWorkOrder(e, row)}
                          >
                            {row.workOrderNumber}
                          </button>
                          <div className="text-[11px] text-muted-foreground">
                            {workOrderStatusLabel(row)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not Created</span>
                      )}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </ReportPageLayout>

      <MaintenancePlanDetailsModal
        isOpen={isPlanOpen}
        plan={selectedPlan}
        onClose={() => {
          setIsPlanOpen(false)
          setSelectedPlan(null)
        }}
        onChanged={load}
      />

      <MaintenanceWorkOrderDetailsModal
        isOpen={isWorkOrderOpen}
        workOrder={selectedWorkOrder}
        onClose={() => {
          setIsWorkOrderOpen(false)
          setSelectedWorkOrder(null)
        }}
        onChanged={load}
      />
    </>
  )
}
