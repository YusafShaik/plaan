import { useEffect, useState } from 'react'
import { Cog, Edit, Plus, Power, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { CreateMaintenancePlanModal } from './CreateMaintenancePlanModal'
import { MaintenanceWorkOrderDetailsModal } from './MaintenanceWorkOrderDetailsModal'
import { maintenanceService } from '../../services/maintenanceService'
import type {
  Equipment,
  EquipmentMaintenanceHistoryItem,
  EquipmentOperationalStatus,
  MaintenancePlan,
  MaintenanceScheduleStatus,
  MaintenanceWorkOrder,
  MaintenanceWorkOrderType,
} from '../../types/maintenance'

export interface EquipmentDetailsModalProps {
  isOpen: boolean
  equipment: Equipment | null
  onClose: () => void
  onEdit?: (equipment: Equipment) => void
  onChanged?: () => void
}

const OPS_LABEL: Record<EquipmentOperationalStatus, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under Maintenance',
  BREAKDOWN: 'Breakdown',
}

const SCHEDULE_LABEL: Record<MaintenanceScheduleStatus, string> = {
  UPCOMING: 'Upcoming',
  DUE_TODAY: 'Due Today',
  OVERDUE: 'Overdue',
}

function operationalBadge(status: EquipmentOperationalStatus) {
  if (status === 'OPERATIONAL') return <Badge variant="success">{OPS_LABEL[status]}</Badge>
  if (status === 'UNDER_MAINTENANCE') return <Badge variant="warning">{OPS_LABEL[status]}</Badge>
  return <Badge variant="destructive">{OPS_LABEL[status]}</Badge>
}

