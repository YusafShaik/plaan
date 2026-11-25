import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle2, PackageCheck, Sparkles } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
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
  issueQuantity: number | ''
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
        setSuccessMessage(null)

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
        setSuccessMessage(null)

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
    setRows((prev) =>
      prev.map((r) => {
        if (r.materialId !== materialId) return r
        if (val === '') {
          return { ...r, issueQuantity: '' }
        }
        const parsed = Math.max(0, parseFloat(val) || 0)
        return { ...r, issueQuantity: parsed }
      })
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
      setSuccessMessage(null)

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

      setSuccessMessage(
        postImmediately
          ? 'Material issue posted successfully! Inventory has been handed over to production.'
          : 'Draft material issue saved successfully.'
      )
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 900)
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
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Manufacturing / Production Orders / {order.orderNumber}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              {initialDraft ? `Edit Material Issue (${issueNumber})` : 'Issue Materials'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-[10px] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4">
          {/* Row 1: Material Issue Number & Issue Date * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Material Issue Number
              </label>
              <input
                type="text"
                disabled
                value={issueNumber}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Auto-generated</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Issue Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer"
              />
            </div>
          </div>

          {/* Row 2: Production Order & Source Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Production Order
              </label>
              <input
                type="text"
                disabled
                value={`${order.orderNumber} (${order.productName})`}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed font-medium truncate"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Source Warehouse
              </label>
              <input
                type="text"
                disabled
                value={`${order.sourceWarehouseName} (${order.sourceWarehouseCode})`}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/50 px-3.5 text-xs text-muted-foreground cursor-not-allowed font-medium truncate"
              />
            </div>
          </div>

          {/* Section: Materials to issue */}
          <div className="space-y-2.5 pt-1 border-t border-border/70">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Materials to issue
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Specify issue quantities against remaining order requirements.
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {rows.length} components
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-[10px] border border-border/80 bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                    <th className="py-2.5 px-3.5">Material</th>
                    <th className="py-2.5 px-3 text-right">Pending</th>
                    <th className="py-2.5 px-3 text-right">On Hand</th>
                    <th className="py-2.5 px-3 text-right w-36">Issue Qty</th>
                    <th className="py-2.5 px-3.5">UOM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((r) => {
                    const isExceedingPending = r.issueQuantity !== '' && Number(r.issueQuantity) > r.pendingQuantity
                    const isExceedingOnHand = r.issueQuantity !== '' && Number(r.issueQuantity) > r.onHandQuantity

                    return (
                      <tr key={r.materialId} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-2.5 px-3.5">
                          <p className="font-medium text-foreground">{r.materialName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {r.materialCode}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                          {formatQuantity(r.pendingQuantity)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                          {formatQuantity(r.onHandQuantity)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={r.issueQuantity}
                            onChange={(e) => handleRowQuantityChange(r.materialId, e.target.value)}
                            className={`flex h-8 w-28 ml-auto rounded-[6px] border px-2.5 text-right font-mono text-xs focus:outline-none transition-colors ${
                              isExceedingPending || isExceedingOnHand
                                ? 'border-destructive bg-destructive/10 text-destructive focus:border-destructive'
                                : 'border-border/80 bg-secondary/40 text-foreground focus:border-foreground focus:ring-1 focus:ring-foreground'
                            }`}
                          />
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground">
                          {r.unitOfMeasure}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick action button: Fill available quantities */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={handleFillAvailable}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-border/80 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary hover:border-foreground transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Fill available quantities</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Notes <span className="text-[11px] text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Additional material issue information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full rounded-[10px] border border-border/80 bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="text-xs font-medium cursor-pointer rounded-[8px] px-3.5"
            >
              Save Draft
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-xs rounded-[8px] px-4 flex items-center gap-1.5"
            >
              <PackageCheck className="h-4 w-4" />
              <span>{isSubmitting ? 'Posting...' : 'Post Material Issue'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
