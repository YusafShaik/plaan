import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { manufacturingService } from '../../services/manufacturingService'
import type {
  ProductionOrder,
  MaterialReturn,
} from '../../types/manufacturing'

export interface ReturnMaterialsModalProps {
  isOpen: boolean
  order: ProductionOrder | null
  initialDraft?: MaterialReturn | null
  onClose: () => void
  onSuccess: () => void
}

interface ReturnRowState {
  materialId: number
  materialCode: string
  materialName: string
  returnableQuantity: number
  returnQuantity: number | ''
  unitOfMeasure: string
}

export function ReturnMaterialsModal({
  isOpen,
  order,
  initialDraft,
  onClose,
  onSuccess,
}: ReturnMaterialsModalProps) {
  const [returnNumber, setReturnNumber] = useState('MR-...')
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ReturnRowState[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !order) return

    if (!initialDraft) {
      manufacturingService
        .getNextMaterialReturnNumber()
        .then((res) => setReturnNumber(res.nextCode))
        .catch(console.error)

      Promise.resolve().then(() => {
        setReturnDate(new Date().toISOString().split('T')[0])
        setNotes('')
        setError(null)
        setSuccessMessage(null)

        const initialRows: ReturnRowState[] = order.items.map((it) => {
          const issued = it.issuedQuantity ?? 0
          const consumed = it.consumedQuantity ?? 0
          const returned = it.returnedQuantity ?? 0
          const available = it.remainingQuantity ?? Math.max(0, issued - consumed - returned)

          return {
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            returnableQuantity: available,
            returnQuantity: available > 0 ? available : '',
            unitOfMeasure: it.unitOfMeasure,
          }
        })

        setRows(initialRows)
      })
    } else {
      Promise.resolve().then(() => {
        setReturnNumber(initialDraft.returnNumber)
        setReturnDate(initialDraft.returnDate)
        setNotes(initialDraft.notes || '')
        setError(null)
        setSuccessMessage(null)

        const draftRows: ReturnRowState[] = order.items.map((it) => {
          const draftItem = initialDraft.items.find((di) => di.materialId === it.materialId)
          const issued = it.issuedQuantity ?? 0
          const consumed = it.consumedQuantity ?? 0
          const returned = it.returnedQuantity ?? 0
          const available = it.remainingQuantity ?? Math.max(0, issued - consumed - returned)

          return {
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            returnableQuantity: available,
            returnQuantity: draftItem ? draftItem.returnQuantity : '',
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
          return { ...r, returnQuantity: '' }
        }
        const parsed = Math.max(0, parseFloat(val) || 0)
        return { ...r, returnQuantity: parsed }
      })
    )
  }

  const validate = (): string | null => {
    let hasAtLeastOne = false

    for (const r of rows) {
      const qty = r.returnQuantity === '' ? 0 : Number(r.returnQuantity)
      if (qty < 0) {
        return `Return quantity cannot be negative for ${r.materialName}.`
      }
      if (qty > r.returnableQuantity) {
        return `Cannot return ${qty} ${r.unitOfMeasure} for ${r.materialName}. Returnable quantity in production is only ${formatQuantity(r.returnableQuantity)} ${r.unitOfMeasure}.`
      }
      if (qty > 0) {
        hasAtLeastOne = true
      }
    }

    if (!hasAtLeastOne) {
      return 'Please enter a return quantity greater than zero for at least one material.'
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
        returnQuantity: r.returnQuantity === '' ? 0 : Number(r.returnQuantity),
      }))

      if (initialDraft) {
        await manufacturingService.updateMaterialReturn(initialDraft.id, {
          returnDate,
          returnWarehouseId: order.sourceWarehouseId,
          notes: notes.trim() || undefined,
          postImmediately,
          items: itemsPayload,
        })
      } else {
        await manufacturingService.createMaterialReturn({
          returnNumber: returnNumber.startsWith('MR-') && !returnNumber.includes('...') ? returnNumber : undefined,
          returnDate,
          productionOrderId: order.id,
          returnWarehouseId: order.sourceWarehouseId,
          notes: notes.trim() || undefined,
          postImmediately,
          items: itemsPayload,
        })
      }

      setSuccessMessage(
        postImmediately
          ? 'Material return posted successfully! Unused materials returned to warehouse stock.'
          : 'Draft material return saved successfully.'
      )
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving material return.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Display only rows with returnable quantity or user-entered quantity
  const visibleRows = rows.filter((r) => r.returnableQuantity > 0 || (r.returnQuantity !== '' && r.returnQuantity > 0))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[740px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-4">
        {/* Header matching Screenshot 3 */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {initialDraft ? `Edit Material Return (${returnNumber})` : 'Return Materials'}
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

        {/* Form Body matching Screenshot 3 */}
        <div className="space-y-4">
          {/* Row 1: Return Number & Return Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Return Number
              </label>
              <input
                type="text"
                disabled
                value={returnNumber}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Return Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer"
              />
            </div>
          </div>

          {/* Row 2: Production Order & Return Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Return Warehouse
              </label>
              <input
                type="text"
                disabled
                value={order.sourceWarehouseName}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/50 px-3.5 text-xs text-muted-foreground cursor-not-allowed font-medium"
              />
            </div>
          </div>

          {/* Table matching Screenshot 3: Material | Returnable Qty | Return Qty | UOM */}
          <div className="space-y-2.5 pt-1">
            <div className="overflow-x-auto rounded-[10px] border border-border/80 bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                    <th className="py-2.5 px-3.5">Material</th>
                    <th className="py-2.5 px-3 text-right">Returnable Qty</th>
                    <th className="py-2.5 px-3 text-right w-40">Return Qty</th>
                    <th className="py-2.5 px-3.5">UOM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No materials currently available to return from production
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((r) => {
                      const isExceeding = r.returnQuantity !== '' && Number(r.returnQuantity) > r.returnableQuantity

                      return (
                        <tr key={r.materialId} className="hover:bg-secondary/30 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-foreground">
                            {r.materialName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            {formatQuantity(r.returnableQuantity)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              value={r.returnQuantity}
                              onChange={(e) => handleRowQuantityChange(r.materialId, e.target.value)}
                              className={`flex h-8 w-28 ml-auto rounded-[6px] border px-2.5 text-right font-mono text-xs focus:outline-none transition-colors ${
                                isExceeding
                                  ? 'border-destructive bg-destructive/10 text-destructive focus:border-destructive'
                                  : 'border-border/80 bg-secondary/40 text-foreground focus:border-foreground focus:ring-1 focus:ring-foreground'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3.5 text-muted-foreground font-mono">
                            {r.unitOfMeasure}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Reason for returning unused materials..."
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
              <span>{isSubmitting ? 'Posting...' : 'Post Return'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
