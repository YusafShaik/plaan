import { useState, useEffect, useMemo } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { manufacturingService } from '../../services/manufacturingService'
import type {
  ProductionOrder,
  ProductionReceipt,
} from '../../types/manufacturing'

export interface ReceiveFinishedGoodsModalProps {
  isOpen: boolean
  order: ProductionOrder | null
  initialDraft?: ProductionReceipt | null
  hasPostedConsumption?: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ReceiveFinishedGoodsModal({
  isOpen,
  order,
  initialDraft,
  hasPostedConsumption = true,
  onClose,
  onSuccess,
}: ReceiveFinishedGoodsModalProps) {
  const [receiptNumber, setReceiptNumber] = useState('PR-...')
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().split('T')[0])
  const [receiptQuantity, setReceiptQuantity] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const orderedQuantity = order?.productionQuantity ?? 0
  const previouslyReceived = order?.receivedQuantity ?? 0
  const pendingQuantity = order?.pendingProductionQuantity ?? Math.max(0, orderedQuantity - previouslyReceived)
  const uom = order?.unitOfMeasure ?? 'Nos'

  useEffect(() => {
    if (!isOpen || !order) return

    if (!initialDraft) {
      manufacturingService
        .getNextProductionReceiptNumber()
        .then((res) => setReceiptNumber(res.nextCode))
        .catch(console.error)

      Promise.resolve().then(() => {
        setReceiptDate(new Date().toISOString().split('T')[0])
        setReceiptQuantity(pendingQuantity > 0 ? pendingQuantity : '')
        setNotes('')
        setError(null)
        setSuccessMessage(null)
      })
    } else {
      Promise.resolve().then(() => {
        setReceiptNumber(initialDraft.receiptNumber)
        setReceiptDate(initialDraft.receiptDate)
        setReceiptQuantity(initialDraft.receiptQuantity)
        setNotes(initialDraft.notes || '')
        setError(null)
        setSuccessMessage(null)
      })
    }
  }, [isOpen, order, initialDraft, pendingQuantity])

  const formatQuantity = (qty?: number | null) => {
    if (qty === undefined || qty === null || isNaN(qty)) return '0'
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
  }

  const numericQty = typeof receiptQuantity === 'number' ? receiptQuantity : 0

  const totalAfterPosting = useMemo(() => {
    return previouslyReceived + numericQty
  }, [previouslyReceived, numericQty])

  const remainingQuantity = useMemo(() => {
    return Math.max(0, orderedQuantity - totalAfterPosting)
  }, [orderedQuantity, totalAfterPosting])

