import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateField } from '../../components/ui/DateField'
import { Alert } from '../../components/ui/Alert'
import { cn } from '../../lib/cn'
import { maintenanceService } from '../../services/maintenanceService'
import type {
  CreateMaintenanceWorkOrderPayload,
  Equipment,
  MaintenancePlan,
  MaintenanceWorkOrderPriority,
  MaintenanceWorkOrderType,
} from '../../types/maintenance'

export interface CreateMaintenanceWorkOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (workOrderId?: number) => void
  defaultType?: MaintenanceWorkOrderType
  defaultPlan?: MaintenancePlan | null
  defaultEquipmentId?: number | null
}

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeTime(value: string) {
  if (!value) return value
  return value.length === 5 ? `${value}:00` : value
}

export function CreateMaintenanceWorkOrderModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'BREAKDOWN',
  defaultPlan = null,
  defaultEquipmentId = null,
}: CreateMaintenanceWorkOrderModalProps) {
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceWorkOrderType>(defaultType)
  const [workOrderNumber, setWorkOrderNumber] = useState('MWO-...')
  const [workOrderDate, setWorkOrderDate] = useState(todayIso())
  const [equipmentId, setEquipmentId] = useState<number | ''>('')
  const [planId, setPlanId] = useState<number | ''>('')
  const [priority, setPriority] = useState<MaintenanceWorkOrderPriority>('MEDIUM')
  const [assignedTo, setAssignedTo] = useState('')
  const [breakdownDate, setBreakdownDate] = useState('')
  const [breakdownTime, setBreakdownTime] = useState('10:00')
  const [problemDescription, setProblemDescription] = useState('')
  const [notes, setNotes] = useState('')

  const [equipmentOptions, setEquipmentOptions] = useState<Equipment[]>([])
  const [planOptions, setPlanOptions] = useState<MaintenancePlan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!isOpen) return

    setError(null)
    setIsLoading(true)
    setMaintenanceType(defaultPlan ? 'PREVENTIVE' : defaultType)
    setWorkOrderDate(todayIso())
    setPriority('MEDIUM')
    setAssignedTo('')
    setBreakdownDate(todayIso())
    setBreakdownTime('10:00')
    setProblemDescription('')
    setNotes('')
    setPlanId(defaultPlan?.id ?? '')
    setEquipmentId(defaultPlan?.equipmentId ?? defaultEquipmentId ?? '')

    const loadEquipment = maintenanceService.getEquipment({ recordStatus: 'ACTIVE', size: 200 })
    const loadPlans = maintenanceService.getMaintenancePlans({ status: 'ACTIVE', size: 200 })
    const loadNext = maintenanceService.getNextWorkOrderNumber()

    Promise.all([loadEquipment, loadPlans, loadNext])
      .then(([equipPage, planPage, next]) => {
        if (!mounted) return
        setEquipmentOptions(equipPage.content)
        setPlanOptions(planPage.content)
        setWorkOrderNumber(next.nextCode)
        if (defaultPlan) {
          setPlanId(defaultPlan.id)
          setEquipmentId(defaultPlan.equipmentId)
          setMaintenanceType('PREVENTIVE')
        } else if (defaultEquipmentId) {
          setEquipmentId(defaultEquipmentId)
        }
      })
      .catch((err: unknown) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load form data')
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isOpen, defaultType, defaultPlan, defaultEquipmentId])

  useEffect(() => {
    if (maintenanceType !== 'PREVENTIVE' || planId === '') return
    const plan = planOptions.find((p) => p.id === planId)
    if (plan) setEquipmentId(plan.equipmentId)
  }, [planId, maintenanceType, planOptions])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (equipmentId === '') {
      setError('Equipment is required')
      return
    }
    if (maintenanceType === 'PREVENTIVE' && planId === '') {
      setError('Maintenance plan is required for preventive work orders')
      return
    }
    if (maintenanceType === 'BREAKDOWN') {
      if (!problemDescription.trim()) {
        setError('Problem description is required')
        return
      }
      if (!breakdownDate || !breakdownTime) {
        setError('Breakdown date and time are required')
        return
      }
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const payload: CreateMaintenanceWorkOrderPayload = {
        workOrderNumber: workOrderNumber.trim() || undefined,
        workOrderDate,
        maintenanceType,
        equipmentId: Number(equipmentId),
        maintenancePlanId: maintenanceType === 'PREVENTIVE' ? Number(planId) : null,
        priority,
        assignedTo: assignedTo.trim() || undefined,
        problemDescription:
          maintenanceType === 'BREAKDOWN' ? problemDescription.trim() : undefined,
        notes: notes.trim() || undefined,
        breakdownDate: maintenanceType === 'BREAKDOWN' ? breakdownDate : null,
        breakdownTime: maintenanceType === 'BREAKDOWN' ? normalizeTime(breakdownTime) : null,
      }
      const created = await maintenanceService.createWorkOrder(payload)
      onSuccess(created.id)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create work order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const plansForEquipment =
    equipmentId === ''
      ? planOptions
      : planOptions.filter((p) => p.equipmentId === equipmentId)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[640px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Maintenance / Work Orders / New
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Create Maintenance Work Order
            </h2>
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

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Maintenance Type *</p>
          <div className="flex items-center gap-2">
            {([
              { value: 'PREVENTIVE', label: 'Preventive' },
              { value: 'BREAKDOWN', label: 'Breakdown' },
            ] as const).map((opt) => {
              const selected = maintenanceType === opt.value
              const locked = Boolean(defaultPlan) && opt.value !== 'PREVENTIVE'
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isLoading || isSubmitting || locked}
                  onClick={() => setMaintenanceType(opt.value)}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Work Order Number" value={workOrderNumber} disabled />
          <DateField
            label="Work Order Date"
            value={workOrderDate}
            onChange={(e) => setWorkOrderDate(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
        </div>

        {maintenanceType === 'PREVENTIVE' ? (
          <Select
            label="Maintenance Plan *"
            value={planId === '' ? '' : planId}
            onChange={(v) => setPlanId(v ? Number(v) : '')}
            disabled={isLoading || isSubmitting || Boolean(defaultPlan)}
            placeholder="Select plan..."
            options={plansForEquipment.map((p) => ({
              value: p.id,
              label: `${p.planNumber} — ${p.planName} (${p.equipmentName})`,
            }))}
          />
        ) : null}

        <Select
          label="Equipment *"
          value={equipmentId === '' ? '' : equipmentId}
          onChange={(v) => {
            setEquipmentId(v ? Number(v) : '')
            if (maintenanceType === 'PREVENTIVE' && !defaultPlan) setPlanId('')
          }}
          disabled={
            isLoading ||
            isSubmitting ||
            Boolean(defaultPlan) ||
            (maintenanceType === 'PREVENTIVE' && planId !== '')
          }
          placeholder="Select equipment..."
          options={equipmentOptions.map((e) => ({
            value: e.id,
            label: `${e.equipmentCode} — ${e.equipmentName}`,
          }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Priority"
            value={priority}
            onChange={(v) => setPriority(v as MaintenanceWorkOrderPriority)}
            disabled={isLoading || isSubmitting}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
            ]}
          />
          <Input
            label="Assigned To"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={isLoading || isSubmitting}
            placeholder="Technician name"
          />
        </div>

        {maintenanceType === 'BREAKDOWN' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DateField
                label="Breakdown Date *"
                value={breakdownDate}
                onChange={(e) => setBreakdownDate(e.target.value)}
                disabled={isLoading || isSubmitting}
              />
              <Input
                label="Breakdown Time *"
                type="time"
                value={breakdownTime}
                onChange={(e) => setBreakdownTime(e.target.value)}
                disabled={isLoading || isSubmitting}
              />
            </div>
            <div className="w-full">
              <div className="group relative flex min-h-[6rem] w-full flex-col justify-start px-3.5 py-2 rounded-md border bg-secondary border-border/80">
                <span className="text-xs font-medium text-muted-foreground select-none leading-none">
                  Problem Description *
                </span>
                <textarea
                  rows={3}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  disabled={isLoading || isSubmitting}
                  placeholder="Motor stopped working during production."
                  className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </>
        )}

        <div className="w-full">
          <div className="group relative flex min-h-[4.5rem] w-full flex-col justify-start px-3.5 py-2 rounded-md border bg-secondary border-border/80">
            <span className="text-xs font-medium text-muted-foreground select-none leading-none">
              Notes
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading || isSubmitting}
              placeholder="Additional information"
              className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Work Order'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
