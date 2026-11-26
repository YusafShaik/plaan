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
  SupplierPayment,
  SupplierPaymentStatus,
  PaymentMethod,
  EligiblePurchaseInvoice,
  CreateSupplierPaymentPayload,
  UpdateSupplierPaymentPayload,
} from '../../types/finance'

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
]

export interface CreateSupplierPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  paymentToEdit?: SupplierPayment | null
  preselectedInvoiceId?: number | null
}

export function CreateSupplierPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  paymentToEdit,
  preselectedInvoiceId,
}: CreateSupplierPaymentModalProps) {
  const isEditing = Boolean(paymentToEdit)

  const [paymentNumber, setPaymentNumber] = useState('PAY-...')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | ''>('')
  const [eligibleInvoices, setEligibleInvoices] = useState<EligiblePurchaseInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<EligiblePurchaseInvoice | null>(null)
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

    if (paymentToEdit) {
      setPaymentNumber(paymentToEdit.paymentNumber)
      setPaymentDate(paymentToEdit.paymentDate)
      setSelectedInvoiceId(paymentToEdit.purchaseInvoiceId)
      setSelectedInvoice({
        id: paymentToEdit.purchaseInvoiceId,
        invoiceNumber: paymentToEdit.invoiceNumber,
        invoiceDate: '',
        supplierId: paymentToEdit.supplierId,
        supplierCode: paymentToEdit.supplierCode,
        supplierName: paymentToEdit.supplierName,
        totalAmount: paymentToEdit.invoiceTotal,
        paidAmount: paymentToEdit.previouslyPaid,
        outstandingAmount: paymentToEdit.outstandingAmount,
      })
      setAmountInput(String(paymentToEdit.amount))
      setPaymentMethod(paymentToEdit.paymentMethod)
      setPaymentReference(paymentToEdit.paymentReference || '')
      setNotes(paymentToEdit.notes || '')
      setIsLoading(false)
      return
    }

    setPaymentDate(new Date().toISOString().split('T')[0])
    setAmountInput('')
    setPaymentMethod('BANK_TRANSFER')
    setPaymentReference('')
    setNotes('')
    setSelectedInvoiceId('')
    setSelectedInvoice(null)

    Promise.all([
      financeService.getNextPaymentNumber(),
      financeService.getEligiblePurchaseInvoices(),
    ])
      .then(async ([next, eligible]) => {
        if (!mounted) return
        setPaymentNumber(next.nextCode)
        setEligibleInvoices(eligible)

        const presetId = preselectedInvoiceId
        if (presetId) {
          const match = eligible.find((i) => i.id === presetId)
          if (match) {
            setSelectedInvoiceId(match.id)
            setSelectedInvoice(match)
          } else {
            try {
              const details = await financeService.getPurchaseInvoiceForPayment(presetId)
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
        setError(err instanceof Error ? err.message : 'Failed to initialize payment form')
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isOpen, paymentToEdit, preselectedInvoiceId])

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

  const handleSubmit = async (targetStatus: SupplierPaymentStatus, e?: FormEvent) => {
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
      setError('Payment amount cannot exceed the outstanding balance.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && paymentToEdit) {
        const payload: UpdateSupplierPaymentPayload = {
          paymentDate,
          amount: parsedAmount,
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
          status: targetStatus,
        }
        await financeService.updateSupplierPayment(paymentToEdit.id, payload)
      } else {
        const payload: CreateSupplierPaymentPayload = {
          paymentNumber: paymentNumber.startsWith('PAY-...') ? undefined : paymentNumber,
          paymentDate,
          purchaseInvoiceId: Number(selectedInvoiceId),
          amount: parsedAmount,
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
          status: targetStatus,
        }
        await financeService.createSupplierPayment(payload)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save payment')
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
              Finance / Payments / {isEditing ? paymentNumber : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isEditing ? `Edit Payment · ${paymentNumber}` : 'Record Supplier Payment'}
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
            label="Payment Number"
            value={paymentNumber}
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
            label="Payment Date *"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />

          {isEditing ? (
            <Input
              label="Purchase Invoice *"
              value={selectedInvoice?.invoiceNumber || ''}
              readOnly
              disabled
            />
          ) : (
            <Select
              label="Purchase Invoice *"
              value={selectedInvoiceId ? String(selectedInvoiceId) : ''}
              onChange={handleSelectInvoice}
              disabled={isLoading || isSubmitting}
              placeholder="Select invoice..."
              options={eligibleInvoices.map((inv) => ({
                value: String(inv.id),
                label: `${inv.invoiceNumber} · ${inv.supplierName}`,
              }))}
            />
          )}

          <Input
            label="Supplier"
            value={selectedInvoice?.supplierName || ''}
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
              <span className="text-muted-foreground">Previously Paid</span>
              <span className="font-medium text-foreground">
                {formatCurrency(selectedInvoice.paidAmount)}
              </span>
            </div>
            <div className="border-t border-border/80 pt-2 flex justify-between">
              <span className="font-semibold text-foreground">Outstanding Amount</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(selectedInvoice.outstandingAmount)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Payment Amount *"
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
            <span className="text-muted-foreground">Remaining Payable</span>
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
              Post Payment
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
