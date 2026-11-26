import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { X, Sparkles } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateField } from '../../components/ui/DateField'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { Alert } from '../../components/ui/Alert'
import { financeService } from '../../services/financeService'
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
  const isEditing = Boolean(invoiceToEdit)

  const [invoiceNumber, setInvoiceNumber] = useState('SI-...')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [paymentDueDate, setPaymentDueDate] = useState('')
  const [selectedDispatchId, setSelectedDispatchId] = useState<number | ''>('')
  const [eligibleDispatches, setEligibleDispatches] = useState<EligibleDispatch[]>([])
  const [selectedDispatch, setSelectedDispatch] = useState<EligibleDispatch | null>(null)
  const [formItems, setFormItems] = useState<ItemFormRow[]>([])
  const [taxAmountInput, setTaxAmountInput] = useState<string>('0')
  const [notes, setNotes] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    if (!isOpen) return

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
      setTaxAmountInput(String(invoiceToEdit.taxAmount))
      setNotes(invoiceToEdit.notes || '')
      setIsLoading(false)
    } else {
      setInvoiceDate(new Date().toISOString().split('T')[0])
      setPaymentDueDate('')
      setSelectedDispatchId('')
      setSelectedDispatch(null)
      setFormItems([])
      setTaxAmountInput('0')
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
          setError(err instanceof Error ? err.message : 'Failed to initialize invoice form')
        })
        .finally(() => {
          if (isMounted) setIsLoading(false)
        })
    }

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
    const val = parseFloat(taxAmountInput)
    return isNaN(val) || val < 0 ? 0 : val
  }, [taxAmountInput])

  const invoiceTotal = useMemo(() => {
    return Number((subtotal + parsedTax).toFixed(2))
  }, [subtotal, parsedTax])

  const handleSubmit = async (targetStatus: SalesInvoiceStatus, e?: FormEvent) => {
    if (e) e.preventDefault()
    setError(null)

    if (!selectedDispatchId) {
      setError('Please select a posted Dispatch.')
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
        await financeService.createSalesInvoice(payload)
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save sales invoice')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[780px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <form onSubmit={(e) => handleSubmit('DRAFT', e)} className="space-y-5">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Finance / Sales Invoices / {isEditing ? invoiceNumber : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isEditing ? `Edit Sales Invoice · ${invoiceNumber}` : 'Create Sales Invoice'}
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
            label="Invoice Number"
            value={invoiceNumber}
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
            label="Invoice Date *"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />

          {isEditing ? (
            <Input
              label="Dispatch *"
              value={selectedDispatch?.dispatchNumber || ''}
              readOnly
              disabled
            />
          ) : (
            <Select
              label="Dispatch *"
              value={selectedDispatchId ? String(selectedDispatchId) : ''}
              onChange={handleSelectDispatch}
              disabled={isLoading || isSubmitting}
              placeholder="Select Dispatch..."
              options={eligibleDispatches.map((d) => ({
                value: String(d.id),
                label: `${d.dispatchNumber} · ${d.customerName} (${d.salesOrderNumber})`,
              }))}
            />
          )}

          <Input
            label="Sales Order"
            value={selectedDispatch?.salesOrderNumber || ''}
            placeholder="Auto-populated from Dispatch"
            readOnly
            disabled
          />

          <Input
            label="Customer"
            value={selectedDispatch?.customerName || ''}
            placeholder="Auto-populated from Dispatch"
            readOnly
            disabled
          />

          <DateField
            label="Payment Due Date"
            value={paymentDueDate}
            onChange={(e) => setPaymentDueDate(e.target.value)}
            disabled={isLoading || isSubmitting}
          />

          <div className="group relative flex min-h-[76px] w-full flex-col justify-start px-3.5 py-2.5 rounded-md border border-border/80 bg-secondary">
            <span className="text-[11px] font-medium text-muted-foreground select-none leading-none mb-1">
              Billing Address
            </span>
            <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
              {selectedDispatch?.billingAddress || '—'}
            </p>
          </div>

          <div className="group relative flex min-h-[76px] w-full flex-col justify-start px-3.5 py-2.5 rounded-md border border-border/80 bg-secondary">
            <span className="text-[11px] font-medium text-muted-foreground select-none leading-none mb-1">
              Shipping Address
            </span>
            <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
              {selectedDispatch?.shippingAddress || '—'}
            </p>
          </div>
        </div>

        <div className="border-t border-border/80 my-4" />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Invoice Items</h3>

          {formItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/80 py-7 text-center text-xs text-muted-foreground">
              Select a Dispatch above to automatically populate dispatched items and selling prices.
            </div>
          ) : (
            <div className="rounded-md border border-border/80 overflow-hidden">
              <Table>
                <THead>
                  <TR className="border-b border-border/60 bg-secondary/30">
                    <TH className="py-2.5 px-3 text-xs font-semibold text-muted-foreground">Item</TH>
                    <TH className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-right">Qty</TH>
                    <TH className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-center">UOM</TH>
                    <TH className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-right">Unit Price</TH>
                    <TH className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {formItems.map((item) => (
                    <TR key={item.dispatchOrderItemId} className="border-b border-border/40">
                      <TD className="py-2.5 px-3 text-xs font-medium text-foreground">
                        <div>{item.itemName}</div>
                        <div className="text-[11px] text-muted-foreground">{item.itemCode}</div>
                      </TD>
                      <TD className="py-2.5 px-3 text-xs text-right font-medium text-foreground">
                        {item.quantity}
                      </TD>
                      <TD className="py-2.5 px-3 text-xs text-center text-muted-foreground">
                        {item.unitOfMeasure}
                      </TD>
                      <TD className="py-2.5 px-3 text-xs text-right font-medium text-foreground">
                        {formatCurrency(item.unitPrice)}
                      </TD>
                      <TD className="py-2.5 px-3 text-xs text-right font-medium text-foreground">
                        {formatCurrency(item.lineAmount)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 pt-1">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Subtotal</span>
              <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Tax Amount</span>
              <div className="w-24">
                <Input
                  dense
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxAmountInput}
                  onChange={(e) => setTaxAmountInput(e.target.value)}
                  className="w-full text-right"
                />
              </div>
            </div>
            <div className="border-t border-border/80 pt-1.5 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Invoice Total</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(invoiceTotal)}</span>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="group relative flex min-h-[76px] w-full flex-col justify-start px-3.5 py-2.5 rounded-md border border-border/80 bg-secondary focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
            <span className="text-[11px] font-medium text-muted-foreground select-none leading-none mb-1">
              Notes
            </span>
            <textarea
              rows={2}
              placeholder="Additional invoice information..."
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
            Post Invoice
          </Button>
        </div>
      </form>
    </Modal>
  )
}
