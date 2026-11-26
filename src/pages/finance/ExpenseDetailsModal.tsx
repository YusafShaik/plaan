import { useState } from 'react'
import { X, Edit, Trash2, CheckCircle2, Download } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { financeService } from '../../services/financeService'
import type { Expense, PaymentMethod } from '../../types/finance'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
}

export interface ExpenseDetailsModalProps {
  isOpen: boolean
  expense: Expense | null
  onClose: () => void
  onEdit?: (expense: Expense) => void
  onDeleted?: () => void
  onPosted?: (expense: Expense) => void
}

export function ExpenseDetailsModal({
  isOpen,
  expense,
  onClose,
  onEdit,
  onDeleted,
  onPosted,
}: ExpenseDetailsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !expense) return null

  const isPosted = expense.status === 'POSTED'

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
      const updated = await financeService.postExpense(expense.id)
      onPosted?.(updated)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post expense')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this draft expense?')) return
    setIsProcessing(true)
    setError(null)
    try {
      await financeService.deleteExpense(expense.id)
      onDeleted?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = async () => {
    if (!expense.hasAttachment || !expense.attachmentFileName) return
    try {
      await financeService.downloadExpenseAttachment(expense.id, expense.attachmentFileName)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to download attachment')
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
              Finance / Expenses / {expense.expenseNumber}
            </p>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl font-medium tracking-tight text-foreground">
                {expense.expenseNumber}
              </span>
              {isPosted ? (
                <Badge variant="success">Posted</Badge>
              ) : (
                <Badge variant="warning">Draft</Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {expense.categoryName} · {formatCurrency(expense.amount)}
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

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Expense Date</dt>
            <dd className="mt-0.5 font-medium text-foreground">{expense.expenseDate}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Category</dt>
            <dd className="mt-0.5 font-medium text-foreground">{expense.categoryName}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Description</dt>
            <dd className="mt-0.5 font-medium text-foreground">{expense.description}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="mt-0.5 font-medium text-foreground">{formatCurrency(expense.amount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Payment Method</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {METHOD_LABEL[expense.paymentMethod]}
            </dd>
          </div>
          {expense.paidTo && (
            <div>
              <dt className="text-muted-foreground">Paid To</dt>
              <dd className="mt-0.5 font-medium text-foreground">{expense.paidTo}</dd>
            </div>
          )}
          {expense.paymentReference && (
            <div>
              <dt className="text-muted-foreground">Payment Reference</dt>
              <dd className="mt-0.5 font-medium text-foreground">{expense.paymentReference}</dd>
            </div>
          )}
          {expense.notes && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="mt-0.5 font-medium text-foreground whitespace-pre-wrap">
                {expense.notes}
              </dd>
            </div>
          )}
          {expense.hasAttachment && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Attachment</dt>
              <dd className="mt-1">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 text-xs text-info hover:underline cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  {expense.attachmentFileName || 'Download'}
                </button>
              </dd>
            </div>
          )}
        </dl>

        <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
          {!isPosted && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isProcessing}
                onClick={() => {
                  onEdit?.(expense)
                  onClose()
                }}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button type="button" variant="primary" disabled={isProcessing} onClick={handlePost}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Post Expense
              </Button>
            </>
          )}
          {isPosted && (
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
