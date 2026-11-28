import { useState, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { DateField } from '../../components/ui/DateField'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { toast } from '../../lib/feedback'
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
  consumeQuantity: number | string
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
    if (val !== '' && Number(val) < 0) return
    setRows((prev) =>
      prev.map((r) => (r.materialId === materialId ? { ...r, consumeQuantity: val } : r))
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

      toast.success(
        postImmediately
          ? 'Material consumption posted.'
          : 'Draft material consumption saved.'
      )
      onSuccess()
      onClose()
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
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {initialDraft
                ? `Edit material consumption (${consumptionNumber})`
                : 'Record material consumption'}
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
                Consumption number
              </span>
              <span className="mt-1 text-sm font-medium tabular-nums text-foreground">
                {consumptionNumber}
              </span>
            </div>

            <DateField
              label="Consumption date *"
              value={consumptionDate}
              onChange={(e) => setConsumptionDate(e.target.value)}
            />
          </div>

          <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
            <span className="text-xs font-medium text-muted-foreground leading-none">
              Production order
            </span>
            <span className="mt-1 text-sm font-medium tabular-nums text-foreground">
              {order.orderNumber}
            </span>
          </div>

          {/* Table matching Screenshot 2: Material | Available in production | Consume Qty | Remaining */}
          <div className="space-y-2.5 pt-1">
            <Table>
              <THead>
                <tr>
                  <TH className="py-2.5">Material</TH>
                    <TH className="py-2.5 text-right">Available in production</TH>
                    <TH className="py-2.5 text-right w-40">Consume Qty</TH>
                    <TH className="py-2.5 text-right">Remaining</TH>
                  </tr>
                </THead>
                <TBody className="divide-y divide-border/60">
                  {rows.map((r) => {
                    const entered = r.consumeQuantity === '' ? 0 : Number(r.consumeQuantity)
                    const remaining = Math.max(0, r.availableInProduction - entered)
                    const isExceeding = entered > r.availableInProduction

                    return (
                      <TR key={r.materialId} className="hover:bg-secondary/30 transition-colors">
                        <TD className="py-2.5 px-3.5 font-medium text-foreground">
                          {r.materialName}
                        </TD>
                        <TD className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {formatQuantity(r.availableInProduction)}
                        </TD>
                        <TD className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={r.consumeQuantity}
                            onChange={(e) => handleRowQuantityChange(r.materialId, e.target.value)}
                            className={`flex h-8 w-28 ml-auto rounded-md border px-2.5 text-right tabular-nums text-xs focus:outline-none transition-colors ${
                              isExceeding
                                ? 'border-destructive bg-destructive/10 text-destructive focus:border-destructive'
                                : 'border-border/80 bg-secondary/40 text-foreground focus:border-foreground focus:ring-1 focus:ring-foreground'
                            }`}
                          />
                        </TD>
                        <TD className="py-2.5 px-3.5 text-right tabular-nums font-medium">
                          <span className={remaining === 0 ? 'text-success font-semibold' : 'text-foreground'}>
                            {formatQuantity(remaining)}
                          </span>
                        </TD>
                      </TR>
                    )
                  })}
                </TBody>
            </Table>

            {/* Quick action button: Consume all remaining materials */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleConsumeAll}
                className="w-full py-2 rounded-md border border-border/80 bg-secondary/40 hover:bg-secondary hover:border-foreground text-xs font-medium text-foreground transition-colors cursor-pointer text-center"
              >
                Consume all remaining materials
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
              placeholder="Optional consumption notes..."
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
              <span>{isSubmitting ? 'Posting...' : 'Post consumption'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