  const handleSubmit = async (postImmediately: boolean) => {
    if (!order) return
    setError(null)
    setSuccessMessage(null)

    if (!hasPostedConsumption) {
      setError('Cannot record production receipt before raw materials have been consumed. Please record material consumption first.')
      return
    }

    if (receiptQuantity === '' || receiptQuantity <= 0) {
      setError('Receipt quantity must be greater than zero.')
      return
    }

    if (receiptQuantity > pendingQuantity) {
      setError(`Receipt quantity (${formatQuantity(receiptQuantity)} ${uom}) cannot exceed pending quantity (${formatQuantity(pendingQuantity)} ${uom}).`)
      return
    }

    setIsSubmitting(true)
    try {
      if (initialDraft) {
        await manufacturingService.updateProductionReceipt(initialDraft.id, {
          receiptDate,
          receiptQuantity,
          notes: notes.trim() || undefined,
          postImmediately,
        })
      } else {
        await manufacturingService.createProductionReceipt({
          receiptNumber: receiptNumber.startsWith('PR-...') ? undefined : receiptNumber,
          receiptDate,
          productionOrderId: order.id,
          receiptQuantity,
          notes: notes.trim() || undefined,
          postImmediately,
        })
      }

      setSuccessMessage(
        postImmediately
          ? 'Production receipt posted successfully.'
          : 'Draft production receipt saved successfully.'
      )
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the production receipt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDraft = async () => {
    if (!initialDraft) return
    if (!window.confirm(`Are you sure you want to delete draft receipt ${initialDraft.receiptNumber}?`)) {
      return
    }

    setIsSubmitting(true)
    try {
      await manufacturingService.deleteDraftProductionReceipt(initialDraft.id)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft production receipt.')
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !order) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[700px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-4">
        {/* Header matching Screenshot 0 */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {initialDraft ? `Edit Production Receipt (${receiptNumber})` : 'Receive Finished Goods'}
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

        {/* Feedback banners */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        {!hasPostedConsumption && (
          <div className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">
              Cannot record production receipt before raw materials have been consumed. Please record material consumption first.
            </p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Form Body matching Screenshot 0 */}
        <div className="space-y-4">
          {/* Row 1: Receipt Number & Receipt Date * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Receipt Number
              </label>
              <input
                type="text"
                disabled
                value={receiptNumber}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Receipt Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer"
              />
            </div>
          </div>

          {/* Row 2: Production Order & Product */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Production Order
              </label>
              <input
                type="text"
                disabled
                value={order.orderNumber}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Product
              </label>
              <input
                type="text"
                disabled
                value={order.productName}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/50 px-3.5 text-xs text-muted-foreground cursor-not-allowed font-medium"
              />
            </div>
          </div>

          {/* Row 3: Receiving Warehouse */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Receiving Warehouse
            </label>
            <input
              type="text"
              disabled
              value={order.finishedGoodsWarehouseName}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/50 px-3.5 text-xs text-muted-foreground cursor-not-allowed font-medium"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border/80 pt-2" />

          {/* Summary Quantities matching Screenshot 0 */}
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-muted-foreground">Ordered quantity</span>{' '}
              <span className="font-medium text-foreground font-mono ml-2">
                {formatQuantity(orderedQuantity)} {uom}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Previously received</span>{' '}
              <span className="font-medium text-foreground font-mono ml-2">
                {formatQuantity(previouslyReceived)} {uom}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Pending quantity</span>{' '}
              <span className="font-medium text-foreground font-mono ml-2">
                {formatQuantity(pendingQuantity)} {uom}
              </span>
            </div>
          </div>

          {/* Input Row: Receipt Quantity * & UOM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Receipt Quantity <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="0.0001"
                max={pendingQuantity}
                step="any"
                value={receiptQuantity}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                  setReceiptQuantity(isNaN(val as number) ? '' : val)
                }}
                placeholder={`Max ${formatQuantity(pendingQuantity)}`}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs font-mono text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                UOM
              </label>
              <input
                type="text"
                disabled
                value={uom}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>

          {/* Dynamic Calculation Box matching Screenshot 0 */}
          <div className="rounded-md border border-border/80 bg-secondary/20 p-4 space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Total received after posting</span>{' '}
              <span className="font-medium text-foreground font-mono ml-2">
                {formatQuantity(totalAfterPosting)} {uom}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining production quantity</span>{' '}
              <span className="font-medium text-foreground font-mono ml-2">
                {formatQuantity(remainingQuantity)} {uom}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional production receipt notes..."
              rows={3}
              className="flex w-full rounded-md border border-border/80 bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>
        </div>

        {/* Footer Actions matching Screenshot 0 */}
        <div className="flex items-center justify-between pt-3 border-t border-border/80">
          <div>
            {initialDraft && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeleteDraft}
                disabled={isSubmitting}
                className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Delete Draft
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || !hasPostedConsumption}
              className="h-9 px-4 text-xs font-medium cursor-pointer"
            >
              Save Draft
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !hasPostedConsumption}
              className="bg-brand hover:bg-brand-hover text-brand-foreground font-semibold text-xs px-4 h-9 rounded-md cursor-pointer shadow-xs disabled:opacity-50"
            >
              Post Receipt
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
