import { useState } from 'react'
import {
  X,
  Download,
  FileText,
  CheckCircle2,
  Trash2,
  Edit,
  Wallet,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, RefCode } from '../../components/ui/Table'
import { financeService } from '../../services/financeService'
import type { PurchaseInvoice, PaymentMethod, InvoicePaymentStatus } from '../../types/finance'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
}

function paymentStatusBadge(status: InvoicePaymentStatus) {
  if (status === 'PAID') return <Badge variant="success">Paid</Badge>
  if (status === 'PARTIALLY_PAID') return <Badge variant="warning">Partially Paid</Badge>
  return <Badge variant="neutral">Unpaid</Badge>
}

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
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen || !invoice) return null

  const isPosted = invoice.status === 'POSTED'
  const paymentStatus = invoice.paymentStatus || 'UNPAID'
  const paymentHistory = invoice.paymentHistory || []
  const percentPaid =
    invoice.totalAmount > 0
      ? Math.round((invoice.paidAmount / invoice.totalAmount) * 1000) / 10
      : 0
  const canRecordPayment = isPosted && invoice.outstandingAmount > 0

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val)
  }

  const handleDownloadPdf = async () => {
    setIsProcessing(true)
    try {
      await financeService.downloadPdf(invoice.id, invoice.invoiceNumber)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download PDF')
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
    if (!window.confirm('Are you sure you want to delete this draft invoice?')) return
    setIsProcessing(true)
    try {
      await onDelete(invoice.id)
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[780px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Finance / Purchase Invoices / {invoice.invoiceNumber}
            </p>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl font-medium tracking-tight text-foreground">
                {invoice.invoiceNumber}
              </span>
              {isPosted ? (
                <Badge variant="success">Posted</Badge>
              ) : (
                <Badge variant="warning">Draft</Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {invoice.supplierName} · {formatCurrency(invoice.totalAmount)}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-md border border-border/80 bg-secondary/30 p-4">
            <span className="text-[11px] font-medium text-muted-foreground">Invoice Total</span>
            <div className="mt-1 text-xl font-semibold text-foreground">
              {formatCurrency(invoice.totalAmount)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Subtotal: {formatCurrency(invoice.subtotal)} + Tax: {formatCurrency(invoice.taxAmount)}
            </p>
          </div>

          <div className="rounded-md border border-border/80 bg-secondary/30 p-4">
            <span className="text-[11px] font-medium text-muted-foreground">Total Paid</span>
            <div className="mt-1 text-xl font-semibold text-success">
              {formatCurrency(invoice.paidAmount)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{percentPaid}% paid</p>
          </div>

          <div className="rounded-md border border-border/80 bg-secondary/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Outstanding</span>
              {isPosted && paymentStatusBadge(paymentStatus)}
            </div>
            <div className="mt-1 text-xl font-semibold text-foreground">
              {formatCurrency(invoice.outstandingAmount)}
            </div>
            <div className="mt-2 h-1.5 w-full bg-secondary rounded-md overflow-hidden">
              <div
                className="h-full bg-success rounded-md"
                style={{ width: `${Math.min(100, percentPaid)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Supplier Bill #</span>
            <p className="mt-1">
              <RefCode>{invoice.supplierInvoiceNumber}</RefCode>
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Invoice Date</span>
            <p className="mt-1 font-medium text-foreground">{invoice.invoiceDate}</p>
          </div>
          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Payment Due</span>
            <p className="mt-1 font-medium text-foreground">
              {invoice.paymentDueDate || 'Not set'}
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Goods Receipt</span>
            <p className="mt-1">
              <RefCode>{invoice.grnNumber}</RefCode>
            </p>
          </div>
        </div>

        {isPosted && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
              {canRecordPayment && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRecordPayment?.(invoice)}
                >
                  <Wallet className="h-3.5 w-3.5 mr-1.5" />
                  Record Payment
                </Button>
              )}
            </div>
            {paymentHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border/80 py-4 text-center">
                No payments recorded yet.
              </p>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Reference</TH>
                    <TH>Method</TH>
                    <TH className="text-right">Amount</TH>
                  </tr>
                </THead>
                <TBody>
                  {paymentHistory.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <RefCode>{p.paymentNumber}</RefCode>
                      </TD>
                      <TD className="text-muted-foreground">
                        {METHOD_LABEL[p.paymentMethod]}
                      </TD>
                      <TD className="text-right font-mono font-medium">
                        {formatCurrency(p.amount)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        )}

        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
          <Table>
            <THead>
              <tr>
                <TH>Item</TH>
                <TH className="text-right">Qty</TH>
                <TH className="text-center">UOM</TH>
                <TH className="text-right">Unit Price</TH>
                <TH className="text-right">Amount</TH>
              </tr>
            </THead>
            <TBody>
              {invoice.items.map((it) => (
                <TR key={it.id}>
                  <TD>
                    <p className="font-medium">{it.itemName}</p>
                    <p className="text-[11px] text-ref text-muted-foreground">{it.itemCode}</p>
                  </TD>
                  <TD className="text-right font-mono">{it.quantity}</TD>
                  <TD className="text-center text-muted-foreground">{it.unitOfMeasure}</TD>
                  <TD className="text-right font-mono">{formatCurrency(it.unitPrice)}</TD>
                  <TD className="text-right font-mono font-medium">
                    {formatCurrency(it.lineAmount)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] text-muted-foreground block mb-1 font-medium">
              Supplier Invoice Attachment
            </span>
            {invoice.hasAttachment ? (
              <button
                type="button"
                onClick={() =>
                  financeService.downloadAttachment(invoice.id, invoice.attachmentFileName)
                }
                className="flex items-center gap-2 rounded-md border border-border/80 bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[200px]">
                  {invoice.attachmentFileName || 'Download Attachment'}
                </span>
                <Download className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
              </button>
            ) : (
              <p className="text-xs text-muted-foreground italic">No attachment provided</p>
            )}
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block mb-1 font-medium">Notes</span>
            <p className="text-xs text-foreground bg-secondary/30 p-2 rounded-md border border-border/80 min-h-[36px]">
              {invoice.notes || 'No additional notes'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/80 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={handleDownloadPdf}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download PDF
          </Button>

          <div className="flex items-center gap-2">
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
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit Draft
                </Button>
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
                  variant="primary"
                  size="sm"
                  disabled={isProcessing}
                  onClick={handlePost}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Post Invoice
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
                <Wallet className="h-4 w-4 mr-1.5" />
                Record Payment
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
