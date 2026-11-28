import { useState, useEffect, useMemo, useRef, type ChangeEvent, type FormEvent } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
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
  unitPrice: string
  lineAmount: number
}

export function CreatePurchaseInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  invoiceToEdit,
}: CreatePurchaseInvoiceModalProps) {
  const { organization } = useAuth()
  const currency = organization?.baseCurrency
  const isEditing = Boolean(invoiceToEdit)

  const [invoiceNumber, setInvoiceNumber] = useState('PI-...')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [paymentDueDate, setPaymentDueDate] = useState('')
  const [selectedGrnId, setSelectedGrnId] = useState<number | ''>('')
  const [eligibleGrns, setEligibleGrns] = useState<EligibleGrn[]>([])
  const [selectedGrn, setSelectedGrn] = useState<EligibleGrn | null>(null)
  const [formItems, setFormItems] = useState<ItemFormRow[]>([])
  const [taxAmountInput, setTaxAmountInput] = useState<string>('')
  const [notes, setNotes] = useState('')

  const [attachmentFileName, setAttachmentFileName] = useState<string | undefined>()
  const [attachmentContentType, setAttachmentContentType] = useState<string | undefined>()
  const [attachmentData, setAttachmentData] = useState<string | undefined>()
  const [attachmentSize, setAttachmentSize] = useState<number | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    Promise.resolve().then(() => {
      if (!isMounted) return
      setError(null)
      setIsLoading(true)

      if (invoiceToEdit) {
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
            unitPrice: String(it.unitPrice),
            lineAmount: it.lineAmount,
          }))
        )
        setTaxAmountInput(invoiceToEdit.taxAmount ? String(invoiceToEdit.taxAmount) : '')
        setNotes(invoiceToEdit.notes || '')
        setAttachmentFileName(invoiceToEdit.attachmentFileName)
        setAttachmentContentType(invoiceToEdit.attachmentContentType)
        setAttachmentData(undefined)
        setAttachmentSize(null)
        setIsLoading(false)
      } else {
        setSupplierInvoiceNumber('')
        setInvoiceDate(new Date().toISOString().split('T')[0])
        setPaymentDueDate('')
        setSelectedGrnId('')
        setSelectedGrn(null)
        setFormItems([])
        setTaxAmountInput('')
        setNotes('')
        setAttachmentFileName(undefined)
        setAttachmentContentType(undefined)
        setAttachmentData(undefined)
        setAttachmentSize(null)
        if (fileInputRef.current) fileInputRef.current.value = ''

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

  const handleSelectGrn = (grnIdStr: string) => {
    const grnId = Number(grnIdStr)
    setSelectedGrnId(grnId || '')
    setError(null)

    const match = eligibleGrns.find((g) => g.id === grnId)
    if (match) {
      setSelectedGrn(match)
      setFormItems(
        match.items.map((item) => ({
          goodsReceiptItemId: item.goodsReceiptItemId,
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unitOfMeasure: item.unitOfMeasure,
          quantity: item.quantity,
          unitPrice: String(item.defaultUnitPrice),
          lineAmount: Number((item.quantity * item.defaultUnitPrice).toFixed(2)),
        }))
      )
    } else {
      setSelectedGrn(null)
      setFormItems([])
    }
  }

  const handleUnitPriceChange = (index: number, newPriceStr: string) => {
    setFormItems((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const num = Number(newPriceStr)
        return {
          ...row,
          unitPrice: newPriceStr,
          lineAmount: Number.isFinite(num) && num >= 0 ? Number((row.quantity * num).toFixed(2)) : 0,
        }
      })
    )
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

  const handleSubmit = async (targetStatus: PurchaseInvoiceStatus, e?: FormEvent) => {
    e?.preventDefault()
    setError(null)

    if (!supplierInvoiceNumber.trim()) {
      setError('Supplier invoice number is required.')
      return
    }
    if (!selectedGrnId) {
      setError('Please select a posted goods receipt.')
      return
    }
    if (formItems.length === 0) {
      setError('Invoice must contain at least one line item.')
      return
    }

    for (const item of formItems) {
      const price = Number(item.unitPrice)
      if (!Number.isFinite(price) || price < 0) {
        setError(`Unit price for ${item.itemName} cannot be negative or invalid.`)
        return
      }
    }

    const payloadItems = formItems.map((item) => ({
      goodsReceiptItemId: item.goodsReceiptItemId,
      itemId: item.itemId,
      unitPrice: Number(item.unitPrice),
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
        toast.success(
          targetStatus === 'POSTED'
            ? `Invoice ${invoiceToEdit.invoiceNumber} posted`
            : `Invoice ${invoiceToEdit.invoiceNumber} updated`
        )
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
        const created = await financeService.createPurchaseInvoice(payload)
        toast.success(
          targetStatus === 'POSTED'
            ? `Invoice ${created.invoiceNumber} posted`
            : `Invoice ${created.invoiceNumber} saved as draft`
        )
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save purchase invoice.')
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
              {isEditing ? `Edit purchase invoice · ${invoiceNumber}` : 'Create purchase invoice'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Match supplier billing details and line pricing against a posted goods receipt.
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
                Purchase invoice no.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isEditing ? (
              <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
                <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                  Goods receipt *
                </span>
                <span className="tabular-nums text-sm font-medium text-foreground">
                  {selectedGrn?.grnNumber || '—'}
                </span>
              </div>
            ) : (
              <Select
                label="Goods receipt *"
                value={selectedGrnId ? String(selectedGrnId) : ''}
                onChange={handleSelectGrn}
                disabled={isLoading || isSubmitting}
                placeholder="Select goods receipt..."
                options={eligibleGrns.map((grn) => ({
                  value: String(grn.id),
                  label: `${grn.grnNumber} · ${grn.supplierName} (${grn.poNumber})`,
                }))}
              />
            )}

            <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                Purchase order
              </span>
              <span className="tabular-nums text-sm font-medium text-foreground truncate">
                {selectedGrn?.poNumber || 'Auto-populated from GRN'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                Supplier
              </span>
              <span className="text-sm font-medium text-foreground truncate">
                {selectedGrn?.supplierName || 'Auto-populated from GRN'}
              </span>
            </div>

            <Input
              label="Supplier invoice number *"
              placeholder="e.g. ABC/2026/105"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              required
              disabled={isLoading || isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground">Invoice items</h3>
          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            {formItems.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-muted-foreground">
                Select a goods receipt above to populate received items and unit prices.
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
                  {formItems.map((item, idx) => (
                    <TR key={item.goodsReceiptItemId}>
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
                      <TD className="text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleUnitPriceChange(idx, e.target.value)}
                          placeholder="0.00"
                          className="h-9 w-24 rounded-md border border-border/80 bg-card px-2.5 text-right text-sm tabular-nums text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                        />
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
                      {attachmentSize ? `${(attachmentSize / 1024).toFixed(1)} KB` : 'Attached'}
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
                    Upload supplier invoice (optional)
                  </p>
                  <p className="text-xs text-muted-foreground">PDF or image</p>
                </div>
                <UploadCloud className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )}
          </div>

          <Input
            label="Notes"
            placeholder="Optional invoice notes..."
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
            Post invoice
          </Button>
        </div>
      </form>
    </Modal>
  )
}
