import { useState, useEffect, useMemo, useRef, type ChangeEvent, type FormEvent } from 'react'
import { X, UploadCloud, FileText, Sparkles } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateField } from '../../components/ui/DateField'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { Alert } from '../../components/ui/Alert'
import { financeService } from '../../services/financeService'
import type {
  PurchaseInvoice,
  PurchaseInvoiceStatus,
  EligibleGrn,
  CreatePurchaseInvoicePayload,
  UpdatePurchaseInvoicePayload,
} from '../../types/finance'

export interface CreatePurchaseInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  invoiceToEdit?: PurchaseInvoice | null
}

interface ItemFormRow {
  goodsReceiptItemId: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  quantity: number
  unitPrice: number | string
  lineAmount: number
}

export function CreatePurchaseInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  invoiceToEdit,
}: CreatePurchaseInvoiceModalProps) {
  const isEditing = Boolean(invoiceToEdit)

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('PI-...')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [paymentDueDate, setPaymentDueDate] = useState('')
  const [selectedGrnId, setSelectedGrnId] = useState<number | ''>('')
  const [eligibleGrns, setEligibleGrns] = useState<EligibleGrn[]>([])
  const [selectedGrn, setSelectedGrn] = useState<EligibleGrn | null>(null)
  const [formItems, setFormItems] = useState<ItemFormRow[]>([])
  const [taxAmountInput, setTaxAmountInput] = useState<string>('0')
  const [notes, setNotes] = useState('')

  // Attachment State
  const [attachmentFileName, setAttachmentFileName] = useState<string | undefined>()
  const [attachmentContentType, setAttachmentContentType] = useState<string | undefined>()
  const [attachmentData, setAttachmentData] = useState<string | undefined>()
  const [attachmentSize, setAttachmentSize] = useState<number | null>(null)

  // Loading and Error
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize data on open
  useEffect(() => {
    let isMounted = true
    if (!isOpen) return

    setError(null)
    setIsLoading(true)

    if (invoiceToEdit) {
      // Prefill from existing draft invoice
      setInvoiceNumber(invoiceToEdit.invoiceNumber)
      setSupplierInvoiceNumber(invoiceToEdit.supplierInvoiceNumber)
      setInvoiceDate(invoiceToEdit.invoiceDate)
      setPaymentDueDate(invoiceToEdit.paymentDueDate || '')
      setSelectedGrnId(invoiceToEdit.goodsReceiptId)
      setSelectedGrn({
        id: invoiceToEdit.goodsReceiptId,
        grnNumber: invoiceToEdit.grnNumber,
        purchaseOrderId: invoiceToEdit.purchaseOrderId,
        poNumber: invoiceToEdit.poNumber,
        supplierId: invoiceToEdit.supplierId,
        supplierCode: invoiceToEdit.supplierCode,
        supplierName: invoiceToEdit.supplierName,
        warehouseId: 0,
        warehouseCode: '',
        warehouseName: '',
        receiptDate: '',
        items: [],
      })
      setFormItems(
        invoiceToEdit.items.map((it) => ({
          goodsReceiptItemId: it.goodsReceiptItemId,
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
      setAttachmentFileName(invoiceToEdit.attachmentFileName)
      setAttachmentContentType(invoiceToEdit.attachmentContentType)
      setAttachmentData(undefined)
      setAttachmentSize(null)
      setIsLoading(false)
    } else {
      // New invoice mode
      setSupplierInvoiceNumber('')
      setInvoiceDate(new Date().toISOString().split('T')[0])
      setPaymentDueDate('')
      setSelectedGrnId('')
      setSelectedGrn(null)
      setFormItems([])
      setTaxAmountInput('0')
      setNotes('')
      setAttachmentFileName(undefined)
      setAttachmentContentType(undefined)
      setAttachmentData(undefined)
      setAttachmentSize(null)

      Promise.all([
        financeService.getNextInvoiceNumber(),
        financeService.getEligibleGoodsReceipts(),
      ])
        .then(([nextNumRes, eligibleRes]) => {
          if (!isMounted) return
          setInvoiceNumber(nextNumRes.nextCode)
          setEligibleGrns(eligibleRes)
        })
        .catch((err: unknown) => {
          if (!isMounted) return
          setError(err instanceof Error ? err.message : 'Failed to initialize invoice form')
        })
        .finally(() => {
          if (isMounted) setIsLoading(false)
        })
    }
  }, [isOpen, invoiceToEdit])

  // Select Goods Receipt (auto-populates PO, supplier, items, and default prices)
  const handleSelectGrn = (grnIdStr: string) => {
    const grnId = Number(grnIdStr)
    setSelectedGrnId(grnId || '')
    setError(null)

    const match = eligibleGrns.find((g) => g.id === grnId)
    if (match) {
      setSelectedGrn(match)
      const rows: ItemFormRow[] = match.items.map((item) => ({
        goodsReceiptItemId: item.goodsReceiptItemId,
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unitOfMeasure: item.unitOfMeasure,
        quantity: item.quantity,
        unitPrice: item.defaultUnitPrice,
        lineAmount: Number((item.quantity * item.defaultUnitPrice).toFixed(2)),
      }))
      setFormItems(rows)
    } else {
      setSelectedGrn(null)
      setFormItems([])
    }
  }

  // Interactive unit price change
  const handleUnitPriceChange = (index: number, newPriceStr: string) => {
    const updated = [...formItems]
    const row = updated[index]
    row.unitPrice = newPriceStr

    const numericPrice = parseFloat(newPriceStr)
    if (!isNaN(numericPrice) && numericPrice >= 0) {
      row.lineAmount = Number((row.quantity * numericPrice).toFixed(2))
    } else {
      row.lineAmount = 0
    }
    setFormItems(updated)
  }

  // Computed Totals
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

  // Handle Attachment Upload
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAttachmentFileName(file.name)
    setAttachmentContentType(file.type)
    setAttachmentSize(file.size)

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setAttachmentData(base64)
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

  // Submit (Save Draft or Post)
  const handleSubmit = async (targetStatus: PurchaseInvoiceStatus, e?: FormEvent) => {
    if (e) e.preventDefault()
    setError(null)

    if (!supplierInvoiceNumber.trim()) {
      setError('Supplier invoice number is required.')
      return
    }

    if (!selectedGrnId) {
      setError('Please select a posted Goods Receipt.')
      return
    }

    if (formItems.length === 0) {
      setError('Invoice must contain at least one line item.')
      return
    }

    for (const item of formItems) {
      const price = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice
      if (isNaN(price) || price < 0) {
        setError(`Unit price for ${item.itemName} cannot be negative or invalid.`)
        return
      }
    }

    const payloadItems = formItems.map((item) => ({
      goodsReceiptItemId: item.goodsReceiptItemId,
      itemId: item.itemId,
      unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice,
    }))

    setIsSubmitting(true)
    try {
      if (isEditing && invoiceToEdit) {
        const payload: UpdatePurchaseInvoicePayload = {
          supplierInvoiceNumber: supplierInvoiceNumber.trim(),
          invoiceDate,
          paymentDueDate: paymentDueDate || undefined,
          taxAmount: parsedTax,
          attachmentFileName,
          attachmentContentType,
          attachmentData,
          notes: notes.trim() || undefined,
          status: targetStatus,
          items: payloadItems,
        }
        await financeService.updatePurchaseInvoice(invoiceToEdit.id, payload)
      } else {
        const payload: CreatePurchaseInvoicePayload = {
          invoiceNumber: invoiceNumber.startsWith('PI-...') ? undefined : invoiceNumber,
          supplierInvoiceNumber: supplierInvoiceNumber.trim(),
          invoiceDate,
          paymentDueDate: paymentDueDate || undefined,
          goodsReceiptId: Number(selectedGrnId),
          taxAmount: parsedTax,
          attachmentFileName,
          attachmentContentType,
          attachmentData,
          notes: notes.trim() || undefined,
          status: targetStatus,
          items: payloadItems,
        }
        await financeService.createPurchaseInvoice(payload)
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save purchase invoice')
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
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Finance / Purchase Invoices / {isEditing ? invoiceNumber : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isEditing ? `Edit Purchase Invoice · ${invoiceNumber}` : 'Create Purchase Invoice'}
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

        {/* 2-Column Form Fields with Standard Stacked Chrome */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Row 1 Left: Purchase Invoice Number */}
          <Input
            label="Purchase Invoice Number"
            value={invoiceNumber}
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

          {/* Row 1 Right: Invoice Date * */}
          <DateField
            label="Invoice Date *"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />

          {/* Row 2 Left: Goods Receipt * */}
          {isEditing ? (
            <Input
              label="Goods Receipt *"
              value={selectedGrn?.grnNumber || ''}
              readOnly
              disabled
            />
          ) : (
            <Select
              label="Goods Receipt *"
              value={selectedGrnId ? String(selectedGrnId) : ''}
              onChange={handleSelectGrn}
              disabled={isLoading || isSubmitting}
              placeholder="Select Goods Receipt..."
              options={eligibleGrns.map((grn) => ({
                value: String(grn.id),
                label: `${grn.grnNumber} · ${grn.supplierName} (${grn.poNumber})`,
              }))}
            />
          )}

          {/* Row 2 Right: Purchase Order (Auto-populated) */}
          <Input
            label="Purchase Order"
            value={selectedGrn?.poNumber || ''}
            placeholder="Auto-populated from GRN"
            readOnly
            disabled
          />

          {/* Row 3 Left: Supplier (Auto-populated) */}
          <Input
            label="Supplier"
            value={selectedGrn?.supplierName || ''}
            placeholder="Auto-populated from GRN"
            readOnly
            disabled
          />

          {/* Row 3 Right: Supplier Invoice Number * */}
          <Input
            label="Supplier Invoice Number *"
            placeholder="e.g. ABC/2026/105"
            value={supplierInvoiceNumber}
            onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
            required
            disabled={isLoading || isSubmitting}
          />

          {/* Row 4 Left: Payment Due Date */}
          <DateField
            label="Payment Due Date"
            value={paymentDueDate}
            onChange={(e) => setPaymentDueDate(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="border-t border-border/80 my-4" />

        {/* Invoice Items */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Invoice Items
          </h3>

          {formItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/80 py-7 text-center text-xs text-muted-foreground">
              Select a Goods Receipt above to automatically populate received items and PO prices.
            </div>
          ) : (
            <div className="rounded-md border border-border/80 overflow-hidden">
              <Table>
                <THead>
                  <TR className="border-b border-border/60 bg-secondary/30">
                    <TH className="py-2.5 px-3 text-xs font-semibold text-muted-foreground">Item</TH>
                    <TH className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-right">Qty</TH>
                    <TH className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-center">UOM</TH>
                    <TH className="py-2.5 px-3 text-xs font-semibold text-muted-foreground w-36 text-right">Unit Price</TH>
                    <TH className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {formItems.map((item, idx) => (
                    <TR key={item.goodsReceiptItemId} className="border-b border-border/40">
                      <TD className="py-2.5 px-3 text-xs font-medium text-foreground">
                        <div>{item.itemName}</div>
                        <div className="text-xs text-muted-foreground">{item.itemCode}</div>
                      </TD>
                      <TD className="py-2.5 px-3 text-xs text-right font-medium text-foreground">
                        {item.quantity}
                      </TD>
                      <TD className="py-2.5 px-3 text-xs text-center text-muted-foreground">
                        {item.unitOfMeasure}
                      </TD>
                      <TD className="py-1.5 px-3 text-right">
                        <div className="flex items-center justify-end">
                          <Input
                            dense
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUnitPriceChange(idx, e.target.value)}
                            className="w-24 text-right"
                          />
                        </div>
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

        {/* Totals Section */}
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

        {/* Attachment Upload */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-medium text-muted-foreground">
            Supplier Invoice Attachment
          </label>
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
                    {attachmentSize ? `${(attachmentSize / 1024).toFixed(1)} KB` : 'Attached'}
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
                Upload supplier invoice (optional)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                PDF or image
              </p>
            </div>
          )}
        </div>

        {/* Notes with Stacked Box */}
        <div className="w-full">
          <div className="group relative flex min-h-[76px] w-full flex-col justify-start px-3.5 py-2.5 rounded-md border border-border/80 bg-secondary focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
            <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1">
              Notes
            </span>
            <textarea
              rows={2}
              placeholder="Additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading || isSubmitting}
              className="w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
          >
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
