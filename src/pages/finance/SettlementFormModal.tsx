import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateField } from '../../components/ui/DateField'
import { Alert } from '../../components/ui/Alert'
import { useAuth } from '../../hooks/useAuth'
import { toast } from '../../lib/feedback'
import { formatMoney } from '../../lib/format'
import { PAYMENT_METHOD_OPTIONS } from './financeHelpers'
import type { PaymentMethod } from '../../types/finance'

export interface SettlementInvoiceOption {
  id: number
  invoiceNumber: string
  partyName: string
  totalAmount: number
  settledAmount: number
  outstandingAmount: number
}

export interface SettlementEditSnapshot {
  id: number
  number: string
  date: string
  invoiceId: number
  invoiceNumber: string
  partyName: string
  invoiceTotal: number
  previouslySettled: number
  outstandingAmount: number
  amount: number
  paymentMethod: PaymentMethod
  paymentReference?: string
  notes?: string
}

export interface SettlementFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  recordToEdit?: SettlementEditSnapshot | null
  preselectedInvoiceId?: number | null
  createTitle: string
  editTitlePrefix: string
  subtitle: string
  numberLabel: string
  dateLabel: string
  invoiceLabel: string
  partyLabel: string
  amountLabel: string
  previouslySettledLabel: string
  outstandingLabel: string
  remainingLabel: string
  submitLabel: string
  missingInvoiceError: string
  exceedBalanceError: string
  defaultPrefix: string
  getNextNumber: () => Promise<{ nextCode: string }>
  getEligibleInvoices: () => Promise<SettlementInvoiceOption[]>
  getInvoiceById: (invoiceId: number) => Promise<SettlementInvoiceOption>
  createRecord: (payload: {
    number?: string
    date: string
    invoiceId: number
    amount: number
    paymentMethod: PaymentMethod
    paymentReference?: string
    notes?: string
    status: 'DRAFT' | 'POSTED'
  }) => Promise<{ number: string }>
  updateRecord: (
    id: number,
    payload: {
      date: string
      amount: number
      paymentMethod: PaymentMethod
      paymentReference?: string
      notes?: string
      status: 'DRAFT' | 'POSTED'
    }
  ) => Promise<unknown>
}

