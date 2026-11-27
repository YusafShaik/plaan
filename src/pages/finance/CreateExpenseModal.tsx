import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react'
import { X, Sparkles, UploadCloud, FileText } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateField } from '../../components/ui/DateField'
import { Alert } from '../../components/ui/Alert'
import { financeService } from '../../services/financeService'
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  PaymentMethod,
  CreateExpensePayload,
  UpdateExpensePayload,
} from '../../types/finance'

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
]

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
    let mounted = true
    if (!isOpen) return

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
          if (mounted) setError(err instanceof Error ? err.message : 'Failed to load categories')
        })
        .finally(() => {
          if (mounted) setIsLoading(false)
        })
      return () => {
        mounted = false
      }
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
        setError(err instanceof Error ? err.message : 'Failed to initialize expense form')
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
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
    reader.onload = () => {
      setAttachmentData(reader.result as string)
    }
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
    if (e) e.preventDefault()
    setError(null)

    if (!categoryId) {
      setError('Expense category is required.')
      return
    }
    if (!description.trim()) {
      setError('Description is required.')
      return
    }
    const amount = parseFloat(amountInput)
    if (isNaN(amount) || amount <= 0) {
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
        await financeService.createExpense(payload)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save expense')
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Finance / Expenses / {isEditing ? expenseNumber : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isEditing ? `Edit Expense · ${expenseNumber}` : 'Record Expense'}
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
            label="Expense Number"
            value={expenseNumber}
            readOnly
            disabled
            className="tabular-nums text-sm"
            rightElement={
              !isEditing ? (
                <span className="text-xs font-medium text-brand flex items-center gap-1 select-none">
                  <Sparkles className="h-3 w-3" /> Auto
                </span>
              ) : undefined
            }
          />
          <DateField
            label="Expense Date *"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />
        </div>

        <Select
          label="Expense Category *"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Amount *"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Paid To"
            placeholder="Person or company"
            value={paidTo}
            onChange={(e) => setPaidTo(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
          <Input
            label="Payment Reference"
            placeholder="Optional reference"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-muted-foreground">
            Bill / Receipt Attachment
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {attachmentFileName ? (
            <div className="flex items-center justify-between rounded-md border border-border/80 bg-secondary/50 p-3">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">{attachmentFileName}</p>
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
                variant="outline"
                size="sm"
                onClick={handleRemoveAttachment}
                className="text-destructive hover:text-destructive h-7 px-2 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/80 p-5 text-center transition-colors hover:border-foreground/50 cursor-pointer bg-secondary/20"
            >
              <UploadCloud className="h-5 w-5 text-muted-foreground mb-1" />
              <p className="text-xs font-medium text-foreground">
                Upload supporting document (optional)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">PDF or image</p>
            </div>
          )}
        </div>

        <div className="w-full">
          <div className="group relative flex min-h-[76px] w-full flex-col justify-start px-3.5 py-2.5 rounded-md border border-border/80 bg-secondary focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
            <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1">
              Notes
            </span>
            <textarea
              rows={2}
              placeholder="Additional information"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading || isSubmitting}
              className="w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
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
            Post Expense
          </Button>
        </div>
      </form>
    </Modal>
  )
}
