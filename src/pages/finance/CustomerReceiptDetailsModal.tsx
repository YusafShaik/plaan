import { useState } from 'react'
import { X, Edit, Trash2, CheckCircle2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { RefCode } from '../../components/ui/Table'
import { financeService } from '../../services/financeService'
import type { CustomerReceipt, PaymentMethod } from '../../types/finance'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
}

export interface CustomerReceiptDetailsModalProps {
  isOpen: boolean
  receipt: CustomerReceipt | null
  onClose: () => void
  onEdit?: (receipt: CustomerReceipt) => void
  onDeleted?: () => void
  onPosted?: (receipt: CustomerReceipt) => void
}

export function CustomerReceiptDetailsModal({
  isOpen,
  receipt: payment,
  onClose,
  onEdit,
  onDeleted,
  onPosted,
}: CustomerReceiptDetailsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !payment) return null

  const isPosted = payment.status === 'POSTED'

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val)
  }

  const handlePost = async () => {
    setIsProcessing(true)
    setError(null)
    try {
      const updated = await financeService.postCustomerReceipt(payment.id)
      onPosted?.(updated)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post receipt')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this draft receipt?')) return
    setIsProcessing(true)
    setError(null)
    try {
      await financeService.deleteCustomerReceipt(payment.id)
      onDeleted?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete receipt')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[560px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Finance / Receipts / {payment.receiptNumber}
            </p>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl font-medium tracking-tight text-foreground">
                {payment.receiptNumber}
              </span>
              {isPosted ? (
                <Badge variant="success">Posted</Badge>
              ) : (
                <Badge variant="warning">Draft</Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {payment.customerName} · {formatCurrency(payment.amount)}
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

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Receipt Date</span>
            <p className="mt-1 font-medium text-foreground">{payment.receiptDate}</p>
          </div>
          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Sales Invoice</span>
            <p className="mt-1">
              <RefCode>{payment.invoiceNumber}</RefCode>
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Method</span>
            <p className="mt-1 font-medium text-foreground">
              {METHOD_LABEL[payment.paymentMethod]}
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Reference</span>
            <p className="mt-1 font-medium text-foreground">
              {payment.paymentReference || '—'}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border/80 bg-secondary/30 p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice Total</span>
            <span className="font-medium text-foreground">
              {formatCurrency(payment.invoiceTotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Receipt Amount</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(payment.amount)}
            </span>
          </div>
          <div className="border-t border-border/80 pt-2 flex justify-between">
            <span className="text-muted-foreground">
              {isPosted ? 'Outstanding Receivable (after)' : 'Outstanding Receivable'}
            </span>
            <span className="font-medium text-foreground">
              {formatCurrency(payment.outstandingAmount)}
            </span>
          </div>
        </div>

        {payment.notes && (
          <div className="rounded-md border border-border/80 bg-secondary/20 p-3 text-xs">
            <span className="text-muted-foreground font-medium">Notes</span>
            <p className="mt-0.5 text-foreground">{payment.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border/80 pt-4">
          {!isPosted && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isProcessing}
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isProcessing}
                onClick={() => {
                  onClose()
                  onEdit?.(payment)
                }}
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Edit Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isProcessing}
                onClick={handlePost}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Post Receipt
              </Button>
            </>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