export function SettlementFormModal({
  isOpen,
  onClose,
  onSuccess,
  recordToEdit,
  preselectedInvoiceId,
  createTitle,
  editTitlePrefix,
  subtitle,
  numberLabel,
  dateLabel,
  invoiceLabel,
  partyLabel,
  amountLabel,
  previouslySettledLabel,
  outstandingLabel,
  remainingLabel,
  submitLabel,
  missingInvoiceError,
  exceedBalanceError,
  defaultPrefix,
  getNextNumber,
  getEligibleInvoices,
  getInvoiceById,
  createRecord,
  updateRecord,
}: SettlementFormModalProps) {
  const { organization } = useAuth()
  const currency = organization?.baseCurrency
  const isEditing = Boolean(recordToEdit)

  const [recordNumber, setRecordNumber] = useState(`${defaultPrefix}...`)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | ''>('')
  const [eligibleInvoices, setEligibleInvoices] = useState<SettlementInvoiceOption[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<SettlementInvoiceOption | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER')
  const [paymentReference, setPaymentReference] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let mounted = true

    Promise.resolve().then(() => {
      if (!mounted) return
      setError(null)
      setIsLoading(true)

      if (recordToEdit) {
        setRecordNumber(recordToEdit.number)
        setDate(recordToEdit.date)
        setSelectedInvoiceId(recordToEdit.invoiceId)
        setSelectedInvoice({
          id: recordToEdit.invoiceId,
          invoiceNumber: recordToEdit.invoiceNumber,
          partyName: recordToEdit.partyName,
          totalAmount: recordToEdit.invoiceTotal,
          settledAmount: recordToEdit.previouslySettled,
          outstandingAmount: recordToEdit.outstandingAmount,
        })
        setAmountInput(String(recordToEdit.amount))
        setPaymentMethod(recordToEdit.paymentMethod)
        setPaymentReference(recordToEdit.paymentReference || '')
        setNotes(recordToEdit.notes || '')
        setIsLoading(false)
        return
      }

      setDate(new Date().toISOString().split('T')[0])
      setAmountInput('')
      setPaymentMethod('BANK_TRANSFER')
      setPaymentReference('')
      setNotes('')
      setSelectedInvoiceId('')
      setSelectedInvoice(null)

      Promise.all([getNextNumber(), getEligibleInvoices()])
        .then(async ([next, eligible]) => {
          if (!mounted) return
          setRecordNumber(next.nextCode)
          setEligibleInvoices(eligible)

          if (preselectedInvoiceId) {
            const match = eligible.find((i) => i.id === preselectedInvoiceId)
            if (match) {
              setSelectedInvoiceId(match.id)
              setSelectedInvoice(match)
            } else {
              try {
                const details = await getInvoiceById(preselectedInvoiceId)
                if (!mounted) return
                setEligibleInvoices((prev) =>
                  prev.some((i) => i.id === details.id) ? prev : [details, ...prev]
                )
                setSelectedInvoiceId(details.id)
                setSelectedInvoice(details)
              } catch {
                // Invoice may already be settled
              }
            }
          }
        })
        .catch((err: unknown) => {
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Failed to initialize form.')
          }
        })
        .finally(() => {
          if (mounted) setIsLoading(false)
        })
    })

    return () => {
      mounted = false
    }
  }, [
    isOpen,
    recordToEdit,
    preselectedInvoiceId,
    getNextNumber,
    getEligibleInvoices,
    getInvoiceById,
  ])

  const parsedAmount = useMemo(() => {
    const val = Number(amountInput)
    return Number.isFinite(val) && val > 0 ? val : 0
  }, [amountInput])

  const remainingBalance = useMemo(() => {
    if (!selectedInvoice) return 0
    return Number((selectedInvoice.outstandingAmount - parsedAmount).toFixed(2))
  }, [selectedInvoice, parsedAmount])

  const handleSelectInvoice = (idStr: string) => {
    const id = Number(idStr)
    setSelectedInvoiceId(id || '')
    setSelectedInvoice(eligibleInvoices.find((i) => i.id === id) || null)
    setError(null)
  }

  const handleSubmit = async (targetStatus: 'DRAFT' | 'POSTED', e?: FormEvent) => {
    e?.preventDefault()
    setError(null)

    if (!selectedInvoiceId) {
      setError(missingInvoiceError)
      return
    }
    if (parsedAmount <= 0) {
      setError('Amount must be greater than zero.')
      return
    }
    if (selectedInvoice && parsedAmount > selectedInvoice.outstandingAmount) {
      setError(exceedBalanceError)
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && recordToEdit) {
        await updateRecord(recordToEdit.id, {
          date,
          amount: parsedAmount,
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
          status: targetStatus,
        })
        toast.success(
          targetStatus === 'POSTED'
            ? `${recordToEdit.number} posted`
            : `${recordToEdit.number} updated`
        )
      } else {
        const created = await createRecord({
          number: recordNumber.startsWith(defaultPrefix) ? undefined : recordNumber,
          date,
          invoiceId: Number(selectedInvoiceId),
          amount: parsedAmount,
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
          status: targetStatus,
        })
        toast.success(
          targetStatus === 'POSTED'
            ? `${created.number} posted`
            : `${created.number} saved as draft`
        )
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save record.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[640px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <form onSubmit={(e) => handleSubmit('DRAFT', e)} className="space-y-4">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {isEditing ? `${editTitlePrefix} · ${recordNumber}` : createTitle}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
            <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
              {numberLabel}
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="tabular-nums text-sm font-medium text-foreground">
                {recordNumber}
              </span>
              {!isEditing && (
                <span className="text-xs text-muted-foreground select-none">Auto</span>
              )}
            </div>
          </div>

          <DateField
            label={dateLabel}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />

          {isEditing ? (
            <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                {invoiceLabel}
              </span>
              <span className="tabular-nums text-sm font-medium text-foreground">
                {selectedInvoice?.invoiceNumber || '—'}
              </span>
            </div>
          ) : (
            <Select
              label={invoiceLabel}
              value={selectedInvoiceId ? String(selectedInvoiceId) : ''}
              onChange={handleSelectInvoice}
              disabled={isLoading || isSubmitting}
              placeholder="Select invoice..."
              options={eligibleInvoices.map((inv) => ({
                value: String(inv.id),
                label: `${inv.invoiceNumber} · ${inv.partyName}`,
              }))}
            />
          )}

          <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
            <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
              {partyLabel}
            </span>
            <span className="text-sm font-medium text-foreground truncate">
              {selectedInvoice?.partyName || 'Auto-populated'}
            </span>
          </div>
        </div>

        {selectedInvoice && (
          <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice total</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatMoney(selectedInvoice.totalAmount, currency, 2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{previouslySettledLabel}</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatMoney(selectedInvoice.settledAmount, currency, 2)}
              </span>
            </div>
            <div className="border-t border-border/80 pt-2 flex justify-between">
              <span className="font-semibold text-foreground">{outstandingLabel}</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(selectedInvoice.outstandingAmount, currency, 2)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={amountLabel}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="tabular-nums"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />
          <Select
            label="Payment method *"
            value={paymentMethod}
            onChange={(v) => setPaymentMethod(v as PaymentMethod)}
            disabled={isLoading || isSubmitting}
            options={PAYMENT_METHOD_OPTIONS}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Payment reference"
            placeholder="Transaction ID / cheque number"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
          <Input
            label="Notes"
            placeholder="Optional payment notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="flex items-center justify-between border-t border-border/80 pt-4">
          <div className="text-xs">
            <span className="text-muted-foreground">{remainingLabel}</span>
            <p className="text-sm font-semibold tabular-nums text-foreground mt-0.5">
              {selectedInvoice ? formatMoney(Math.max(0, remainingBalance), currency, 2) : '—'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => void handleSubmit('DRAFT')}
            >
              Save draft
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting}
              onClick={() => void handleSubmit('POSTED')}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
