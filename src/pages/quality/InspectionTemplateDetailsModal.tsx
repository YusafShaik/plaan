import { useState } from 'react'
import { CheckCircle2, Edit, Power, Trash2, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { qualityService } from '../../services/qualityService'
import type { InspectionTemplate, InspectionType } from '../../types/quality'

const TYPE_LABEL: Record<InspectionType, string> = {
  INCOMING: 'Incoming',
  FINISHED_GOODS: 'Finished Goods',
}

export interface InspectionTemplateDetailsModalProps {
  isOpen: boolean
  template: InspectionTemplate | null
  onClose: () => void
  onEdit?: (template: InspectionTemplate) => void
  onChanged?: () => void
}

export function InspectionTemplateDetailsModal({
  isOpen,
  template,
  onClose,
  onEdit,
  onChanged,
}: InspectionTemplateDetailsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !template) return null

  const statusBadge =
    template.status === 'ACTIVE' ? (
      <Badge variant="success">Active</Badge>
    ) : template.status === 'DRAFT' ? (
      <Badge variant="warning">Draft</Badge>
    ) : (
      <Badge variant="neutral">Inactive</Badge>
    )

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[640px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Quality / Inspection Templates / {template.templateCode}
            </p>
            <div className="flex items-center gap-2.5">
              <span className="tabular-nums text-xl font-medium tracking-tight text-foreground">
                {template.templateCode}
              </span>
              {statusBadge}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">{template.templateName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {template.itemName} · {TYPE_LABEL[template.inspectionType]}
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

        {error && (
          <p className="text-xs text-destructive rounded-md border border-destructive/30 bg-destructive/10 p-3">
            {error}
          </p>
        )}

        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Inspection Parameters</p>
          <Table>
            <THead>
              <tr>
                <TH className="w-10">#</TH>
                <TH>Parameter</TH>
                <TH>Acceptance Criteria</TH>
              </tr>
            </THead>
            <TBody>
              {template.parameters.map((p, idx) => (
                <TR key={p.id}>
                  <TD className="text-xs text-muted-foreground">{idx + 1}</TD>
                  <TD className="font-medium text-foreground">{p.parameterName}</TD>
                  <TD className="text-muted-foreground">{p.acceptanceCriteria}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>

        {template.notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{template.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
          {template.status === 'DRAFT' && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (!window.confirm('Delete this draft template?')) return
                  void run(() => qualityService.deleteDraftTemplate(template.id))
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isProcessing}
                onClick={() => {
                  onEdit?.(template)
                  onClose()
                }}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isProcessing}
                onClick={() => void run(() => qualityService.activateTemplate(template.id))}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Activate
              </Button>
            </>
          )}
          {template.status === 'ACTIVE' && (
            <Button
              type="button"
              variant="outline"
              disabled={isProcessing}
              onClick={() => {
                if (
                  !window.confirm(
                    'Deactivate this template? It will no longer be used for new inspections.'
                  )
                )
                  return
                void run(() => qualityService.deactivateTemplate(template.id))
              }}
            >
              <Power className="h-3.5 w-3.5" />
              Deactivate
            </Button>
          )}
          {template.status === 'INACTIVE' && (
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
