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
  CreateMaintenancePlanPayload,
  Equipment,
  MaintenancePlan,
  MaintenancePlanStatus,
  UpdateMaintenancePlanPayload,
} from '../../types/maintenance'

export interface CreateMaintenancePlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  planToEdit?: MaintenancePlan | null
  defaultEquipmentId?: number | null
}

export function CreateMaintenancePlanModal({
  isOpen,
  onClose,
  onSuccess,
  planToEdit,
  defaultEquipmentId,
}: CreateMaintenancePlanModalProps) {
  const isEditing = Boolean(planToEdit)

  const [planNumber, setPlanNumber] = useState('MP-...')
  const [planName, setPlanName] = useState('')
  const [equipmentId, setEquipmentId] = useState<number | ''>('')
  const [frequencyDays, setFrequencyDays] = useState('30')
  const [firstDueDate, setFirstDueDate] = useState('')
  const [instructions, setInstructions] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<MaintenancePlanStatus>('ACTIVE')
  const [equipmentOptions, setEquipmentOptions] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!isOpen) return

    setError(null)
    setIsLoading(true)

    const loadEquipment = maintenanceService.getEquipment({
      recordStatus: 'ACTIVE',
      size: 200,
    })

    if (planToEdit) {
      setPlanNumber(planToEdit.planNumber)
      setPlanName(planToEdit.planName)
      setEquipmentId(planToEdit.equipmentId)
      setFrequencyDays(String(planToEdit.frequencyDays))
      setFirstDueDate(planToEdit.firstDueDate)
      setInstructions(planToEdit.instructions)
      setNotes(planToEdit.notes || '')
      setStatus(planToEdit.status)

      // Include current equipment even if inactive
      Promise.all([
        loadEquipment,
        maintenanceService.getEquipmentById(planToEdit.equipmentId).catch(() => null),
      ])
        .then(([activePage, current]) => {
          if (!mounted) return
          const map = new Map<number, Equipment>()
          activePage.content.forEach((e) => map.set(e.id, e))
          if (current) map.set(current.id, current)
          setEquipmentOptions(Array.from(map.values()))
        })
        .catch((err: unknown) => {
          if (mounted) setError(err instanceof Error ? err.message : 'Failed to load equipment')
        })
        .finally(() => {
          if (mounted) setIsLoading(false)
        })

      return () => {
        mounted = false
      }
    }

    setPlanName('')
    setFrequencyDays('30')
    setFirstDueDate('')
    setInstructions('')
    setNotes('')
    setStatus('ACTIVE')
    setEquipmentId(defaultEquipmentId ?? '')

    Promise.all([loadEquipment, maintenanceService.getNextPlanNumber()])
      .then(([equipPage, next]) => {
        if (!mounted) return
        setEquipmentOptions(equipPage.content)
        setPlanNumber(next.nextCode)
        if (defaultEquipmentId) setEquipmentId(defaultEquipmentId)
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
  }, [isOpen, planToEdit, defaultEquipmentId])

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!planName.trim()) {
      setError('Plan name is required.')
      return
    }
    if (equipmentId === '') {
      setError('Equipment is required.')
      return
    }
    const freq = Number(frequencyDays)
    if (!Number.isInteger(freq) || freq <= 0) {
      setError('Frequency must be a whole number greater than zero.')
      return
    }
    if (!firstDueDate) {
      setError('First due date is required.')
      return
    }
    if (!instructions.trim()) {
      setError('Maintenance instructions are required.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      if (isEditing && planToEdit) {
        const payload: UpdateMaintenancePlanPayload = {
          planName: planName.trim(),
          equipmentId: Number(equipmentId),
          frequencyDays: freq,
          firstDueDate,
          instructions: instructions.trim(),
          notes: notes.trim() || null,
          status,
        }
        await maintenanceService.updateMaintenancePlan(planToEdit.id, payload)
      } else {
        const payload: CreateMaintenancePlanPayload = {
          planNumber: planNumber.trim() || undefined,
          planName: planName.trim(),
          equipmentId: Number(equipmentId),
          frequencyDays: freq,
          firstDueDate,
          instructions: instructions.trim(),
          notes: notes.trim() || undefined,
          status,
        }
        await maintenanceService.createMaintenancePlan(payload)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save maintenance plan.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
              Maintenance / Maintenance Plans / {isEditing ? planNumber : 'New'}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {isEditing ? 'Edit Maintenance Plan' : 'Create Maintenance Plan'}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Plan Number" value={planNumber} disabled />
          <Input
            label="Plan Name *"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            disabled={isLoading || isSubmitting}
            placeholder="Routine Lubrication"
          />
        </div>

        <Select
          label="Equipment *"
          value={equipmentId === '' ? '' : equipmentId}
          onChange={(v) => setEquipmentId(v ? Number(v) : '')}
          disabled={isLoading || isSubmitting}
          placeholder="Select equipment..."
          options={equipmentOptions.map((e) => ({
            value: e.id,
            label: `${e.equipmentCode} — ${e.equipmentName}`,
          }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Frequency (Days) *"
            type="number"
            min={1}
            step={1}
            value={frequencyDays}
            onChange={(e) => setFrequencyDays(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
          <DateField
            label="First Due Date *"
            value={firstDueDate}
            onChange={(e) => setFirstDueDate(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="w-full">
          <div className="group relative flex min-h-[7rem] w-full flex-col justify-start px-3.5 py-2 rounded-md border bg-secondary border-border/80">
            <span className="text-xs font-medium text-muted-foreground select-none leading-none">
              Maintenance Instructions *
            </span>
            <textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isLoading || isSubmitting}
              placeholder={'1. Clean the machine.\n2. Lubricate moving components.\n3. Inspect bearings.\n4. Verify machine operation.'}
              className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none disabled:cursor-not-allowed"
            />
          </div>
        </div>

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
              placeholder="Additional instructions..."
              className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
          <div className="flex items-center gap-2">
            {([
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ] as const).map((opt) => {
              const selected = status === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isLoading || isSubmitting}
                  onClick={() => setStatus(opt.value)}
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

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
