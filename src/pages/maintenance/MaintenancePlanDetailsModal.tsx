import { useState } from 'react'
import { Edit, Plus, Power, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { CreateMaintenanceWorkOrderModal } from './CreateMaintenanceWorkOrderModal'
import { maintenanceService } from '../../services/maintenanceService'
import type { MaintenancePlan, MaintenanceScheduleStatus } from '../../types/maintenance'

export interface MaintenancePlanDetailsModalProps {
  isOpen: boolean
  plan: MaintenancePlan | null
  onClose: () => void
  onEdit?: (plan: MaintenancePlan) => void
  onChanged?: () => void
}

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

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function MaintenancePlanDetailsModal({
  isOpen,
  plan,
  onClose,
  onEdit,
  onChanged,
}: MaintenancePlanDetailsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreateWoOpen, setIsCreateWoOpen] = useState(false)

  if (!isOpen || !plan) return null

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
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Maintenance / Maintenance Plans / {plan.planNumber}
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {plan.planName}
              </h2>
              {plan.status === 'ACTIVE' ? (
                scheduleBadge(plan.scheduleStatus)
              ) : (
                <Badge variant="neutral">Inactive</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-ref text-foreground">{plan.equipmentCode}</span>
              {' · '}
              {plan.equipmentName}
            </p>
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
          <MetaRow label="Plan Number" value={plan.planNumber} />
          <MetaRow label="Frequency" value={`Every ${plan.frequencyDays} days`} />
          <MetaRow label="First Due Date" value={formatDate(plan.firstDueDate)} />
          <MetaRow label="Next Due Date" value={formatDate(plan.nextDueDate)} />
          <MetaRow label="Last Completed" value={formatDate(plan.lastCompletedDate)} />
          <MetaRow
            label="Plan Status"
            value={plan.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          />
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Maintenance Instructions
          </p>
          <div className="rounded-md border border-border/80 bg-secondary/40 px-3.5 py-3 text-sm text-foreground whitespace-pre-wrap">
            {plan.instructions}
          </div>
        </div>

        {plan.notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{plan.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
          {plan.status === 'ACTIVE' ? (
            <Button
              type="button"
              variant="outline"
              disabled={isProcessing}
              onClick={() =>
                run(() => maintenanceService.deactivateMaintenancePlan(plan.id))
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
                run(() => maintenanceService.activateMaintenancePlan(plan.id))
              }
              className="gap-1.5"
            >
              <Power className="h-3.5 w-3.5" />
              Activate
            </Button>
          )}
          {plan.status === 'ACTIVE' && (
            <Button
              type="button"
              variant="outline"
              disabled={isProcessing}
              onClick={() => setIsCreateWoOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Work Order
            </Button>
          )}
          {onEdit && (
            <Button
              type="button"
              variant="primary"
              disabled={isProcessing}
              onClick={() => {
                onClose()
                onEdit(plan)
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

    <CreateMaintenanceWorkOrderModal
      isOpen={isCreateWoOpen}
      defaultType="PREVENTIVE"
      defaultPlan={plan}
      onClose={() => setIsCreateWoOpen(false)}
      onSuccess={() => {
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
