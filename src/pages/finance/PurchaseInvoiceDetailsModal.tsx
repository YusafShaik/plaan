import { useState } from 'react'
import {
  CheckCircle2,
  Download,
  Edit,
  FileText,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, RefCode } from '../../components/ui/Table'
import { financeService } from '../../services/financeService'
import { useAuth } from '../../hooks/useAuth'
import { formatMoney, formatQuantity, formatShortDate } from '../../lib/format'
import { confirmAction, toast } from '../../lib/feedback'
import { getPaymentStatusMeta, PAYMENT_METHOD_LABELS } from './financeHelpers'
import type { PurchaseInvoice } from '../../types/finance'

export interface PurchaseInvoiceDetailsModalProps {
  isOpen: boolean
  invoice: PurchaseInvoice | null
  onClose: () => void
  onEdit?: (invoice: PurchaseInvoice) => void
  onPost?: (invoiceId: number) => Promise<void>
  onDelete?: (invoiceId: number) => Promise<void>
  onRecordPayment?: (invoice: PurchaseInvoice) => void
}

export function PurchaseInvoiceDetailsModal({
  isOpen,
  invoice,
  onClose,
  onEdit,
  onPost,
  onDelete,
  onRecordPayment,
}: PurchaseInvoiceDetailsModalProps) {
  const { organization } = useAuth()
  const currency = organization?.baseCurrency
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen || !invoice) return null

  const isPosted = invoice.status === 'POSTED'
  const paymentMeta = getPaymentStatusMeta(invoice.paymentStatus)
  const paymentHistory = invoice.paymentHistory || []
  const percentPaid =
    invoice.totalAmount > 0
      ? Math.round((invoice.paidAmount / invoice.totalAmount) * 1000) / 10
      : 0
  const canRecordPayment = isPosted && invoice.outstandingAmount > 0

  const handleDownloadPdf = async () => {
    setIsProcessing(true)
    try {
      await financeService.downloadPdf(invoice.id, invoice.invoiceNumber)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download PDF.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePost = async () => {
    if (!onPost) return
    setIsProcessing(true)
    try {
      await onPost(invoice.id)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    const ok = await confirmAction({
      title: `Delete draft invoice ${invoice.invoiceNumber}?`,
      description: 'This draft purchase invoice will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    setIsProcessing(true)
    try {
      await onDelete(invoice.id)
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="lg">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="tabular-nums text-xl font-semibold tracking-tight text-foreground">
                {invoice.invoiceNumber}
              </h2>
              <Badge variant={isPosted ? 'success' : 'neutral'}>
                {isPosted ? 'Posted' : 'Draft'}
              </Badge>
              {isPosted && <Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge>}
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {invoice.supplierName} ·{' '}
              <span className="tabular-nums">{formatMoney(invoice.totalAmount, currency, 2)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => void handleDownloadPdf()}
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>

            {!isPosted && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => {
                    onClose()
                    onEdit?.(invoice)
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
                  Post invoice
                </Button>
              </>
            )}

            {canRecordPayment && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onRecordPayment?.(invoice)}
              >
                <Wallet className="h-3.5 w-3.5" />
                Record payment
              </Button>
            )}

            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-md border border-border/80 bg-surface-subtle p-4">
            <span className="text-xs font-medium text-muted-foreground">Invoice total</span>
            <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {formatMoney(invoice.totalAmount, currency, 2)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums whitespace-nowrap truncate">
              Sub {formatMoney(invoice.subtotal, currency, 2)} · Tax{' '}
              {formatMoney(invoice.taxAmount, currency, 2)}
            </p>
          </div>

          <div className="rounded-md border border-border/80 bg-surface-subtle p-4">
            <span className="text-xs font-medium text-muted-foreground">Total paid</span>
            <div className="mt-1 text-xl font-semibold tabular-nums text-success">
              {formatMoney(invoice.paidAmount, currency, 2)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">{percentPaid}% paid</p>
          </div>

          <div className="rounded-md border border-border/80 bg-surface-subtle p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
              {isPosted && <Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge>}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {formatMoney(invoice.outstandingAmount, currency, 2)}
            </div>
            <div className="mt-2 h-1.5 w-full bg-secondary rounded-md overflow-hidden">
              <div
                className="h-full bg-success rounded-md transition-[width] duration-300"
                style={{ width: `${Math.min(100, percentPaid)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-md border border-border/80 bg-surface-subtle p-3.5 text-xs">
          <div>
            <span className="text-muted-foreground">Supplier bill no.</span>
            <p className="mt-1">
              <RefCode>{invoice.supplierInvoiceNumber}</RefCode>
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Invoice date</span>
            <p className="mt-1 font-medium tabular-nums text-foreground">
              {formatShortDate(invoice.invoiceDate)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Payment due</span>
            <p className="mt-1 font-medium tabular-nums text-foreground">
              {invoice.paymentDueDate ? formatShortDate(invoice.paymentDueDate) : 'Not set'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Goods receipt</span>
            <p className="mt-1">
              <RefCode>{invoice.grnNumber}</RefCode>
            </p>
          </div>
        </div>

        {isPosted && (
          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold text-foreground">Payment history</h3>
            {paymentHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border/80 py-4 text-center">
                No payments recorded yet.
              </p>
            ) : (
              <Table tableClassName="table-fixed">
                <THead>
                  <tr>
                    <TH className="w-[34%]">Reference</TH>
                    <TH className="w-[22%]">Date</TH>
                    <TH className="w-[24%]">Method</TH>
                    <TH className="w-[20%] text-right">Amount</TH>
                  </tr>
                </THead>
                <TBody>
                  {paymentHistory.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <RefCode>{p.paymentNumber}</RefCode>
                      </TD>
                      <TD className="text-muted-foreground tabular-nums">
                        {formatShortDate(p.paymentDate)}
                      </TD>
                      <TD className="text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[p.paymentMethod]}
                      </TD>
                      <TD className="text-right tabular-nums font-medium">
                        {formatMoney(p.amount, currency, 2)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </section>
        )}

        <section className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Line items</h3>
          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="w-[40%]">Item</TH>
                <TH className="w-[12%] text-right">Qty</TH>
                <TH className="w-[10%] pl-4">UOM</TH>
                <TH className="w-[18%] text-right">Unit price</TH>
                <TH className="w-[20%] text-right">Amount</TH>
              </tr>
            </THead>
            <TBody>
              {invoice.items.map((it) => (
                <TR key={it.id}>
                  <TD>
                    <p className="font-medium text-foreground truncate">{it.itemName}</p>
                    <p className="text-ref text-muted-foreground">{it.itemCode}</p>
                  </TD>
                  <TD className="text-right tabular-nums font-medium">
                    {formatQuantity(it.quantity)}
                  </TD>
                  <TD className="pl-4 text-xs text-muted-foreground uppercase">
                    {it.unitOfMeasure}
                  </TD>
                  <TD className="text-right tabular-nums text-muted-foreground">
                    {formatMoney(it.unitPrice, currency, 2)}
                  </TD>
                  <TD className="text-right tabular-nums font-medium">
                    {formatMoney(it.lineAmount, currency, 2)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>

        {(invoice.hasAttachment || invoice.notes) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5 space-y-1.5">
              <p className="font-medium text-muted-foreground">Supplier invoice attachment</p>
              {invoice.hasAttachment ? (
                <button
                  type="button"
                  onClick={() =>
                    void financeService.downloadAttachment(invoice.id, invoice.attachmentFileName)
                  }
                  className="flex w-full items-center gap-2 rounded-md border border-border/80 bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{invoice.attachmentFileName || 'Download attachment'}</span>
                  <Download className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />
                </button>
              ) : (
                <p className="text-muted-foreground">No attachment provided.</p>
              )}
            </div>

            <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5 space-y-1.5">
              <p className="font-medium text-muted-foreground">Notes</p>
              <p className="text-foreground whitespace-pre-wrap">
                {invoice.notes || 'No additional notes.'}
              </p>
            </div>
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
