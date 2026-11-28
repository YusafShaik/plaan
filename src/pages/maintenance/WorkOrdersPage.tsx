import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Wrench,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Alert } from '../../components/ui/Alert'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
import { CreateMaintenanceWorkOrderModal } from './CreateMaintenanceWorkOrderModal'
import { MaintenanceWorkOrderDetailsModal } from './MaintenanceWorkOrderDetailsModal'
import { maintenanceService } from '../../services/maintenanceService'
import type {
  MaintenanceWorkOrder,
  MaintenanceWorkOrderStatus,
  MaintenanceWorkOrderSummary,
  MaintenanceWorkOrderType,
} from '../../types/maintenance'
import type { PageResponse } from '../../types/masterData'

const STATUS_LABEL: Record<MaintenanceWorkOrderStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const TYPE_LABEL: Record<MaintenanceWorkOrderType, string> = {
  PREVENTIVE: 'Preventive',
  BREAKDOWN: 'Breakdown',
}

function statusBadge(status: MaintenanceWorkOrderStatus) {
  if (status === 'COMPLETED') return <Badge variant="success">{STATUS_LABEL[status]}</Badge>
  if (status === 'IN_PROGRESS') return <Badge variant="warning">{STATUS_LABEL[status]}</Badge>
  if (status === 'CANCELLED') return <Badge variant="neutral">{STATUS_LABEL[status]}</Badge>
  return <Badge variant="neutral">{STATUS_LABEL[status]}</Badge>
}

export interface WorkOrdersPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
}

export function WorkOrdersPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
}: WorkOrdersPageProps = {}) {
  const [orders, setOrders] = useState<MaintenanceWorkOrder[]>([])
  const [pageData, setPageData] = useState<PageResponse<MaintenanceWorkOrder> | null>(null)
  const [summary, setSummary] = useState<MaintenanceWorkOrderSummary | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MaintenanceWorkOrderStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<MaintenanceWorkOrderType | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isCreateOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsCreateOpen = setControlledModalOpen || setInternalModalOpen
  const [selected, setSelected] = useState<MaintenanceWorkOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const loadSummary = useCallback(() => {
    maintenanceService
      .getWorkOrderSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const load = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)
      maintenanceService
        .getWorkOrders({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          page,
          size: pageSize,
        })
        .then((res) => {
          setOrders(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load work orders.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, typeFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      load(0)
      loadSummary()
    }, 250)
    return () => clearTimeout(timer)
  }, [load, loadSummary])

  const openDetails = (wo: MaintenanceWorkOrder) => {
    setSelected(wo)
    setIsDetailsOpen(true)
  }

  const refreshAll = () => {
    load(currentPage)
    loadSummary()
  }

  const hasFilters = Boolean(search || statusFilter || typeFilter)

  return (
    <div className="space-y-6">
      <KpiCardGrid columns={3}>
        <KpiCard label="Open" value={summary?.openCount ?? 0} />
        <KpiCard
          label="In Progress"
          value={summary?.inProgressCount ?? 0}
        />
        <KpiCard
          label="Completed"
          value={summary?.completedCount ?? 0}
        />
      </KpiCardGrid>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search work orders..."
          />
          <NativeSelect
            dense
            className="w-auto min-w-[9rem]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MaintenanceWorkOrderStatus | '')}
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </NativeSelect>
          <NativeSelect
            dense
            className="w-auto min-w-[9rem]"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MaintenanceWorkOrderType | '')}
          >
            <option value="">All types</option>
            <option value="PREVENTIVE">Preventive</option>
            <option value="BREAKDOWN">Breakdown</option>
          </NativeSelect>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setTypeFilter('')
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ml-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <Table className="border-0 rounded-none shadow-none bg-transparent" tableClassName="table-fixed">
          <THead>
            <tr>
              <TH className="w-[22%]">Reference</TH>
              <TH className="w-[30%]">Equipment</TH>
              <TH className="w-[18%]">Type</TH>
              <TH className="w-[16%]">Status</TH>
              <TH className="w-[14%] text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && orders.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-16 text-center text-muted-foreground">
                  Loading work orders...
                </TD>
              </TR>
            ) : orders.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Wrench className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No work orders found.</p>
                    <p className="text-xs text-muted-foreground">
                      Create a breakdown work order or start one from a maintenance plan.
                    </p>
                  </div>
                </TD>
              </TR>
            ) : (
              orders.map((wo) => (
                <TR
                  key={wo.id}
                  className="cursor-pointer"
                  onClick={() => openDetails(wo)}
                >
                  <TD>
                    <RefLink>{wo.workOrderNumber}</RefLink>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[14rem]">
                      {wo.activityName}
                    </div>
                  </TD>
                  <TD className="text-sm text-foreground">{wo.equipmentName}</TD>
                  <TD className="text-sm text-foreground">
                    {TYPE_LABEL[wo.maintenanceType]}
                  </TD>
                  <TD>{statusBadge(wo.status)}</TD>
                  <TD className="text-right">
                    <div
                      className="inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="View"
                        onClick={() => openDetails(wo)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>

      {pageData && orders.length > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <div>
            Showing {orders.length} of {pageData.totalElements} work orders
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
              Prev
            </Button>
            <span>
              Page {currentPage + 1} of {Math.max(1, pageData.totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(currentPage + 1)}
              disabled={currentPage + 1 >= pageData.totalPages}
              className="h-8 gap-1 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <CreateMaintenanceWorkOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(id) => {
          refreshAll()
          if (id) {
            maintenanceService.getWorkOrderById(id).then((wo) => {
              setSelected(wo)
              setIsDetailsOpen(true)
            })
          }
        }}
      />

      <MaintenanceWorkOrderDetailsModal
        isOpen={isDetailsOpen}
        workOrder={selected}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelected(null)
        }}
        onChanged={refreshAll}
      />
    </div>
  )
}
