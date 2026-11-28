import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateField } from '../../components/ui/DateField'
import { Alert } from '../../components/ui/Alert'
import { financeService } from '../../services/financeService'
import { toast } from '../../lib/feedback'
import { PAYMENT_METHOD_OPTIONS } from './financeHelpers'
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  PaymentMethod,
  CreateExpensePayload,
  UpdateExpensePayload,
} from '../../types/finance'

export interface CreateExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  expenseToEdit?: Expense | null
}

export function CreateExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit,
}: CreateExpenseModalProps) {
  const isEditing = Boolean(expenseToEdit)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [expenseNumber, setExpenseNumber] = useState('EXP-...')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER')
  const [paidTo, setPaidTo] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [notes, setNotes] = useState('')
  const [attachmentFileName, setAttachmentFileName] = useState<string | undefined>()
  const [attachmentContentType, setAttachmentContentType] = useState<string | undefined>()
  const [attachmentData, setAttachmentData] = useState<string | undefined>()
  const [attachmentSize, setAttachmentSize] = useState<number | null>(null)
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

      if (expenseToEdit) {
        setExpenseNumber(expenseToEdit.expenseNumber)
        setExpenseDate(expenseToEdit.expenseDate)
        setCategoryId(expenseToEdit.categoryId)
        setDescription(expenseToEdit.description)
        setAmountInput(String(expenseToEdit.amount))
        setPaymentMethod(expenseToEdit.paymentMethod)
        setPaidTo(expenseToEdit.paidTo || '')
        setPaymentReference(expenseToEdit.paymentReference || '')
        setNotes(expenseToEdit.notes || '')
        setAttachmentFileName(expenseToEdit.attachmentFileName)
        setAttachmentContentType(expenseToEdit.attachmentContentType)
        setAttachmentData(undefined)
        setAttachmentSize(null)
        financeService
          .getExpenseCategories()
          .then((cats) => {
            if (mounted) setCategories(cats)
          })
          .catch((err: unknown) => {
            if (mounted) setError(err instanceof Error ? err.message : 'Failed to load categories.')
          })
          .finally(() => {
            if (mounted) setIsLoading(false)
          })
        return
      }

      setExpenseDate(new Date().toISOString().split('T')[0])
      setCategoryId('')
      setDescription('')
      setAmountInput('')
      setPaymentMethod('BANK_TRANSFER')
      setPaidTo('')
      setPaymentReference('')
      setNotes('')
      setAttachmentFileName(undefined)
      setAttachmentContentType(undefined)
      setAttachmentData(undefined)
      setAttachmentSize(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      Promise.all([financeService.getNextExpenseNumber(), financeService.getExpenseCategories()])
        .then(([next, cats]) => {
          if (!mounted) return
          setExpenseNumber(next.nextCode)
          setCategories(cats)
          if (cats.length > 0) setCategoryId(cats[0].id)
        })
        .catch((err: unknown) => {
          if (!mounted) return
          setError(err instanceof Error ? err.message : 'Failed to initialize expense form.')
        })
        .finally(() => {
          if (mounted) setIsLoading(false)
        })
    })

    return () => {
      mounted = false
    }
  }, [isOpen, expenseToEdit])

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachmentFileName(file.name)
    setAttachmentContentType(file.type)
    setAttachmentSize(file.size)
    const reader = new FileReader()
    reader.onload = () => setAttachmentData(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveAttachment = () => {
    setAttachmentFileName(undefined)
    setAttachmentContentType(undefined)
    setAttachmentData(undefined)
    setAttachmentSize(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (targetStatus: ExpenseStatus, e?: FormEvent) => {
    e?.preventDefault()
    setError(null)

    if (!categoryId) {
      setError('Expense category is required.')
      return
    }
    if (!description.trim()) {
      setError('Description is required.')
      return
    }
    const amount = Number(amountInput)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Amount must be greater than zero.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && expenseToEdit) {
        const payload: UpdateExpensePayload = {
          expenseDate,
          categoryId: Number(categoryId),
          description: description.trim(),
          amount,
          paymentMethod,
          paidTo: paidTo.trim() || undefined,
          paymentReference: paymentReference.trim() || undefined,
          attachmentFileName,
          attachmentContentType,
          attachmentData,
          notes: notes.trim() || undefined,
          status: targetStatus,
        }
        await financeService.updateExpense(expenseToEdit.id, payload)
        toast.success(
          targetStatus === 'POSTED'
            ? `Expense ${expenseToEdit.expenseNumber} posted`
            : `Expense ${expenseToEdit.expenseNumber} updated`
        )
      } else {
        const payload: CreateExpensePayload = {
          expenseNumber: expenseNumber.startsWith('EXP-...') ? undefined : expenseNumber,
          expenseDate,
          categoryId: Number(categoryId),
          description: description.trim(),
          amount,
          paymentMethod,
          paidTo: paidTo.trim() || undefined,
          paymentReference: paymentReference.trim() || undefined,
          attachmentFileName,
          attachmentContentType,
          attachmentData,
          notes: notes.trim() || undefined,
          status: targetStatus,
        }
        const created = await financeService.createExpense(payload)
        toast.success(
          targetStatus === 'POSTED'
            ? `Expense ${created.expenseNumber} posted`
            : `Expense ${created.expenseNumber} saved as draft`
        )
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save expense.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[680px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <form onSubmit={(e) => handleSubmit('DRAFT', e)} className="space-y-4">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {isEditing ? `Edit expense · ${expenseNumber}` : 'Record expense'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Log paid operating expenses, categories, and supporting bills.
            </p>
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
              Expense number
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="tabular-nums text-sm font-medium text-foreground">
                {expenseNumber}
              </span>
              {!isEditing && (
                <span className="text-xs text-muted-foreground select-none">Auto</span>
              )}
            </div>
          </div>

          <DateField
            label="Expense date *"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Expense category *"
            value={categoryId ? String(categoryId) : ''}
            onChange={(v) => setCategoryId(v ? Number(v) : '')}
            disabled={isLoading || isSubmitting}
            placeholder="Select category..."
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          />

          <Input
            label="Description *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this expense for?"
            required
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Amount *"
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
            label="Paid to"
            placeholder="Person or company"
            value={paidTo}
            onChange={(e) => setPaidTo(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
          <Input
            label="Payment reference"
            placeholder="Optional reference"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            {attachmentFileName ? (
              <div className="flex min-h-14 items-center justify-between rounded-md border border-border/80 bg-surface-subtle px-3.5 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {attachmentFileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attachmentSize
                        ? `${(attachmentSize / 1024).toFixed(1)} KB`
                        : isEditing
                          ? 'Existing attachment'
                          : 'Attached'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAttachment}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-14 w-full items-center justify-between rounded-md border border-dashed border-border/80 bg-surface-subtle px-3.5 py-2 text-left transition-colors hover:border-foreground/50 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    Upload bill / receipt (optional)
                  </p>
                  <p className="text-xs text-muted-foreground">PDF or image</p>
                </div>
                <UploadCloud className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )}
          </div>

          <Input
            label="Notes"
            placeholder="Optional expense notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
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
            Post expense
          </Button>
        </div>
      </form>
    </Modal>
  )
}
