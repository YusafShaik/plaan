import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { manufacturingService } from '../../services/manufacturingService'
import type {
  ProductionOrder,
  MaterialConsumption,
} from '../../types/manufacturing'

export interface RecordMaterialConsumptionModalProps {
  isOpen: boolean
  order: ProductionOrder | null
  initialDraft?: MaterialConsumption | null
  onClose: () => void
  onSuccess: () => void
}

interface ConsumptionRowState {
  materialId: number
  materialCode: string
  materialName: string
  availableInProduction: number
  consumeQuantity: number | ''
  unitOfMeasure: string
}

export function RecordMaterialConsumptionModal({
  isOpen,
  order,
  initialDraft,
  onClose,
  onSuccess,
}: RecordMaterialConsumptionModalProps) {
  const [consumptionNumber, setConsumptionNumber] = useState('MC-...')
  const [consumptionDate, setConsumptionDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ConsumptionRowState[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !order) return

    if (!initialDraft) {
      manufacturingService
        .getNextMaterialConsumptionNumber()
        .then((res) => setConsumptionNumber(res.nextCode))
        .catch(console.error)

      Promise.resolve().then(() => {
        setConsumptionDate(new Date().toISOString().split('T')[0])
        setNotes('')
        setError(null)
        setSuccessMessage(null)

        const initialRows: ConsumptionRowState[] = order.items.map((it) => {
          const issued = it.issuedQuantity ?? 0
          const consumed = it.consumedQuantity ?? 0
          const returned = it.returnedQuantity ?? 0
          const available = it.remainingQuantity ?? Math.max(0, issued - consumed - returned)

          return {
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            availableInProduction: available,
            consumeQuantity: available > 0 ? available : '',
            unitOfMeasure: it.unitOfMeasure,
          }
        })

        setRows(initialRows)
      })
    } else {
      Promise.resolve().then(() => {
        setConsumptionNumber(initialDraft.consumptionNumber)
        setConsumptionDate(initialDraft.consumptionDate)
        setNotes(initialDraft.notes || '')
        setError(null)
        setSuccessMessage(null)

        const draftRows: ConsumptionRowState[] = order.items.map((it) => {
          const draftItem = initialDraft.items.find((di) => di.materialId === it.materialId)
          const issued = it.issuedQuantity ?? 0
          const consumed = it.consumedQuantity ?? 0
          const returned = it.returnedQuantity ?? 0
          const available = it.remainingQuantity ?? Math.max(0, issued - consumed - returned)

          return {
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            availableInProduction: available,
            consumeQuantity: draftItem ? draftItem.consumedQuantity : '',
            unitOfMeasure: it.unitOfMeasure,
          }
        })

        setRows(draftRows)
      })
    }
  }, [isOpen, order, initialDraft])

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
          return { ...r, consumeQuantity: '' }
        }
        const parsed = Math.max(0, parseFloat(val) || 0)
        return { ...r, consumeQuantity: parsed }
      })
    )
  }

  // Quick action: Consume all remaining materials
  const handleConsumeAll = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        consumeQuantity: r.availableInProduction,
      }))
    )
  }

  const validate = (): string | null => {
    let hasAtLeastOne = false

    for (const r of rows) {
      const qty = r.consumeQuantity === '' ? 0 : Number(r.consumeQuantity)
      if (qty < 0) {
        return `Consumed quantity cannot be negative for ${r.materialName}.`
      }
      if (qty > r.availableInProduction) {
        return `Cannot consume ${qty} ${r.unitOfMeasure} for ${r.materialName}. Available in production is only ${formatQuantity(r.availableInProduction)} ${r.unitOfMeasure}.`
      }
      if (qty > 0) {
        hasAtLeastOne = true
      }
    }

    if (!hasAtLeastOne) {
      return 'Please enter a consumed quantity greater than zero for at least one material.'
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
        consumedQuantity: r.consumeQuantity === '' ? 0 : Number(r.consumeQuantity),
      }))

      if (initialDraft) {
        await manufacturingService.updateMaterialConsumption(initialDraft.id, {
          consumptionDate,
          notes: notes.trim() || undefined,
          postImmediately,
          items: itemsPayload,
        })
      } else {
        await manufacturingService.createMaterialConsumption({
          consumptionNumber: consumptionNumber.startsWith('MC-') && !consumptionNumber.includes('...') ? consumptionNumber : undefined,
          consumptionDate,
          productionOrderId: order.id,
          notes: notes.trim() || undefined,
          postImmediately,
          items: itemsPayload,
        })
      }

      setSuccessMessage(
        postImmediately
          ? 'Material consumption posted successfully! Material accountability updated.'
          : 'Draft material consumption saved successfully.'
      )
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving material consumption.')
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
        {/* Header matching Screenshot 2 */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {initialDraft ? `Edit Material Consumption (${consumptionNumber})` : 'Record Material Consumption'}
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
          {/* Row 1: Consumption Number & Consumption Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Consumption Number
              </label>
              <input
                type="text"
                disabled
                value={consumptionNumber}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Consumption Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={consumptionDate}
                onChange={(e) => setConsumptionDate(e.target.value)}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer"
              />
            </div>
          </div>

          {/* Row 2: Production Order */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Production Order
            </label>
            <input
              type="text"
              disabled
              value={order.orderNumber}
              className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed font-medium"
            />
          </div>

          {/* Table matching Screenshot 2: Material | Available in production | Consume Qty | Remaining */}
          <div className="space-y-2.5 pt-1">
            <div className="overflow-x-auto rounded-[10px] border border-border/80 bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                    <th className="py-2.5 px-3.5">Material</th>
                    <th className="py-2.5 px-3 text-right">Available in production</th>
                    <th className="py-2.5 px-3 text-right w-40">Consume Qty</th>
                    <th className="py-2.5 px-3.5 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((r) => {
                    const entered = r.consumeQuantity === '' ? 0 : Number(r.consumeQuantity)
                    const remaining = Math.max(0, r.availableInProduction - entered)
                    const isExceeding = entered > r.availableInProduction

                    return (
                      <tr key={r.materialId} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-2.5 px-3.5 font-medium text-foreground">
                          {r.materialName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                          {formatQuantity(r.availableInProduction)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={r.consumeQuantity}
                            onChange={(e) => handleRowQuantityChange(r.materialId, e.target.value)}
                            className={`flex h-8 w-28 ml-auto rounded-[6px] border px-2.5 text-right font-mono text-xs focus:outline-none transition-colors ${
                              isExceeding
                                ? 'border-destructive bg-destructive/10 text-destructive focus:border-destructive'
                                : 'border-border/80 bg-secondary/40 text-foreground focus:border-foreground focus:ring-1 focus:ring-foreground'
                            }`}
                          />
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-medium">
                          <span className={remaining === 0 ? 'text-emerald-500 font-semibold' : 'text-foreground'}>
                            {formatQuantity(remaining)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick action button: Consume all remaining materials */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleConsumeAll}
                className="w-full py-2 rounded-[8px] border border-border/80 bg-secondary/40 hover:bg-secondary hover:border-foreground text-xs font-medium text-foreground transition-colors cursor-pointer text-center"
              >
                Consume all remaining materials
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Optional consumption notes..."
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
              className="bg-[#107048] hover:bg-[#0d603e] text-white font-semibold text-xs cursor-pointer shadow-xs rounded-[8px] px-4"
            >
              <span>{isSubmitting ? 'Posting...' : 'Post Consumption'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
