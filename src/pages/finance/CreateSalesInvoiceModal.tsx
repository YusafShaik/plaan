import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateField } from '../../components/ui/DateField'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { financeService } from '../../services/financeService'
import { useAuth } from '../../hooks/useAuth'
import { toast } from '../../lib/feedback'
import { formatMoney, formatQuantity } from '../../lib/format'
import type {
  SalesInvoice,
  SalesInvoiceStatus,
  EligibleDispatch,
  CreateSalesInvoicePayload,
  UpdateSalesInvoicePayload,
} from '../../types/finance'

export interface CreateSalesInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  invoiceToEdit?: SalesInvoice | null
}

interface ItemFormRow {
  dispatchOrderItemId: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  quantity: number
  unitPrice: number
  lineAmount: number
}

export function CreateSalesInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  invoiceToEdit,
}: CreateSalesInvoiceModalProps) {
  const { organization } = useAuth()
  const currency = organization?.baseCurrency
  const isEditing = Boolean(invoiceToEdit)

  const [invoiceNumber, setInvoiceNumber] = useState('SI-...')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [paymentDueDate, setPaymentDueDate] = useState('')
  const [selectedDispatchId, setSelectedDispatchId] = useState<number | ''>('')
  const [eligibleDispatches, setEligibleDispatches] = useState<EligibleDispatch[]>([])
  const [selectedDispatch, setSelectedDispatch] = useState<EligibleDispatch | null>(null)
  const [formItems, setFormItems] = useState<ItemFormRow[]>([])
  const [taxAmountInput, setTaxAmountInput] = useState<string>('')
  const [notes, setNotes] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    Promise.resolve().then(() => {
      if (!isMounted) return
      setError(null)
      setIsLoading(true)

      if (invoiceToEdit) {
        setInvoiceNumber(invoiceToEdit.invoiceNumber)
        setInvoiceDate(invoiceToEdit.invoiceDate)
        setPaymentDueDate(invoiceToEdit.paymentDueDate || '')
        setSelectedDispatchId(invoiceToEdit.dispatchOrderId)
        setSelectedDispatch({
          id: invoiceToEdit.dispatchOrderId,
          dispatchNumber: invoiceToEdit.dispatchNumber,
          salesOrderId: invoiceToEdit.salesOrderId,
          salesOrderNumber: invoiceToEdit.salesOrderNumber,
          customerId: invoiceToEdit.customerId,
          customerCode: invoiceToEdit.customerCode,
          customerName: invoiceToEdit.customerName,
          billingAddress: invoiceToEdit.billingAddress,
          shippingAddress: invoiceToEdit.shippingAddress,
          warehouseId: 0,
          warehouseCode: '',
          warehouseName: '',
          dispatchDate: '',
          items: [],
        })
        setFormItems(
          invoiceToEdit.items.map((it) => ({
            dispatchOrderItemId: it.dispatchOrderItemId,
            itemId: it.itemId,
            itemCode: it.itemCode,
            itemName: it.itemName,
            unitOfMeasure: it.unitOfMeasure,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineAmount: it.lineAmount,
          }))
        )
        setTaxAmountInput(invoiceToEdit.taxAmount ? String(invoiceToEdit.taxAmount) : '')
        setNotes(invoiceToEdit.notes || '')
        setIsLoading(false)
      } else {
        setInvoiceDate(new Date().toISOString().split('T')[0])
        setPaymentDueDate('')
        setSelectedDispatchId('')
        setSelectedDispatch(null)
        setFormItems([])
        setTaxAmountInput('')
        setNotes('')

        Promise.all([
          financeService.getNextSalesInvoiceNumber(),
          financeService.getEligibleDispatches(),
        ])
          .then(([nextNumRes, eligibleRes]) => {
            if (!isMounted) return
            setInvoiceNumber(nextNumRes.nextCode)
            setEligibleDispatches(eligibleRes)
          })
          .catch((err: unknown) => {
            if (!isMounted) return
            setError(err instanceof Error ? err.message : 'Failed to initialize invoice form.')
          })
          .finally(() => {
            if (isMounted) setIsLoading(false)
          })
      }
    })

    return () => {
      isMounted = false
    }
  }, [isOpen, invoiceToEdit])

  const handleSelectDispatch = (dispatchIdStr: string) => {
    const dispatchId = Number(dispatchIdStr)
    setSelectedDispatchId(dispatchId || '')
    setError(null)

    const match = eligibleDispatches.find((d) => d.id === dispatchId)
    if (match) {
      setSelectedDispatch(match)
      setFormItems(
        match.items.map((item) => ({
          dispatchOrderItemId: item.dispatchOrderItemId,
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unitOfMeasure: item.unitOfMeasure,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineAmount: item.lineAmount,
        }))
      )
    } else {
      setSelectedDispatch(null)
      setFormItems([])
    }
  }

  const subtotal = useMemo(() => {
    return formItems.reduce((sum, item) => sum + (item.lineAmount || 0), 0)
  }, [formItems])

  const parsedTax = useMemo(() => {
    const val = Number(taxAmountInput)
    return Number.isFinite(val) && val >= 0 ? val : 0
  }, [taxAmountInput])

  const invoiceTotal = useMemo(() => {
    return Number((subtotal + parsedTax).toFixed(2))
  }, [subtotal, parsedTax])

  const handleSubmit = async (targetStatus: SalesInvoiceStatus, e?: FormEvent) => {
    e?.preventDefault()
    setError(null)

    if (!selectedDispatchId) {
      setError('Please select a posted dispatch.')
      return
    }
    if (formItems.length === 0) {
      setError('Invoice must contain at least one line item.')
      return
    }
    if (parsedTax < 0) {
      setError('Tax amount cannot be negative.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && invoiceToEdit) {
        const payload: UpdateSalesInvoicePayload = {
          invoiceDate,
          paymentDueDate: paymentDueDate || undefined,
          taxAmount: parsedTax,
          notes: notes.trim() || undefined,
          status: targetStatus,
        }
        await financeService.updateSalesInvoice(invoiceToEdit.id, payload)
        toast.success(
          targetStatus === 'POSTED'
            ? `Invoice ${invoiceToEdit.invoiceNumber} posted`
            : `Invoice ${invoiceToEdit.invoiceNumber} updated`
        )
      } else {
        const payload: CreateSalesInvoicePayload = {
          invoiceNumber: invoiceNumber.startsWith('SI-...') ? undefined : invoiceNumber,
          invoiceDate,
          paymentDueDate: paymentDueDate || undefined,
          dispatchOrderId: Number(selectedDispatchId),
          taxAmount: parsedTax,
          notes: notes.trim() || undefined,
          status: targetStatus,
        }
        const created = await financeService.createSalesInvoice(payload)
        toast.success(
          targetStatus === 'POSTED'
            ? `Invoice ${created.invoiceNumber} posted`
            : `Invoice ${created.invoiceNumber} saved as draft`
        )
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save sales invoice.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[780px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <form onSubmit={(e) => handleSubmit('DRAFT', e)} className="space-y-4">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {isEditing ? `Edit sales invoice · ${invoiceNumber}` : 'Create sales invoice'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bill a customer from a posted dispatch order.
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

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                Invoice number
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="tabular-nums text-sm font-medium text-foreground">
                  {invoiceNumber}
                </span>
                {!isEditing && (
                  <span className="text-xs text-muted-foreground select-none">Auto</span>
                )}
              </div>
            </div>

            <DateField
              label="Invoice date *"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
              disabled={isLoading || isSubmitting}
            />

            <DateField
              label="Payment due date"
              value={paymentDueDate}
              onChange={(e) => setPaymentDueDate(e.target.value)}
              disabled={isLoading || isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              {isEditing ? (
                <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
                  <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                    Dispatch *
                  </span>
                  <span className="tabular-nums text-sm font-medium text-foreground">
                    {selectedDispatch?.dispatchNumber || '—'}
                  </span>
                </div>
              ) : (
                <Select
                  label="Dispatch *"
                  value={selectedDispatchId ? String(selectedDispatchId) : ''}
                  onChange={handleSelectDispatch}
                  disabled={isLoading || isSubmitting}
                  placeholder="Select posted dispatch..."
                  options={eligibleDispatches.map((d) => ({
                    value: String(d.id),
                    label: `${d.dispatchNumber} · ${d.customerName} (${d.salesOrderNumber})`,
                  }))}
                />
              )}
            </div>

            <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                Sales order
              </span>
              <span className="tabular-nums text-sm font-medium text-foreground truncate">
                {selectedDispatch?.salesOrderNumber || 'Auto-populated'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                Customer
              </span>
              <span className="text-sm font-medium text-foreground truncate">
                {selectedDispatch?.customerName || 'Auto-populated from dispatch'}
              </span>
            </div>

            <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                Billing address
              </span>
              <span className="text-sm font-medium text-foreground truncate">
                {selectedDispatch?.billingAddress || selectedDispatch?.shippingAddress || '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground">Invoice items</h3>
          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            {formItems.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-muted-foreground">
                Select a dispatch above to automatically populate dispatched items and selling prices.
              </div>
            ) : (
              <Table className="border-0 rounded-none" tableClassName="table-fixed">
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
                  {formItems.map((item) => (
                    <TR key={item.dispatchOrderItemId}>
                      <TD>
                        <p className="font-medium text-foreground truncate">{item.itemName}</p>
                        <p className="text-ref text-muted-foreground">{item.itemCode}</p>
                      </TD>
                      <TD className="text-right tabular-nums font-medium">
                        {formatQuantity(item.quantity)}
                      </TD>
                      <TD className="pl-4 text-xs text-muted-foreground uppercase">
                        {item.unitOfMeasure}
                      </TD>
                      <TD className="text-right tabular-nums text-muted-foreground">
                        {formatMoney(item.unitPrice, currency, 2)}
                      </TD>
                      <TD className="text-right tabular-nums font-medium">
                        {formatMoney(item.lineAmount, currency, 2)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}

            <div className="flex flex-wrap items-center justify-end gap-5 border-t border-border/80 bg-surface-muted/50 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatMoney(subtotal, currency, 2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tax amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxAmountInput}
                  onChange={(e) => setTaxAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="h-8 w-24 rounded-md border border-border/80 bg-card px-2.5 text-right text-xs font-medium tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div className="flex items-center gap-2 border-l border-border/80 pl-4">
                <span className="font-medium text-foreground">Invoice total</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatMoney(invoiceTotal, currency, 2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Input
          label="Notes"
          placeholder="Optional invoice notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isLoading || isSubmitting}
        />

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
            Post invoice
          </Button>
        </div>
      </form>
    </Modal>
  )
}
