import { useEffect, useState } from 'react'
import { CheckCircle2, Edit, Trash2 } from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { RefCode } from '../../components/ui/Table'
import { useAuth } from '../../hooks/useAuth'
import { confirmAction, toast } from '../../lib/feedback'
import { formatMoney, formatShortDate } from '../../lib/format'
import { PAYMENT_METHOD_LABELS } from './financeHelpers'
import type { PaymentMethod } from '../../types/finance'

export interface SettlementDetailData {
  id: number
  number: string
  date: string
  invoiceNumber: string
  partyName: string
  paymentMethod: PaymentMethod
  paymentReference?: string
  invoiceTotal: number
  amount: number
  outstandingAmount: number
  notes?: string
  status: 'DRAFT' | 'POSTED'
}

export interface SettlementDetailsDrawerProps {
  isOpen: boolean
  record: SettlementDetailData | null
  dateLabel: string
  invoiceLabel: string
  amountLabel: string
  outstandingLabel: string
  postButtonLabel: string
  deleteConfirmTitle: string
  deleteConfirmDescription: string
  onClose: () => void
  onEdit: () => void
  onPost: (id: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export function SettlementDetailsDrawer({
  isOpen,
  record,
  dateLabel,
  invoiceLabel,
  amountLabel,
  outstandingLabel,
  postButtonLabel,
  deleteConfirmTitle,
  deleteConfirmDescription,
  onClose,
  onEdit,
  onPost,
  onDelete,
}: SettlementDetailsDrawerProps) {
  const { organization } = useAuth()
  const currency = organization?.baseCurrency
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.resolve().then(() => setError(null))
  }, [isOpen, record?.id])

  if (!isOpen || !record) return null

  const isPosted = record.status === 'POSTED'

  const handlePost = async () => {
    setIsProcessing(true)
    setError(null)
    try {
      await onPost(record.id)
      toast.success(`${record.number} posted`)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post record.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: deleteConfirmTitle,
      description: deleteConfirmDescription,
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    setIsProcessing(true)
    setError(null)
    try {
      await onDelete(record.id)
      toast.success(`Draft ${record.number} deleted`)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="md">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="tabular-nums text-xl font-semibold tracking-tight text-foreground">
                {record.number}
              </h2>
              <Badge variant={isPosted ? 'success' : 'neutral'}>
                {isPosted ? 'Posted' : 'Draft'}
              </Badge>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {record.partyName} ·{' '}
              <span className="tabular-nums">{formatMoney(record.amount, currency, 2)}</span>
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
                    onClose()
                    onEdit()
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
                  {postButtonLabel}
                </Button>
              </>
            )}
            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="grid grid-cols-2 gap-3 rounded-md border border-border/80 bg-surface-subtle p-3.5 text-xs">
          <div>
            <span className="text-muted-foreground">{dateLabel}</span>
            <p className="mt-1 font-medium tabular-nums text-foreground">
              {formatShortDate(record.date)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{invoiceLabel}</span>
            <p className="mt-1">
              <RefCode>{record.invoiceNumber}</RefCode>
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Method</span>
            <p className="mt-1 font-medium text-foreground">
              {PAYMENT_METHOD_LABELS[record.paymentMethod]}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Reference</span>
            <p className="mt-1 font-medium tabular-nums text-foreground">
              {record.paymentReference || '—'}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border/80 bg-surface-subtle p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice total</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatMoney(record.invoiceTotal, currency, 2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{amountLabel}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatMoney(record.amount, currency, 2)}
            </span>
          </div>
          <div className="border-t border-border/80 pt-2 flex justify-between">
            <span className="text-muted-foreground">
              {isPosted ? `${outstandingLabel} (after)` : outstandingLabel}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatMoney(record.outstandingAmount, currency, 2)}
            </span>
          </div>
        </div>

        {record.notes && (
          <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{record.notes}</p>
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
