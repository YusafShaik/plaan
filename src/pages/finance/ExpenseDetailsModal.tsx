import { useEffect, useState } from 'react'
import { CheckCircle2, Download, Edit, FileText, Trash2 } from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { financeService } from '../../services/financeService'
import { useAuth } from '../../hooks/useAuth'
import { confirmAction, toast } from '../../lib/feedback'
import { formatMoney, formatShortDate } from '../../lib/format'
import { PAYMENT_METHOD_LABELS } from './financeHelpers'
import type { Expense } from '../../types/finance'

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
  const { organization } = useAuth()
  const currency = organization?.baseCurrency
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.resolve().then(() => setError(null))
  }, [isOpen, expense?.id])

  if (!isOpen || !expense) return null

  const isPosted = expense.status === 'POSTED'

  const handlePost = async () => {
    setIsProcessing(true)
    setError(null)
    try {
      const updated = await financeService.postExpense(expense.id)
      toast.success(`Expense ${updated.expenseNumber} posted`)
      onPosted?.(updated)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post expense.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: `Delete draft expense ${expense.expenseNumber}?`,
      description: 'This draft expense will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    setIsProcessing(true)
    setError(null)
    try {
      await financeService.deleteExpense(expense.id)
      toast.success(`Draft expense ${expense.expenseNumber} deleted`)
      onDeleted?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = async () => {
    if (!expense.hasAttachment || !expense.attachmentFileName) return
    try {
      await financeService.downloadExpenseAttachment(expense.id, expense.attachmentFileName)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to download attachment.')
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="md">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="tabular-nums text-xl font-semibold tracking-tight text-foreground">
                {expense.expenseNumber}
              </h2>
              <Badge variant={isPosted ? 'success' : 'neutral'}>
                {isPosted ? 'Posted' : 'Draft'}
              </Badge>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {expense.categoryName} ·{' '}
              <span className="tabular-nums">{formatMoney(expense.amount, currency, 2)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isPosted && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => {
                    onEdit?.(expense)
                    onClose()
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => void handlePost()}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Post expense
                </Button>
              </>
            )}
            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="grid grid-cols-2 gap-3 rounded-md border border-border/80 bg-surface-subtle p-3.5 text-xs">
          <div>
            <span className="text-muted-foreground">Expense date</span>
            <p className="mt-1 font-medium tabular-nums text-foreground">
              {formatShortDate(expense.expenseDate)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Category</span>
            <p className="mt-1 font-semibold text-foreground">{expense.categoryName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Payment method</span>
            <p className="mt-1 font-medium text-foreground">
              {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Amount</span>
            <p className="mt-1 font-semibold tabular-nums text-foreground">
              {formatMoney(expense.amount, currency, 2)}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5 text-xs space-y-3">
          <div>
            <span className="text-muted-foreground font-medium">Description</span>
            <p className="mt-1 text-sm font-medium text-foreground">{expense.description}</p>
          </div>

          {(expense.paidTo || expense.paymentReference) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border/80 pt-3">
              <div>
                <span className="text-muted-foreground">Paid to</span>
                <p className="mt-0.5 font-medium text-foreground">{expense.paidTo || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment reference</span>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">
                  {expense.paymentReference || '—'}
                </p>
              </div>
            </div>
          )}
        </div>

        {expense.hasAttachment && (
          <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5 text-xs space-y-2">
            <p className="font-medium text-muted-foreground">Bill / receipt attachment</p>
            <button
              type="button"
              onClick={() => void handleDownload()}
              className="flex w-full items-center gap-2 rounded-md border border-border/80 bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{expense.attachmentFileName || 'Download attachment'}</span>
              <Download className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />
            </button>
          </div>
        )}

        {expense.notes && (
          <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{expense.notes}</p>
          </div>
        )}

        {!isPosted && (
          <div className="flex items-center justify-start border-t border-border/80 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => void handleDelete()}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete draft
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  )
}
