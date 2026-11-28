import { useState, useEffect } from 'react'
import { X, AlertCircle, PackageCheck, Sparkles } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { DateField } from '../../components/ui/DateField'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { toast } from '../../lib/feedback'
import { manufacturingService } from '../../services/manufacturingService'
import type {
  ProductionOrder,
  ProductionOrderAvailability,
  MaterialIssue,
} from '../../types/manufacturing'

export interface CreateMaterialIssueModalProps {
  isOpen: boolean
  order: ProductionOrder | null
  availability?: ProductionOrderAvailability | null
  initialDraft?: MaterialIssue | null
  onClose: () => void
  onSuccess: () => void
}

interface IssueRowState {
  materialId: number
  materialCode: string
  materialName: string
  pendingQuantity: number
  onHandQuantity: number
  issueQuantity: number | string
  unitOfMeasure: string
}

export function CreateMaterialIssueModal({
  isOpen,
  order,
  availability,
  initialDraft,
  onClose,
  onSuccess,
}: CreateMaterialIssueModalProps) {
  const [issueNumber, setIssueNumber] = useState('MI-...')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<IssueRowState[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form state
  useEffect(() => {
    if (!isOpen || !order) return

    if (!initialDraft) {
      manufacturingService
        .getNextMaterialIssueNumber()
        .then((res) => setIssueNumber(res.nextCode))
        .catch(console.error)

      Promise.resolve().then(() => {
        setIssueDate(new Date().toISOString().split('T')[0])
        setNotes('')
        setError(null)

        // Initialize rows from order requirements & availability
        const initialRows: IssueRowState[] = order.items.map((it) => {
          const avail = availability?.items.find((a) => a.materialId === it.materialId)
          const onHand = avail?.onHandQuantity ?? it.onHandQuantity ?? 0
          const required = it.requiredQuantity
          const issued = it.issuedQuantity ?? 0
          const pending = Math.max(0, required - issued)

          // Default initial issue quantity: fill available by default or pending
          const defaultIssueQty = pending > 0 && onHand > 0 ? Math.min(pending, onHand) : ''

          return {
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            pendingQuantity: pending,
            onHandQuantity: onHand,
            issueQuantity: defaultIssueQty,
            unitOfMeasure: it.unitOfMeasure,
          }
        })

        setRows(initialRows)
      })
    } else {
      Promise.resolve().then(() => {
        setIssueNumber(initialDraft.issueNumber)
        setIssueDate(initialDraft.issueDate)
        setNotes(initialDraft.notes || '')
        setError(null)

        const draftRows: IssueRowState[] = order.items.map((it) => {
          const draftItem = initialDraft.items.find((di) => di.materialId === it.materialId)
          const avail = availability?.items.find((a) => a.materialId === it.materialId)
          const onHand = avail?.onHandQuantity ?? it.onHandQuantity ?? 0
          const required = it.requiredQuantity
          const issued = it.issuedQuantity ?? 0
          const pending = Math.max(0, required - issued)

          return {
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            pendingQuantity: pending,
            onHandQuantity: onHand,
            issueQuantity: draftItem ? draftItem.issueQuantity : '',
            unitOfMeasure: it.unitOfMeasure,
          }
        })

        setRows(draftRows)
      })
    }
  }, [isOpen, order, availability, initialDraft])

  if (!isOpen || !order) return null

  const formatQuantity = (qty: number) => {
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
  }

  const handleRowQuantityChange = (materialId: number, val: string) => {
    if (val !== '' && Number(val) < 0) return
    setRows((prev) =>
      prev.map((r) => (r.materialId === materialId ? { ...r, issueQuantity: val } : r))
    )
  }

  // Quick action: Fill available quantities
  const handleFillAvailable = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        issueQuantity: Math.min(r.pendingQuantity, r.onHandQuantity),
      }))
    )
  }

  const validate = (): string | null => {
    let hasAtLeastOne = false

    for (const r of rows) {
      const qty = r.issueQuantity === '' ? 0 : Number(r.issueQuantity)
      if (qty < 0) {
        return `Issue quantity cannot be negative for ${r.materialName}.`
      }
      if (qty > r.pendingQuantity) {
        return `Cannot issue ${qty} ${r.unitOfMeasure} for ${r.materialName}. Pending required quantity is only ${formatQuantity(r.pendingQuantity)} ${r.unitOfMeasure}.`
      }
      if (qty > r.onHandQuantity) {
        return `Insufficient warehouse stock for ${r.materialName}. On hand: ${formatQuantity(r.onHandQuantity)} ${r.unitOfMeasure}, requested: ${qty} ${r.unitOfMeasure}.`
      }
      if (qty > 0) {
        hasAtLeastOne = true
      }
    }

    if (!hasAtLeastOne) {
      return 'Please enter an issue quantity greater than zero for at least one material.'
    }

    return null
  }

  const handleSubmit = async (postImmediately: boolean) => {
    const valError = validate()
    if (valError) {
      setError(valError)
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const itemsPayload = rows.map((r) => ({
        materialId: r.materialId,
        issueQuantity: r.issueQuantity === '' ? 0 : Number(r.issueQuantity),
      }))

      if (initialDraft) {
        await manufacturingService.updateMaterialIssue(initialDraft.id, {
          issueDate,
          notes: notes.trim() || undefined,
          postImmediately,
          items: itemsPayload,
        })
      } else {
        await manufacturingService.createMaterialIssue({
          issueNumber: issueNumber.startsWith('MI-') && !issueNumber.includes('...') ? issueNumber : undefined,
          issueDate,
          productionOrderId: order.id,
          notes: notes.trim() || undefined,
          postImmediately,
          items: itemsPayload,
        })
      }

      toast.success(
        postImmediately
          ? 'Material issue posted and handed over to production.'
          : 'Draft material issue saved.'
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving material issue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[740px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Production order · {order.orderNumber}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground mt-0.5">
              {initialDraft ? `Edit material issue (${issueNumber})` : 'Issue materials'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
              <span className="text-xs font-medium text-muted-foreground leading-none">
                Material issue number
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {issueNumber}
                </span>
                <span className="text-xs text-muted-foreground">Auto</span>
              </div>
            </div>

            <DateField
              label="Issue date *"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />

            <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
              <span className="text-xs font-medium text-muted-foreground leading-none">
                Production order
              </span>
              <span className="mt-1 text-sm font-medium tabular-nums text-foreground truncate">
                {order.orderNumber} ({order.productName})
              </span>
            </div>

            <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
              <span className="text-xs font-medium text-muted-foreground leading-none">
                Source warehouse
              </span>
              <span className="mt-1 text-sm font-medium text-foreground truncate">
                {order.sourceWarehouseName} ({order.sourceWarehouseCode})
              </span>
            </div>
          </div>

          {/* Section: Materials to issue */}
          <div className="space-y-2.5 pt-1 border-t border-border/70">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Materials to issue
                </h3>
                <p className="text-xs text-muted-foreground">
                  Specify issue quantities against remaining order requirements.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {rows.length} components
              </span>
            </div>

            {/* Table */}
            <Table>
              <THead>
                <tr>
                  <TH className="py-2.5">Material</TH>
                    <TH className="py-2.5 text-right">Pending</TH>
                    <TH className="py-2.5 text-right">On Hand</TH>
                    <TH className="py-2.5 text-right w-36">Issue Qty</TH>
                    <TH className="py-2.5">UOM</TH>
                  </tr>
                </THead>
                <TBody className="divide-y divide-border/60">
                  {rows.map((r) => {
                    const isExceedingPending = r.issueQuantity !== '' && Number(r.issueQuantity) > r.pendingQuantity
                    const isExceedingOnHand = r.issueQuantity !== '' && Number(r.issueQuantity) > r.onHandQuantity

                    return (
                      <TR key={r.materialId} className="hover:bg-secondary/30 transition-colors">
                        <TD className="py-2.5 px-3.5">
                          <p className="font-medium text-foreground">{r.materialName}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {r.materialCode}
                          </p>
                        </TD>
                        <TD className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {formatQuantity(r.pendingQuantity)}
                        </TD>
                        <TD className="py-2.5 px-3 text-right tabular-nums font-medium text-foreground">
                          {formatQuantity(r.onHandQuantity)}
                        </TD>
                        <TD className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={r.issueQuantity}
                            onChange={(e) => handleRowQuantityChange(r.materialId, e.target.value)}
                            className={`flex h-8 w-28 ml-auto rounded-md border px-2.5 text-right tabular-nums text-xs focus:outline-none transition-colors ${
                              isExceedingPending || isExceedingOnHand
                                ? 'border-destructive bg-destructive/10 text-destructive focus:border-destructive'
                                : 'border-border/80 bg-secondary/40 text-foreground focus:border-foreground focus:ring-1 focus:ring-foreground'
                            }`}
                          />
                        </TD>
                        <TD className="py-2.5 px-3.5 text-muted-foreground">
                          {r.unitOfMeasure}
                        </TD>
                      </TR>
                    )
                  })}
                </TBody>
            </Table>

            {/* Quick action button: Fill available quantities */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={handleFillAvailable}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary hover:border-foreground transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-warning" />
                <span>Fill available quantities</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="flex min-h-14 w-full flex-col rounded-md border border-border bg-card px-3.5 py-2 focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
            <span className="text-xs font-medium text-muted-foreground leading-none">
              Notes
            </span>
            <textarea
              rows={2}
              placeholder="Additional material issue information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
            />
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
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
              <PackageCheck className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Posting...' : 'Post issue'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
