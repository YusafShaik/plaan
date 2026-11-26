import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { X, Sparkles } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateField } from '../../components/ui/DateField'
import { Alert } from '../../components/ui/Alert'
import { financeService } from '../../services/financeService'
import type {
  CustomerReceipt,
  CustomerReceiptStatus,
  PaymentMethod,
  EligibleSalesInvoice,
  CreateCustomerReceiptPayload,
  UpdateCustomerReceiptPayload,
} from '../../types/finance'

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
]

export interface CreateCustomerReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  receiptToEdit?: CustomerReceipt | null
  preselectedInvoiceId?: number | null
}

export function CreateCustomerReceiptModal({
  isOpen,
  onClose,
  onSuccess,
  receiptToEdit,
  preselectedInvoiceId,
}: CreateCustomerReceiptModalProps) {
  const isEditing = Boolean(receiptToEdit)

  const [receiptNumber, setReceiptNumber] = useState('REC-...')
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | ''>('')
  const [eligibleInvoices, setEligibleInvoices] = useState<EligibleSalesInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<EligibleSalesInvoice | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER')
  const [paymentReference, setPaymentReference] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!isOpen) return

    setError(null)
    setIsLoading(true)

    if (receiptToEdit) {
      setReceiptNumber(receiptToEdit.receiptNumber)
      setReceiptDate(receiptToEdit.receiptDate)
      setSelectedInvoiceId(receiptToEdit.salesInvoiceId)
      setSelectedInvoice({
        id: receiptToEdit.salesInvoiceId,
        invoiceNumber: receiptToEdit.invoiceNumber,
        invoiceDate: '',
        customerId: receiptToEdit.customerId,
        customerCode: receiptToEdit.customerCode,
        customerName: receiptToEdit.customerName,
        totalAmount: receiptToEdit.invoiceTotal,
        receivedAmount: receiptToEdit.previouslyReceived,
        outstandingAmount: receiptToEdit.outstandingAmount,
      })
      setAmountInput(String(receiptToEdit.amount))
      setPaymentMethod(receiptToEdit.paymentMethod)
      setPaymentReference(receiptToEdit.paymentReference || '')
      setNotes(receiptToEdit.notes || '')
      setIsLoading(false)
      return
    }

    setReceiptDate(new Date().toISOString().split('T')[0])
    setAmountInput('')
    setPaymentMethod('BANK_TRANSFER')
    setPaymentReference('')
    setNotes('')
    setSelectedInvoiceId('')
    setSelectedInvoice(null)

    Promise.all([
      financeService.getNextReceiptNumber(),
      financeService.getEligibleSalesInvoices(),
    ])
      .then(async ([next, eligible]) => {
        if (!mounted) return
        setReceiptNumber(next.nextCode)
        setEligibleInvoices(eligible)

        const presetId = preselectedInvoiceId
        if (presetId) {
          const match = eligible.find((i) => i.id === presetId)
          if (match) {
            setSelectedInvoiceId(match.id)
            setSelectedInvoice(match)
          } else {
            try {
              const details = await financeService.getSalesInvoiceForReceipt(presetId)
              if (!mounted) return
              setEligibleInvoices((prev) =>
                prev.some((i) => i.id === details.id) ? prev : [details, ...prev]
              )
              setSelectedInvoiceId(details.id)
              setSelectedInvoice(details)
            } catch {
              // invoice may already be fully paid
            }
          }
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to initialize receipt form')
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isOpen, receiptToEdit, preselectedInvoiceId])

  const parsedAmount = useMemo(() => {
    const val = parseFloat(amountInput)
    return isNaN(val) ? 0 : val
  }, [amountInput])

  const remainingPayable = useMemo(() => {
    if (!selectedInvoice) return 0
    return Number((selectedInvoice.outstandingAmount - parsedAmount).toFixed(2))
  }, [selectedInvoice, parsedAmount])

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val)
  }

  const handleSelectInvoice = (idStr: string) => {
    const id = Number(idStr)
    setSelectedInvoiceId(id || '')
    const match = eligibleInvoices.find((i) => i.id === id) || null
    setSelectedInvoice(match)
    setError(null)
  }

  const handleSubmit = async (targetStatus: CustomerReceiptStatus, e?: FormEvent) => {
    if (e) e.preventDefault()
    setError(null)

    if (!selectedInvoiceId) {
      setError('Please select a purchase invoice.')
      return
    }
    if (parsedAmount <= 0) {
      setError('Payment amount must be greater than zero.')
      return
    }
    if (selectedInvoice && parsedAmount > selectedInvoice.outstandingAmount) {
      setError('Receipt amount cannot exceed the outstanding receivable.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && receiptToEdit) {
        const payload: UpdateCustomerReceiptPayload = {
          receiptDate,
          amount: parsedAmount,
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
          status: targetStatus,
        }
        await financeService.updateCustomerReceipt(receiptToEdit.id, payload)
      } else {
        const payload: CreateCustomerReceiptPayload = {
          receiptNumber: receiptNumber.startsWith('REC-...') ? undefined : receiptNumber,
          receiptDate,
          salesInvoiceId: Number(selectedInvoiceId),
          amount: parsedAmount,
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
          status: targetStatus,
        }
        await financeService.createCustomerReceipt(payload)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save receipt')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[640px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <form onSubmit={(e) => handleSubmit('DRAFT', e)} className="space-y-5">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Finance / Receipts / {isEditing ? receiptNumber : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isEditing ? `Edit Receipt · ${receiptNumber}` : 'Record Customer Receipt'}
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

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Receipt Number"
            value={receiptNumber}
            readOnly
            disabled
            className="font-mono text-sm"
            rightElement={
              !isEditing ? (
                <span className="text-[11px] font-medium text-brand flex items-center gap-1 select-none">
                  <Sparkles className="h-3 w-3" /> Auto
                </span>
              ) : undefined
            }
          />
          <DateField
            label="Receipt Date *"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />

          {isEditing ? (
            <Input
              label="Sales Invoice *"
              value={selectedInvoice?.invoiceNumber || ''}
              readOnly
              disabled
            />
          ) : (
            <Select
              label="Sales Invoice *"
              value={selectedInvoiceId ? String(selectedInvoiceId) : ''}
              onChange={handleSelectInvoice}
              disabled={isLoading || isSubmitting}
              placeholder="Select sales invoice..."
              options={eligibleInvoices.map((inv) => ({
                value: String(inv.id),
                label: `${inv.invoiceNumber} · ${inv.customerName}`,
              }))}
            />
          )}

          <Input
            label="Customer"
            value={selectedInvoice?.customerName || ''}
            placeholder="Auto-populated"
            readOnly
            disabled
          />
        </div>

        {selectedInvoice && (
          <div className="rounded-md border border-border/80 bg-secondary/30 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Total</span>
              <span className="font-medium text-foreground">
                {formatCurrency(selectedInvoice.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previously Received</span>
              <span className="font-medium text-foreground">
                {formatCurrency(selectedInvoice.receivedAmount)}
              </span>
            </div>
            <div className="border-t border-border/80 pt-2 flex justify-between">
              <span className="font-semibold text-foreground">Outstanding Receivable</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(selectedInvoice.outstandingAmount)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Receipt Amount *"
            type="number"
            min="0.01"
            step="0.01"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />
          <Select
            label="Payment Method *"
            value={paymentMethod}
            onChange={(v) => setPaymentMethod(v as PaymentMethod)}
            disabled={isLoading || isSubmitting}
            options={METHOD_OPTIONS}
          />
        </div>

        <Input
          label="Payment Reference"
          placeholder="Transaction ID / Cheque number"
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
          disabled={isLoading || isSubmitting}
        />

        <div className="w-full">
          <div className="group relative flex min-h-[76px] w-full flex-col justify-start px-3.5 py-2.5 rounded-md border border-border/80 bg-secondary focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
            <span className="text-[11px] font-medium text-muted-foreground select-none leading-none mb-1">
              Notes
            </span>
            <textarea
              rows={2}
              placeholder="Optional payment information"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading || isSubmitting}
              className="w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/80 pt-4">
          <div className="text-xs">
            <span className="text-muted-foreground">Remaining Receivable</span>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {selectedInvoice ? formatCurrency(Math.max(0, remainingPayable)) : '—'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting}
              onClick={() => handleSubmit('POSTED')}
            >
              Post Receipt
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
