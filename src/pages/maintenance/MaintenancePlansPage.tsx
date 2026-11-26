import { useCallback, useEffect, useState } from 'react'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Alert } from '../../components/ui/Alert'
import { CreateMaintenancePlanModal } from './CreateMaintenancePlanModal'
import { MaintenancePlanDetailsModal } from './MaintenancePlanDetailsModal'
import { maintenanceService } from '../../services/maintenanceService'
import type {
  MaintenancePlan,
  MaintenancePlanStatus,
  MaintenanceScheduleStatus,
} from '../../types/maintenance'
import type { PageResponse } from '../../types/masterData'

const SCHEDULE_LABEL: Record<MaintenanceScheduleStatus, string> = {
  UPCOMING: 'Upcoming',
  DUE_TODAY: 'Due Today',
  OVERDUE: 'Overdue',
}

function scheduleBadge(status: MaintenanceScheduleStatus) {
  if (status === 'OVERDUE') return <Badge variant="destructive">{SCHEDULE_LABEL[status]}</Badge>
  if (status === 'DUE_TODAY') return <Badge variant="warning">{SCHEDULE_LABEL[status]}</Badge>
  return <Badge variant="success">{SCHEDULE_LABEL[status]}</Badge>
}

function formatDueDate(value: string) {
  const d = new Date(value + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export function MaintenancePlansPage() {
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [pageData, setPageData] = useState<PageResponse<MaintenancePlan> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MaintenancePlanStatus | ''>('ACTIVE')
  const [scheduleFilter, setScheduleFilter] = useState<MaintenanceScheduleStatus | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [planToEdit, setPlanToEdit] = useState<MaintenancePlan | null>(null)
  const [selected, setSelected] = useState<MaintenancePlan | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const load = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)
      maintenanceService
        .getMaintenancePlans({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          scheduleStatus: scheduleFilter || undefined,
          page,
          size: pageSize,
        })
        .then((res) => {
          setPlans(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load maintenance plans.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, scheduleFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => load(0), 250)
    return () => clearTimeout(timer)
  }, [load])

  const openDetails = (plan: MaintenancePlan) => {
    setSelected(plan)
    setIsDetailsOpen(true)
  }

  const hasFilters = Boolean(search || scheduleFilter || statusFilter !== 'ACTIVE')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search plans or equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>
          <NativeSelect
            dense
            className="w-auto min-w-[9rem]"
            value={scheduleFilter}
            onChange={(e) =>
              setScheduleFilter(e.target.value as MaintenanceScheduleStatus | '')
            }
          >
            <option value="">All Schedules</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DUE_TODAY">Due Today</option>
            <option value="UPCOMING">Upcoming</option>
          </NativeSelect>
          <NativeSelect
            dense
            className="w-auto min-w-[8.5rem]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MaintenancePlanStatus | '')}
          >
            <option value="">All Plans</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </NativeSelect>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setScheduleFilter('')
                setStatusFilter('ACTIVE')
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ml-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setPlanToEdit(null)
            setIsCreateOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <Table className="border-0 rounded-none shadow-none bg-transparent">
          <THead>
            <tr>
              <TH>Activity</TH>
              <TH>Equipment</TH>
              <TH>Frequency</TH>
              <TH>Next Due</TH>
              <TH>Schedule</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && plans.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-16 text-center text-muted-foreground">
                  Loading maintenance plans...
                </TD>
              </TR>
            ) : plans.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarClock className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No maintenance plans found.</p>
                    <p className="text-xs text-muted-foreground">
                      Configure recurring maintenance activities for your equipment.
                    </p>
                  </div>
                </TD>
              </TR>
            ) : (
              plans.map((plan) => (
                <TR
                  key={plan.id}
                  className="cursor-pointer"
                  onClick={() => openDetails(plan)}
                >
                  <TD>
                    <div className="text-sm font-medium text-foreground">{plan.planName}</div>
                    <RefLink className="text-[11px]">{plan.planNumber}</RefLink>
                  </TD>
                  <TD>
                    <div className="text-sm text-foreground">{plan.equipmentName}</div>
                    <div className="text-[11px] text-ref text-muted-foreground">
                      {plan.equipmentCode}
                    </div>
                  </TD>
                  <TD className="text-xs text-muted-foreground">{plan.frequencyDays} days</TD>
                  <TD className="font-mono text-xs tabular-nums">
                    {formatDueDate(plan.nextDueDate)}
                  </TD>
                  <TD>
                    {plan.status === 'ACTIVE' ? (
                      scheduleBadge(plan.scheduleStatus)
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <div
                      className="inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="View"
                        onClick={() => openDetails(plan)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => {
                          setPlanToEdit(plan)
                          setIsCreateOpen(true)
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>

      {pageData && plans.length > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <div>
            Showing {plans.length} of {pageData.totalElements} plans
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(currentPage - 1)}
              disabled={currentPage === 0}
              className="h-8 gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="px-2 text-foreground font-medium">
              Page {pageData.page + 1} of {pageData.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(currentPage + 1)}
              disabled={currentPage >= pageData.totalPages - 1}
              className="h-8 gap-1 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <CreateMaintenancePlanModal
        isOpen={isCreateOpen}
        planToEdit={planToEdit}
        onClose={() => {
          setIsCreateOpen(false)
          setPlanToEdit(null)
        }}
        onSuccess={() => load(currentPage)}
      />

      <MaintenancePlanDetailsModal
        isOpen={isDetailsOpen}
        plan={selected}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelected(null)
        }}
        onEdit={(plan) => {
          setPlanToEdit(plan)
          setIsCreateOpen(true)
        }}
        onChanged={() => load(currentPage)}
      />
    </div>
  )
}
