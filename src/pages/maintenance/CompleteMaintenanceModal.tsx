import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DateField } from '../../components/ui/DateField'
import { Alert } from '../../components/ui/Alert'
import { cn } from '../../lib/cn'
import { maintenanceService } from '../../services/maintenanceService'
import type { MaintenanceWorkOrder } from '../../types/maintenance'

export interface CompleteMaintenanceModalProps {
  isOpen: boolean
  workOrder: MaintenanceWorkOrder | null
  onClose: () => void
  onSuccess: () => void
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function normalizeTime(value: string) {
  if (!value) return value
  return value.length === 5 ? `${value}:00` : value
}

function parseTimeParts(value?: string | null) {
  if (!value) return null
  const parts = value.split(':').map(Number)
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null
  return { h: parts[0], m: parts[1] }
}

function formatClock(h: number, m: number) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDurationHours(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hrs = Math.round((minutes / 60) * 10) / 10
  return `${hrs} hour${hrs === 1 ? '' : 's'}`
}

export function CompleteMaintenanceModal({
  isOpen,
  workOrder,
  onClose,
  onSuccess,
}: CompleteMaintenanceModalProps) {
  const [workPerformed, setWorkPerformed] = useState('')
  const [completionDate, setCompletionDate] = useState(todayIso())
  const [completionTime, setCompletionTime] = useState(nowTime())
  const [machineOperational, setMachineOperational] = useState(true)
  const [remarks, setRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !workOrder) return
    setWorkPerformed('')
    setCompletionDate(todayIso())
    setCompletionTime(nowTime())
    setMachineOperational(true)
    setRemarks('')
    setError(null)
  }, [isOpen, workOrder])

  const downtimePreview = useMemo(() => {
    if (!workOrder || workOrder.maintenanceType !== 'BREAKDOWN') return null
    if (!machineOperational || !workOrder.breakdownDate || !workOrder.breakdownTime) return null
    const start = parseTimeParts(workOrder.breakdownTime)
    const end = parseTimeParts(completionTime)
    if (!start || !end) return null
    const startMs = new Date(`${workOrder.breakdownDate}T${normalizeTime(workOrder.breakdownTime)}`).getTime()
    const endMs = new Date(`${completionDate}T${normalizeTime(completionTime)}`).getTime()
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null
    const minutes = Math.round((endMs - startMs) / 60000)
    return {
      minutes,
      label: formatDurationHours(minutes),
      range: `${formatClock(start.h, start.m)} – ${formatClock(end.h, end.m)}`,
    }
  }, [workOrder, machineOperational, completionDate, completionTime])

  if (!isOpen || !workOrder) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!workPerformed.trim()) {
      setError('Work performed is required')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await maintenanceService.completeWorkOrder(workOrder.id, {
        workPerformed: workPerformed.trim(),
        completionDate,
        completionTime: normalizeTime(completionTime),
        machineOperational,
        remarks: remarks.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete maintenance')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[520px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Complete Maintenance
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-ref text-foreground">{workOrder.workOrderNumber}</span>
              {' · '}
              {workOrder.equipmentName}
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

        <div className="w-full">
          <div className="group relative flex min-h-[6rem] w-full flex-col justify-start px-3.5 py-2 rounded-md border bg-secondary border-border/80">
            <span className="text-xs font-medium text-muted-foreground select-none leading-none">
              Work Performed *
            </span>
            <textarea
              rows={3}
              value={workPerformed}
              onChange={(e) => setWorkPerformed(e.target.value)}
              disabled={isSubmitting}
              placeholder="Replaced faulty motor and tested machine operation."
              className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DateField
            label="Completion Date *"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label="Completion Time *"
            type="time"
            value={completionTime}
            onChange={(e) => setCompletionTime(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Is the machine operational? *
          </p>
          <div className="flex items-center gap-2">
            {[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ].map((opt) => {
              const selected = machineOperational === opt.value
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setMachineOperational(opt.value)}
                  className={cn(
                    'px-3.5 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer disabled:opacity-60',
                    selected
                      ? 'bg-ink text-ink-foreground border-ink'
                      : 'bg-secondary text-muted-foreground border-border/80 hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="w-full">
          <div className="group relative flex min-h-[4.5rem] w-full flex-col justify-start px-3.5 py-2 rounded-md border bg-secondary border-border/80">
            <span className="text-xs font-medium text-muted-foreground select-none leading-none">
              Remarks
            </span>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isSubmitting}
              placeholder="Additional observations"
              className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {downtimePreview && (
          <div className="rounded-md border border-border/80 bg-secondary/50 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              Calculated downtime — breakdown
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground tracking-tight">
              {downtimePreview.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{downtimePreview.range}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Completing...' : 'Complete Maintenance'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
