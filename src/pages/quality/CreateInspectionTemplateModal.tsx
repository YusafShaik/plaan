import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { masterDataService } from '../../services/masterDataService'
import { qualityService } from '../../services/qualityService'
import { toast } from '../../lib/feedback'
import type { Item } from '../../types/masterData'
import type {
  CreateInspectionTemplatePayload,
  InspectionTemplate,
  InspectionType,
  UpdateInspectionTemplatePayload,
} from '../../types/quality'

const TYPE_OPTIONS: { value: InspectionType; label: string }[] = [
  { value: 'INCOMING', label: 'Incoming' },
  { value: 'FINISHED_GOODS', label: 'Finished goods' },
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
  const [inspectionType, setInspectionType] = useState<InspectionType>('FINISHED_GOODS')
  const [notes, setNotes] = useState('')
  const [parameters, setParameters] = useState<ParameterRow[]>([
    { key: 'p-1', parameterName: '', acceptanceCriteria: '' },
  ])
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let mounted = true

    Promise.resolve().then(() => {
      if (!mounted) return
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
            if (mounted) setError(err instanceof Error ? err.message : 'Failed to load items.')
          })
          .finally(() => {
            if (mounted) setIsLoading(false)
          })
        return
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
          setError(err instanceof Error ? err.message : 'Failed to initialize form.')
        })
        .finally(() => {
          if (mounted) setIsLoading(false)
        })
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
        toast.success(
          activate
            ? `Template ${templateToEdit.templateCode} updated and activated`
            : `Template ${templateToEdit.templateCode} updated`
        )
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
        const created = await qualityService.createTemplate(payload)
        toast.success(
          activate
            ? `Template ${created.templateCode} created and activated`
            : `Template ${created.templateCode} saved as draft`
        )
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save template.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const validParamCount = parameters.filter(
    (p) => p.parameterName.trim() || p.acceptanceCriteria.trim()
  ).length

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[740px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <form onSubmit={(e) => handleSubmit(false, e)} className="space-y-4">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {isEditing ? `Edit template · ${templateCode}` : 'Create inspection template'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Define parameters and acceptance criteria used during quality checks.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
            <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
              Template code
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="tabular-nums text-sm font-medium text-foreground">
                {templateCode}
              </span>
              {!isEditing && (
                <span className="text-xs text-muted-foreground select-none">Auto</span>
              )}
            </div>
          </div>

          <Input
            label="Template name *"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g. Raw steel rod check"
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
            label="Inspection type *"
            value={inspectionType}
            onChange={(v) => setInspectionType(v as InspectionType)}
            disabled={isLoading || isSubmitting}
            options={TYPE_OPTIONS}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Inspection parameters</p>
          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            <Table className="border-0 rounded-none" tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="w-[8%]">#</TH>
                  <TH className="w-[40%]">Parameter</TH>
                  <TH className="w-[44%]">Acceptance criteria</TH>
                  <TH className="w-[8%]" />
                </tr>
              </THead>
              <TBody>
                {parameters.map((row, idx) => (
                  <TR key={row.key}>
                    <TD className="text-xs tabular-nums text-muted-foreground">{idx + 1}</TD>
                    <TD>
                      <input
                        value={row.parameterName}
                        onChange={(e) => updateParameter(row.key, 'parameterName', e.target.value)}
                        placeholder="e.g. Surface finish"
                        disabled={isSubmitting}
                        className="h-9 w-full rounded-md border border-border/80 bg-card px-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                      />
                    </TD>
                    <TD>
                      <input
                        value={row.acceptanceCriteria}
                        onChange={(e) =>
                          updateParameter(row.key, 'acceptanceCriteria', e.target.value)
                        }
                        placeholder="e.g. No scratches or cracks"
                        disabled={isSubmitting}
                        className="h-9 w-full rounded-md border border-border/80 bg-card px-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                      />
                    </TD>
                    <TD className="text-right">
                      <button
                        type="button"
                        onClick={() => removeParameter(row.key)}
                        disabled={parameters.length <= 1 || isSubmitting}
                        aria-label="Remove parameter"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <div className="flex items-center justify-between border-t border-border/80 bg-surface-muted/50 px-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addParameter}
                disabled={isSubmitting}
              >
                <Plus className="h-3.5 w-3.5" />
                Add parameter
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {validParamCount} {validParamCount === 1 ? 'parameter' : 'parameters'} defined
              </span>
            </div>
          </div>
        </div>

        <div className="group flex min-h-[72px] w-full flex-col justify-start px-3.5 py-2 rounded-md border border-border/80 bg-card focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
          <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
            Notes
          </span>
          <textarea
            rows={2}
            placeholder="Optional assembly or sampling instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading || isSubmitting}
            className="w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
          <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
          >
            Save draft
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
          >
            Activate template
          </Button>
        </div>
      </form>
    </Modal>
  )
}
