import { useState, useEffect, useMemo } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DateField } from '../../components/ui/DateField'
import { manufacturingService } from '../../services/manufacturingService'
import { confirmAction, toast } from '../../lib/feedback'
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
  const [receiptQuantity, setReceiptQuantity] = useState<number | string>('')
  const [notes, setNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      })
    } else {
      Promise.resolve().then(() => {
        setReceiptNumber(initialDraft.receiptNumber)
        setReceiptDate(initialDraft.receiptDate)
        setReceiptQuantity(initialDraft.receiptQuantity)
        setNotes(initialDraft.notes || '')
        setError(null)
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

  const numericQty =
    receiptQuantity === '' ? 0 : Number(receiptQuantity) || 0

  const totalAfterPosting = useMemo(() => {
    return previouslyReceived + numericQty
  }, [previouslyReceived, numericQty])

  const remainingQuantity = useMemo(() => {
    return Math.max(0, orderedQuantity - totalAfterPosting)
  }, [orderedQuantity, totalAfterPosting])

  const handleSubmit = async (postImmediately: boolean) => {
    if (!order) return
    setError(null)

    if (!hasPostedConsumption) {
      setError('Cannot record production receipt before raw materials have been consumed. Please record material consumption first.')
      return
    }

    const parsedQty = Number(receiptQuantity)
    if (receiptQuantity === '' || Number.isNaN(parsedQty) || parsedQty <= 0) {
      setError('Receipt quantity must be greater than zero.')
      return
    }

    if (parsedQty > pendingQuantity) {
      setError(`Receipt quantity (${formatQuantity(parsedQty)} ${uom}) cannot exceed pending quantity (${formatQuantity(pendingQuantity)} ${uom}).`)
      return
    }

    setIsSubmitting(true)
    try {
      if (initialDraft) {
        await manufacturingService.updateProductionReceipt(initialDraft.id, {
          receiptDate,
          receiptQuantity: parsedQty,
          notes: notes.trim() || undefined,
          postImmediately,
        })
      } else {
        await manufacturingService.createProductionReceipt({
          receiptNumber: receiptNumber.startsWith('PR-...') ? undefined : receiptNumber,
          receiptDate,
          productionOrderId: order.id,
          receiptQuantity: parsedQty,
          notes: notes.trim() || undefined,
          postImmediately,
        })
      }

      toast.success(
        postImmediately
          ? 'Production receipt posted.'
          : 'Draft production receipt saved.'
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the production receipt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDraft = async () => {
    if (!initialDraft) return
      const ok = await confirmAction({
      title: `Delete draft receipt ${initialDraft.receiptNumber}?`,
      description: 'This draft finished goods receipt will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return

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
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {initialDraft
                ? `Edit production receipt (${receiptNumber})`
                : 'Receive finished goods'}
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

        {!hasPostedConsumption && (
          <div className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">
              Cannot record production receipt before raw materials have been consumed. Please record material consumption first.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
              <span className="text-xs font-medium text-muted-foreground leading-none">
                Receipt number
              </span>
              <span className="mt-1 text-sm font-medium tabular-nums text-foreground">
                {receiptNumber}
              </span>
            </div>

            <DateField
              label="Receipt date *"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />

            <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
              <span className="text-xs font-medium text-muted-foreground leading-none">
                Production order
              </span>
              <span className="mt-1 text-sm font-medium tabular-nums text-foreground">
                {order.orderNumber}
              </span>
            </div>

            <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
              <span className="text-xs font-medium text-muted-foreground leading-none">
                Product
              </span>
              <span className="mt-1 text-sm font-medium text-foreground truncate">
                {order.productName}
              </span>
            </div>
          </div>

          <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
            <span className="text-xs font-medium text-muted-foreground leading-none">
              Receiving warehouse
            </span>
            <span className="mt-1 text-sm font-medium text-foreground">
              {order.finishedGoodsWarehouseName}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-border/80 pt-2" />

          {/* Summary Quantities matching Screenshot 0 */}
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-muted-foreground">Ordered quantity</span>{' '}
              <span className="font-medium text-foreground tabular-nums ml-2">
                {formatQuantity(orderedQuantity)} {uom}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Previously received</span>{' '}
              <span className="font-medium text-foreground tabular-nums ml-2">
                {formatQuantity(previouslyReceived)} {uom}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Pending quantity</span>{' '}
              <span className="font-medium text-foreground tabular-nums ml-2">
                {formatQuantity(pendingQuantity)} {uom}
              </span>
            </div>
          </div>

          {/* Input Row: Receipt Quantity * & UOM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Input
              label="Receipt quantity *"
              type="number"
              min="0.0001"
              max={pendingQuantity}
              step="any"
              value={receiptQuantity}
              onChange={(e) => {
                const val = e.target.value
                if (val !== '' && Number(val) < 0) return
                setReceiptQuantity(val)
              }}
              placeholder={`Max ${formatQuantity(pendingQuantity)}`}
            />

            <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
              <span className="text-xs font-medium text-muted-foreground leading-none">
                UOM
              </span>
              <span className="mt-1 text-sm font-medium uppercase text-foreground">
                {uom}
              </span>
            </div>
          </div>

          {/* Dynamic Calculation Box */}
          <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5 space-y-1.5 text-xs">
            <div>
              <span className="text-muted-foreground">Total received after posting</span>{' '}
              <span className="font-medium text-foreground tabular-nums ml-2">
                {formatQuantity(totalAfterPosting)} {uom}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining production quantity</span>{' '}
              <span className="font-medium text-foreground tabular-nums ml-2">
                {formatQuantity(remainingQuantity)} {uom}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="flex min-h-14 w-full flex-col rounded-md border border-border bg-card px-3.5 py-2 focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
            <span className="text-xs font-medium text-muted-foreground leading-none">
              Notes
            </span>
            <textarea
              rows={2}
              placeholder="Optional production receipt notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/80">
          <div>
            {initialDraft && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeleteDraft}
                disabled={isSubmitting}
                className="text-destructive border-destructive/25 hover:bg-destructive/10"
              >
                Delete draft
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
            >
              Save draft
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !hasPostedConsumption}
            >
              Post receipt
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
