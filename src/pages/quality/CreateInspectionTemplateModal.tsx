import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Sparkles, Trash2, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Alert } from '../../components/ui/Alert'
import { masterDataService } from '../../services/masterDataService'
import { qualityService } from '../../services/qualityService'
import type { Item } from '../../types/masterData'
import type {
  CreateInspectionTemplatePayload,
  InspectionTemplate,
  InspectionType,
  UpdateInspectionTemplatePayload,
} from '../../types/quality'

const TYPE_OPTIONS: { value: InspectionType; label: string }[] = [
  { value: 'INCOMING', label: 'Incoming' },
  { value: 'FINISHED_GOODS', label: 'Finished Goods' },
]

interface ParameterRow {
  key: string
  parameterName: string
  acceptanceCriteria: string
}

export interface CreateInspectionTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  templateToEdit?: InspectionTemplate | null
}

export function CreateInspectionTemplateModal({
  isOpen,
  onClose,
  onSuccess,
  templateToEdit,
}: CreateInspectionTemplateModalProps) {
  const isEditing = Boolean(templateToEdit)

  const [templateCode, setTemplateCode] = useState('QT-...')
  const [templateName, setTemplateName] = useState('')
  const [itemId, setItemId] = useState<number | ''>('')
  const [inspectionType, setInspectionType] = useState<InspectionType>('INCOMING')
  const [notes, setNotes] = useState('')
  const [parameters, setParameters] = useState<ParameterRow[]>([
    { key: 'p-1', parameterName: '', acceptanceCriteria: '' },
  ])
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!isOpen) return

    setError(null)
    setIsLoading(true)

    const loadItems = masterDataService.getItems({ active: true, size: 200 })

    if (templateToEdit) {
      setTemplateCode(templateToEdit.templateCode)
      setTemplateName(templateToEdit.templateName)
      setItemId(templateToEdit.itemId)
      setInspectionType(templateToEdit.inspectionType)
      setNotes(templateToEdit.notes || '')
      setParameters(
        templateToEdit.parameters.length > 0
          ? templateToEdit.parameters.map((p) => ({
              key: `p-${p.id}`,
              parameterName: p.parameterName,
              acceptanceCriteria: p.acceptanceCriteria,
            }))
          : [{ key: 'p-1', parameterName: '', acceptanceCriteria: '' }]
      )
      loadItems
        .then((res) => {
          if (mounted) setItems(res.content)
        })
        .catch((err: unknown) => {
          if (mounted) setError(err instanceof Error ? err.message : 'Failed to load items')
        })
        .finally(() => {
          if (mounted) setIsLoading(false)
        })
      return () => {
        mounted = false
      }
    }

    setTemplateName('')
    setItemId('')
    setInspectionType('FINISHED_GOODS')
    setNotes('')
    setParameters([{ key: 'p-1', parameterName: '', acceptanceCriteria: '' }])

    Promise.all([qualityService.getNextTemplateCode(), loadItems])
      .then(([next, itemsRes]) => {
        if (!mounted) return
        setTemplateCode(next.nextCode)
        setItems(itemsRes.content)
      })
      .catch((err: unknown) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to initialize form')
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isOpen, templateToEdit])

  const updateParameter = (key: string, field: keyof ParameterRow, value: string) => {
    setParameters((prev) => prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)))
  }

  const addParameter = () => {
    setParameters((prev) => [
      ...prev,
      { key: `p-${Date.now()}`, parameterName: '', acceptanceCriteria: '' },
    ])
  }

  const removeParameter = (key: string) => {
    setParameters((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.key !== key)))
  }

  const handleSubmit = async (activate: boolean, e?: FormEvent) => {
    e?.preventDefault()
    setError(null)

    if (!templateName.trim()) {
      setError('Template name is required.')
      return
    }
    if (!itemId) {
      setError('Item is required.')
      return
    }

    const cleaned = parameters
      .map((p) => ({
        parameterName: p.parameterName.trim(),
        acceptanceCriteria: p.acceptanceCriteria.trim(),
      }))
      .filter((p) => p.parameterName || p.acceptanceCriteria)

    if (activate && cleaned.length === 0) {
      setError('At least one inspection parameter is required to activate.')
      return
    }
    for (const p of cleaned) {
      if (!p.parameterName || !p.acceptanceCriteria) {
        setError('Each parameter needs both a name and acceptance criteria.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (isEditing && templateToEdit) {
        const payload: UpdateInspectionTemplatePayload = {
          templateName: templateName.trim(),
          itemId: Number(itemId),
          inspectionType,
          notes: notes.trim() || undefined,
          activate,
          parameters: cleaned,
        }
        await qualityService.updateTemplate(templateToEdit.id, payload)
      } else {
        const payload: CreateInspectionTemplatePayload = {
          templateCode: templateCode.startsWith('QT-...') ? undefined : templateCode,
          templateName: templateName.trim(),
          itemId: Number(itemId),
          inspectionType,
          notes: notes.trim() || undefined,
          activate,
          parameters: cleaned,
        }
        await qualityService.createTemplate(payload)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[720px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <form onSubmit={(e) => handleSubmit(false, e)} className="space-y-5">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Quality / Inspection Templates / {isEditing ? templateCode : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isEditing ? `Edit Template · ${templateCode}` : 'Create Inspection Template'}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Template Code"
            value={templateCode}
            readOnly
            disabled
            className="font-mono text-sm"
            rightElement={
              !isEditing ? (
                <span className="text-[11px] font-medium text-brand flex items-center gap-1 select-none">
                  <Sparkles className="h-3 w-3" /> Auto
                </span>
              ) : undefined
            }
          />
          <Input
            label="Template Name *"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />
          <Select
            label="Item *"
            value={itemId ? String(itemId) : ''}
            onChange={(v) => setItemId(v ? Number(v) : '')}
            disabled={isLoading || isSubmitting}
            placeholder="Select item..."
            options={items.map((item) => ({
              value: String(item.id),
              label: `${item.name} (${item.itemCode})`,
            }))}
          />
          <Select
            label="Inspection Type *"
            value={inspectionType}
            onChange={(v) => setInspectionType(v as InspectionType)}
            disabled={isLoading || isSubmitting}
            options={TYPE_OPTIONS}
          />
        </div>

        <div className="space-y-2.5">
          <p className="text-sm font-semibold text-foreground">Inspection Parameters</p>
          <div className="rounded-md border border-border/80 overflow-hidden">
            <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-0 bg-surface-muted border-b border-border/80 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <span>#</span>
              <span>Parameter</span>
              <span>Acceptance Criteria</span>
              <span />
            </div>
            {parameters.map((row, idx) => (
              <div
                key={row.key}
                className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 items-center px-3 py-2 border-b border-border/40 last:border-0"
              >
                <span className="text-xs text-muted-foreground">{idx + 1}</span>
                <input
                  value={row.parameterName}
                  onChange={(e) => updateParameter(row.key, 'parameterName', e.target.value)}
                  placeholder="e.g. Surface Finish"
                  disabled={isSubmitting}
                  className="h-9 w-full rounded-md border border-border/80 bg-secondary px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                />
                <input
                  value={row.acceptanceCriteria}
                  onChange={(e) => updateParameter(row.key, 'acceptanceCriteria', e.target.value)}
                  placeholder="e.g. No scratches or cracks"
                  disabled={isSubmitting}
                  className="h-9 w-full rounded-md border border-border/80 bg-secondary px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                />
                <button
                  type="button"
                  onClick={() => removeParameter(row.key)}
                  disabled={parameters.length <= 1 || isSubmitting}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 cursor-pointer"
                  title="Remove parameter"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={addParameter} disabled={isSubmitting}>
            <Plus className="h-3.5 w-3.5" />
            Add Parameter
          </Button>
        </div>

        <div className="w-full">
          <div className="group relative flex min-h-[76px] w-full flex-col justify-start px-3.5 py-2.5 rounded-md border border-border/80 bg-secondary focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
            <span className="text-[11px] font-medium text-muted-foreground select-none leading-none mb-1">
              Notes
            </span>
            <textarea
              rows={2}
              placeholder="Additional inspection instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading || isSubmitting}
              className="w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
          >
            Activate Template
          </Button>
        </div>
      </form>
    </Modal>
  )
}