function scheduleBadge(status: MaintenanceScheduleStatus) {
  if (status === 'OVERDUE') return <Badge variant="destructive">{SCHEDULE_LABEL[status]}</Badge>
  if (status === 'DUE_TODAY') return <Badge variant="warning">{SCHEDULE_LABEL[status]}</Badge>
  return <Badge variant="success">{SCHEDULE_LABEL[status]}</Badge>
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function EquipmentDetailsModal({
  isOpen,
  equipment,
  onClose,
  onEdit,
  onChanged,
}: EquipmentDetailsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [history, setHistory] = useState<EquipmentMaintenanceHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false)
  const [historyWorkOrder, setHistoryWorkOrder] = useState<MaintenanceWorkOrder | null>(null)
  const [isHistoryWoOpen, setIsHistoryWoOpen] = useState(false)

  const TYPE_LABEL: Record<MaintenanceWorkOrderType, string> = {
    PREVENTIVE: 'Preventive',
    BREAKDOWN: 'Breakdown',
  }

  const loadPlans = (equipmentId: number) => {
    setPlansLoading(true)
    maintenanceService
      .getMaintenancePlansByEquipment(equipmentId)
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false))
  }

  const loadHistory = (equipmentId: number) => {
    setHistoryLoading(true)
    maintenanceService
      .getEquipmentMaintenanceHistory(equipmentId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }

  useEffect(() => {
    if (!isOpen || !equipment) {
      setPlans([])
      setHistory([])
      return
    }
    loadPlans(equipment.id)
    loadHistory(equipment.id)
  }, [isOpen, equipment])

  const formatDuration = (minutes?: number | null) => {
    if (minutes == null) return '—'
    if (minutes < 60) return `${minutes} min`
    const hrs = Math.round((minutes / 60) * 10) / 10
    return `${hrs} hr${hrs === 1 ? '' : 's'}`
  }

  const formatHistoryDate = (value: string) => {
    const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''))
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  const openHistoryWorkOrder = async (workOrderId: number) => {
    try {
      const wo = await maintenanceService.getWorkOrderById(workOrderId)
      setHistoryWorkOrder(wo)
      setIsHistoryWoOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open work order')
    }
  }

  if (!isOpen || !equipment) return null

  const run = async (action: () => Promise<unknown>) => {
    setIsProcessing(true)
    setError(null)
    try {
      await action()
      onChanged?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className="!max-w-[640px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
      >
        <div className="space-y-5">
          <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border/80 bg-secondary text-muted-foreground shrink-0">
                <Cog className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {equipment.equipmentName}
                  </h2>
                  {operationalBadge(equipment.operationalStatus)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="text-ref text-foreground">{equipment.equipmentCode}</span>
                  {equipment.location ? ` · ${equipment.location}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <MetaRow label="Manufacturer" value={equipment.manufacturer || '—'} />
            <MetaRow label="Model Number" value={equipment.modelNumber || '—'} />
            <MetaRow label="Serial Number" value={equipment.serialNumber || '—'} />
            <MetaRow label="Installation Date" value={formatDate(equipment.installationDate)} />
            <MetaRow label="Location" value={equipment.location || '—'} />
            <MetaRow
              label="Record Status"
              value={equipment.recordStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
            />
          </div>

          {equipment.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Description</p>
              <p className="mt-1 text-sm text-foreground">{equipment.description}</p>
            </div>
          )}

          <section className="space-y-2 border-t border-border/80 pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Maintenance Plans</h3>
              {equipment.recordStatus === 'ACTIVE' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setIsCreatePlanOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Plan
                </Button>
              )}
            </div>
            {plansLoading ? (
              <div className="rounded-md border border-border/80 bg-secondary/40 px-4 py-6 text-center text-xs text-muted-foreground">
                Loading plans...
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-md border border-border/80 bg-secondary/40 px-4 py-6 text-center text-xs text-muted-foreground">
                No maintenance plans configured.
              </div>
            ) : (
              <div className="space-y-2">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/80 bg-card px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{plan.planName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Every {plan.frequencyDays} days · Next {formatDate(plan.nextDueDate)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {plan.status === 'ACTIVE' ? (
                        scheduleBadge(plan.scheduleStatus)
                      ) : (
                        <Badge variant="neutral">Inactive</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Maintenance History</h3>
            {historyLoading ? (
              <div className="rounded-md border border-border/80 bg-secondary/40 px-4 py-6 text-center text-xs text-muted-foreground">
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-md border border-border/80 bg-secondary/40 px-4 py-6 text-center text-xs text-muted-foreground">
                No maintenance records available.
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-border/80">
                <Table className="border-0 rounded-none shadow-none bg-transparent">
                  <THead>
                    <tr>
                      <TH>Date</TH>
                      <TH>Activity</TH>
                      <TH>Type</TH>
                      <TH>Duration</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {history.map((item) => (
                      <TR
                        key={item.workOrderId}
                        className="cursor-pointer"
                        onClick={() => void openHistoryWorkOrder(item.workOrderId)}
                      >
                        <TD className="text-xs text-muted-foreground">
                          {formatHistoryDate(item.date)}
                        </TD>
                        <TD>
                          <div className="text-sm text-foreground">{item.activity}</div>
                          <RefLink className="text-xs">{item.workOrderNumber}</RefLink>
                        </TD>
                        <TD className="text-xs text-muted-foreground">
                          {TYPE_LABEL[item.type]}
                        </TD>
                        <TD className="text-xs text-muted-foreground">
                          {formatDuration(item.durationMinutes)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </section>

          <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
            {equipment.recordStatus === 'ACTIVE' ? (
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={() =>
                  run(() => maintenanceService.deactivateEquipment(equipment.id))
                }
                className="gap-1.5"
              >
                <Power className="h-3.5 w-3.5" />
                Deactivate
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={() =>
                  run(() => maintenanceService.activateEquipment(equipment.id))
                }
                className="gap-1.5"
              >
                <Power className="h-3.5 w-3.5" />
                Activate
              </Button>
            )}
            {onEdit && (
              <Button
                type="button"
                variant="primary"
                disabled={isProcessing}
                onClick={() => {
                  onClose()
                  onEdit(equipment)
                }}
                className="gap-1.5"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <CreateMaintenancePlanModal
        isOpen={isCreatePlanOpen}
        defaultEquipmentId={equipment.id}
        onClose={() => setIsCreatePlanOpen(false)}
        onSuccess={() => {
          loadPlans(equipment.id)
          onChanged?.()
        }}
      />

      <MaintenanceWorkOrderDetailsModal
        isOpen={isHistoryWoOpen}
        workOrder={historyWorkOrder}
        onClose={() => {
          setIsHistoryWoOpen(false)
          setHistoryWorkOrder(null)
        }}
        onChanged={() => {
          if (equipment) loadHistory(equipment.id)
          onChanged?.()
        }}
      />
    </>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
