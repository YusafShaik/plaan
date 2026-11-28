import { useEffect, useState } from 'react'
import { CheckCircle2, Edit, Power, Trash2 } from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { Alert } from '../../components/ui/Alert'
import { qualityService } from '../../services/qualityService'
import { confirmAction, toast } from '../../lib/feedback'
import { formatShortDate } from '../../lib/format'
import type { InspectionTemplate, InspectionType } from '../../types/quality'

const TYPE_LABEL: Record<InspectionType, string> = {
  INCOMING: 'Incoming',
  FINISHED_GOODS: 'Finished goods',
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

  useEffect(() => {
    Promise.resolve().then(() => {
      setError(null)
    })
  }, [isOpen, template?.id])

  if (!isOpen || !template) return null

  const statusBadge =
    template.status === 'ACTIVE' ? (
      <Badge variant="success">Active</Badge>
    ) : template.status === 'DRAFT' ? (
      <Badge variant="neutral">Draft</Badge>
    ) : (
      <Badge variant="neutral">Inactive</Badge>
    )

  const run = async (action: () => Promise<unknown>, successMessage: string) => {
    setIsProcessing(true)
    setError(null)
    try {
      await action()
      toast.success(successMessage)
      onChanged?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="md">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="tabular-nums text-xl font-semibold tracking-tight text-foreground">
                {template.templateCode}
              </h2>
              {statusBadge}
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">{template.templateName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {template.itemName} ({template.itemCode})
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {template.status === 'DRAFT' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    const ok = await confirmAction({
                      title: 'Delete draft template?',
                      description: `Draft template ${template.templateCode} will be permanently deleted.`,
                      confirmLabel: 'Delete draft',
                      variant: 'destructive',
                    })
                    if (!ok) return
                    void run(
                      () => qualityService.deleteDraftTemplate(template.id),
                      `Draft template ${template.templateCode} deleted`
                    )
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
                  size="sm"
                  disabled={isProcessing}
                  onClick={() =>
                    void run(
                      () => qualityService.activateTemplate(template.id),
                      `Template ${template.templateCode} activated`
                    )
                  }
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
                size="sm"
                disabled={isProcessing}
                className="text-destructive hover:text-destructive"
                onClick={async () => {
                  const ok = await confirmAction({
                    title: 'Deactivate template?',
                    description: `${template.templateCode} will no longer be used for new inspections.`,
                    confirmLabel: 'Deactivate',
                    variant: 'destructive',
                  })
                  if (!ok) return
                  void run(
                    () => qualityService.deactivateTemplate(template.id),
                    `Template ${template.templateCode} deactivated`
                  )
                }}
              >
                <Power className="h-3.5 w-3.5" />
                Deactivate
              </Button>
            )}

            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md border border-border/80 bg-surface-subtle p-3.5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Inspection type</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {TYPE_LABEL[template.inspectionType]}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Parameters</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {template.parameters.length} {template.parameters.length === 1 ? 'check' : 'checks'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Created date</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formatShortDate(template.createdAt)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Inspection parameters</h3>
          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="w-[10%]">#</TH>
                <TH className="w-[42%]">Parameter</TH>
                <TH className="w-[48%]">Acceptance criteria</TH>
              </tr>
            </THead>
            <TBody>
              {template.parameters.map((p, idx) => (
                <TR key={p.id}>
                  <TD className="text-xs tabular-nums text-muted-foreground">{idx + 1}</TD>
                  <TD className="font-medium text-foreground">{p.parameterName}</TD>
                  <TD className="text-muted-foreground">{p.acceptanceCriteria}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>

        {template.notes && (
          <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{template.notes}</p>
          </div>
        )}
      </div>
    </Drawer>
  )
}
