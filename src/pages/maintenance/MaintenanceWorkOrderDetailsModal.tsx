import { useEffect, useState } from 'react'
import { Play, CheckCircle2, X, Ban } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { CompleteMaintenanceModal } from './CompleteMaintenanceModal'
import { maintenanceService } from '../../services/maintenanceService'
import type {
  MaintenanceWorkOrder,
  MaintenanceWorkOrderPriority,
  MaintenanceWorkOrderStatus,
  MaintenanceWorkOrderType,
} from '../../types/maintenance'

export interface MaintenanceWorkOrderDetailsModalProps {
  isOpen: boolean
  workOrder: MaintenanceWorkOrder | null
  onClose: () => void
  onChanged?: () => void
}

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

const PRIORITY_LABEL: Record<MaintenanceWorkOrderPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

function statusBadge(status: MaintenanceWorkOrderStatus) {
  if (status === 'COMPLETED') return <Badge variant="success">{STATUS_LABEL[status]}</Badge>
  if (status === 'IN_PROGRESS') return <Badge variant="warning">{STATUS_LABEL[status]}</Badge>
  if (status === 'CANCELLED') return <Badge variant="neutral">{STATUS_LABEL[status]}</Badge>
  return <Badge variant="neutral">{STATUS_LABEL[status]}</Badge>
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value.length === 10 ? value + 'T00:00:00' : value)
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
  if (minutes < 60) return `${minutes} min`
  const hrs = Math.round((minutes / 60) * 10) / 10
  return `${hrs} hr${hrs === 1 ? '' : 's'}`
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  const parts = value.split(':')
  if (parts.length < 2) return value
  const d = new Date()
  d.setHours(Number(parts[0]), Number(parts[1]), 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function MaintenanceWorkOrderDetailsModal({
  isOpen,
  workOrder,
  onClose,
  onChanged,
}: MaintenanceWorkOrderDetailsModalProps) {
  const [current, setCurrent] = useState<MaintenanceWorkOrder | null>(workOrder)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCompleteOpen, setIsCompleteOpen] = useState(false)

  useEffect(() => {
    if (isOpen && workOrder) setCurrent(workOrder)
    if (!isOpen) {
      setError(null)
      setIsCompleteOpen(false)
    }
  }, [isOpen, workOrder])

  if (!isOpen || !current) return null

  const readOnly = current.status === 'COMPLETED' || current.status === 'CANCELLED'

  const refresh = async () => {
    const fresh = await maintenanceService.getWorkOrderById(current.id)
    setCurrent(fresh)
    onChanged?.()
  }

  const run = async (action: () => Promise<unknown>) => {
    setIsProcessing(true)
    setError(null)
    try {
      await action()
      await refresh()
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
                Maintenance / Work Orders / {current.workOrderNumber}
              </p>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {current.activityName}
                </h2>
                {statusBadge(current.status)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="text-ref text-foreground">{current.equipmentCode}</span>
                {' · '}
                {current.equipmentName}
                {' · '}
                {TYPE_LABEL[current.maintenanceType]}
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
            <MetaRow label="Work Order Number" value={current.workOrderNumber} />
            <MetaRow label="Work Order Date" value={formatDate(current.workOrderDate)} />
            <MetaRow label="Type" value={TYPE_LABEL[current.maintenanceType]} />
            <MetaRow label="Priority" value={PRIORITY_LABEL[current.priority]} />
            <MetaRow label="Assigned To" value={current.assignedTo || '—'} />
            {current.planNumber && (
              <MetaRow
                label="Maintenance Plan"
                value={`${current.planNumber} — ${current.planName || ''}`}
              />
            )}
            {current.maintenanceType === 'BREAKDOWN' && (
              <>
                <MetaRow label="Breakdown Date" value={formatDate(current.breakdownDate)} />
                <MetaRow label="Breakdown Time" value={formatTime(current.breakdownTime)} />
              </>
            )}
            <MetaRow label="Started" value={formatDateTime(current.actualStartAt)} />
            <MetaRow label="Completed" value={formatDateTime(current.actualEndAt)} />
            <MetaRow label="Duration" value={formatDuration(current.durationMinutes)} />
            {current.maintenanceType === 'BREAKDOWN' && (
              <MetaRow
                label="Downtime"
                value={
                  current.downtimeMinutes != null
                    ? formatDuration(current.downtimeMinutes)
                    : current.status === 'COMPLETED' && current.machineOperational === false
                      ? 'Ongoing'
                      : '—'
                }
              />
            )}
          </div>

          {current.problemDescription && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {current.maintenanceType === 'BREAKDOWN' ? 'Problem Description' : 'Activity'}
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {current.problemDescription}
              </p>
            </div>
          )}

          {current.instructions && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Maintenance Instructions
              </p>
              <div className="rounded-md border border-border/80 bg-secondary/40 px-3.5 py-3 text-sm text-foreground whitespace-pre-wrap">
                {current.instructions}
              </div>
            </div>
          )}

          {current.workPerformed && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Work Performed</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{current.workPerformed}</p>
            </div>
          )}

          {current.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{current.notes}</p>
            </div>
          )}

          {current.completionRemarks && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Remarks</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {current.completionRemarks}
              </p>
            </div>
          )}

          {!readOnly && (
            <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
              {current.status === 'OPEN' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isProcessing}
                    onClick={() => run(() => maintenanceService.cancelWorkOrder(current.id))}
                    className="gap-1.5"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isProcessing}
                    onClick={() => run(() => maintenanceService.startWorkOrder(current.id))}
                    className="gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Start Maintenance
                  </Button>
                </>
              )}
              {current.status === 'IN_PROGRESS' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={isProcessing}
                  onClick={() => setIsCompleteOpen(true)}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete Maintenance
                </Button>
              )}
            </div>
          )}
        </div>
      </Modal>

      <CompleteMaintenanceModal
        isOpen={isCompleteOpen}
        workOrder={current}
        onClose={() => setIsCompleteOpen(false)}
        onSuccess={() => {
          void refresh()
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
