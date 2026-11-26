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
  CreateEquipmentPayload,
  Equipment,
  EquipmentOperationalStatus,
  EquipmentRecordStatus,
  UpdateEquipmentPayload,
} from '../../types/maintenance'

export interface CreateEquipmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  equipmentToEdit?: Equipment | null
}

const OPERATIONAL_OPTIONS = [
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
  { value: 'BREAKDOWN', label: 'Breakdown' },
]

export function CreateEquipmentModal({
  isOpen,
  onClose,
  onSuccess,
  equipmentToEdit,
}: CreateEquipmentModalProps) {
  const isEditing = Boolean(equipmentToEdit)

  const [equipmentCode, setEquipmentCode] = useState('EQ-...')
  const [equipmentName, setEquipmentName] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [modelNumber, setModelNumber] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [location, setLocation] = useState('')
  const [installationDate, setInstallationDate] = useState('')
  const [description, setDescription] = useState('')
  const [operationalStatus, setOperationalStatus] =
    useState<EquipmentOperationalStatus>('OPERATIONAL')
  const [recordStatus, setRecordStatus] = useState<EquipmentRecordStatus>('ACTIVE')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!isOpen) return

    setError(null)

    if (equipmentToEdit) {
      setEquipmentCode(equipmentToEdit.equipmentCode)
      setEquipmentName(equipmentToEdit.equipmentName)
      setManufacturer(equipmentToEdit.manufacturer || '')
      setModelNumber(equipmentToEdit.modelNumber || '')
      setSerialNumber(equipmentToEdit.serialNumber || '')
      setLocation(equipmentToEdit.location || '')
      setInstallationDate(equipmentToEdit.installationDate || '')
      setDescription(equipmentToEdit.description || '')
      setOperationalStatus(equipmentToEdit.operationalStatus)
      setRecordStatus(equipmentToEdit.recordStatus)
      setIsLoading(false)
      return
    }

    setEquipmentName('')
    setManufacturer('')
    setModelNumber('')
    setSerialNumber('')
    setLocation('')
    setInstallationDate('')
    setDescription('')
    setOperationalStatus('OPERATIONAL')
    setRecordStatus('ACTIVE')
    setIsLoading(true)

    maintenanceService
      .getNextEquipmentCode()
      .then((res) => {
        if (mounted) setEquipmentCode(res.nextCode)
      })
      .catch((err: unknown) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load next code')
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isOpen, equipmentToEdit])

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!equipmentName.trim()) {
      setError('Equipment name is required.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      if (isEditing && equipmentToEdit) {
        const payload: UpdateEquipmentPayload = {
          equipmentName: equipmentName.trim(),
          manufacturer: manufacturer.trim() || null,
          modelNumber: modelNumber.trim() || null,
          serialNumber: serialNumber.trim() || null,
          location: location.trim() || null,
          installationDate: installationDate || null,
          description: description.trim() || null,
          operationalStatus,
          recordStatus,
        }
        await maintenanceService.updateEquipment(equipmentToEdit.id, payload)
      } else {
        const payload: CreateEquipmentPayload = {
          equipmentCode: equipmentCode.trim() || undefined,
          equipmentName: equipmentName.trim(),
          manufacturer: manufacturer.trim() || undefined,
          modelNumber: modelNumber.trim() || undefined,
          serialNumber: serialNumber.trim() || undefined,
          location: location.trim() || undefined,
          installationDate: installationDate || null,
          description: description.trim() || undefined,
          operationalStatus,
          recordStatus,
        }
        await maintenanceService.createEquipment(payload)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save equipment.')
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
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Maintenance / Equipment / {isEditing ? equipmentCode : 'New'}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {isEditing ? 'Edit Equipment' : 'Register Equipment'}
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
          <Input
            label="Equipment Code *"
            value={equipmentCode}
            onChange={(e) => setEquipmentCode(e.target.value)}
            disabled={isLoading || isSubmitting || isEditing}
          />
          <Input
            label="Equipment Name *"
            value={equipmentName}
            onChange={(e) => setEquipmentName(e.target.value)}
            disabled={isLoading || isSubmitting}
            placeholder="Wood Cutting Machine"
          />
          <Input
            label="Manufacturer"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            disabled={isLoading || isSubmitting}
            placeholder="Manufacturer name"
          />
          <Input
            label="Model Number"
            value={modelNumber}
            onChange={(e) => setModelNumber(e.target.value)}
            disabled={isLoading || isSubmitting}
            placeholder="Machine model"
          />
          <Input
            label="Serial Number"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            disabled={isLoading || isSubmitting}
            placeholder="Machine serial number"
          />
          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isLoading || isSubmitting}
            placeholder="Cutting Area"
          />
          <DateField
            label="Installation Date"
            value={installationDate}
            onChange={(e) => setInstallationDate(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
          <Select
            label="Operational Status"
            value={operationalStatus}
            onChange={(v) => setOperationalStatus(v as EquipmentOperationalStatus)}
            options={OPERATIONAL_OPTIONS}
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="w-full">
          <div className="group relative flex min-h-[5.5rem] w-full flex-col justify-start px-3.5 py-2 rounded-md border bg-secondary border-border/80">
            <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
              Description
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading || isSubmitting}
              placeholder="Additional equipment details..."
              className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Record Status</p>
          <div className="flex items-center gap-2">
            {([
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ] as const).map((opt) => {
              const selected = recordStatus === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isLoading || isSubmitting}
                  onClick={() => setRecordStatus(opt.value)}
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Equipment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
