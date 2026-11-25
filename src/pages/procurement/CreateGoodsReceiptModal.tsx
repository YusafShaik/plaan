import { useState, useEffect, useMemo, type FormEvent } from 'react'
import {
  Sparkles,
  ChevronDown,
  X,
  Building2,
  Warehouse as WarehouseIcon,
  PackageCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { procurementService } from '../../services/procurementService'
import type {
  PoEligibleForGrn,
  CreateGoodsReceiptPayload,
  GoodsReceiptStatus,
} from '../../types/procurement'

export interface CreateGoodsReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedPoId?: number
}

interface ReceiptItemRow {
  purchaseOrderItemId: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  orderedQuantity: number
  previouslyReceivedQuantity: number
  remainingQuantity: number
  receivingNow: number | ''
}

export function CreateGoodsReceiptModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedPoId,
}: CreateGoodsReceiptModalProps) {
  // Form states
  const [grnNumber, setGrnNumber] = useState('GRN-...')
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedPoId, setSelectedPoId] = useState<string>('')
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Collections
  const [eligiblePos, setEligiblePos] = useState<PoEligibleForGrn[]>([])
  const [receiptItems, setReceiptItems] = useState<ReceiptItemRow[]>([])

  // Loading and errors
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate line items when PO is selected
  const loadPoItems = (po: PoEligibleForGrn) => {
    const rows: ReceiptItemRow[] = po.items.map((item) => ({
      purchaseOrderItemId: item.purchaseOrderItemId,
      itemId: item.itemId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unitOfMeasure: item.unitOfMeasure,
      orderedQuantity: item.orderedQuantity,
      previouslyReceivedQuantity: item.previouslyReceivedQuantity,
      remainingQuantity: item.remainingQuantity,
      receivingNow: item.remainingQuantity > 0 ? item.remainingQuantity : '',
    }))
    setReceiptItems(rows)
  }

  // Fetch initial eligible POs and Next GRN Number
  useEffect(() => {
    let isMounted = true
    if (!isOpen) return

    procurementService
      .getNextGrnNumber()
      .then((res) => {
        if (isMounted && res?.nextCode) setGrnNumber(res.nextCode)
      })
      .catch((err) => console.error('Failed to load next GRN number', err))

    procurementService
      .getEligiblePurchaseOrders()
      .then((pos) => {
        if (!isMounted) return
        setEligiblePos(pos)

        if (preselectedPoId) {
          const match = pos.find((p) => p.id === preselectedPoId)
          if (match) {
            setSelectedPoId(String(match.id))
            loadPoItems(match)
          }
        }
      })
      .catch((err) => console.error('Failed to load eligible purchase orders', err))

    return () => {
      isMounted = false
    }
  }, [isOpen, preselectedPoId])

  // Currently selected PO object
  const currentPo = useMemo(() => {
    return eligiblePos.find((p) => String(p.id) === selectedPoId) || null
  }, [eligiblePos, selectedPoId])

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId)
    const po = eligiblePos.find((p) => String(p.id) === poId)
    if (po) {
      loadPoItems(po)
    } else {
      setReceiptItems([])
    }
  }

  const handleReceivingChange = (purchaseOrderItemId: number, val: string) => {
    setReceiptItems((prev) =>
      prev.map((row) => {
        if (row.purchaseOrderItemId !== purchaseOrderItemId) return row
        if (val === '') {
          return { ...row, receivingNow: '' }
        }
        const num = parseFloat(val)
        return {
          ...row,
          receivingNow: isNaN(num) ? '' : Math.max(0, num),
        }
      })
    )
  }

  // Dynamic calculations: resulting PO status & inventory movements
  const { expectedPoStatus, activeMovements } = useMemo(() => {
    let allFulfilled = true
    const movements: { itemName: string; qty: number; uom: string }[] = []

    receiptItems.forEach((row) => {
      const rec = typeof row.receivingNow === 'number' ? row.receivingNow : 0
      if (rec > 0) {
        movements.push({
          itemName: row.itemName,
          qty: rec,
          uom: row.unitOfMeasure,
        })
      }
      const remAfter = row.remainingQuantity - rec
      if (remAfter > 0) {
        allFulfilled = false
      }
    })

    const status = allFulfilled ? 'Completed' : 'Partially Received'
    return { expectedPoStatus: status, activeMovements: movements }
  }, [receiptItems])

  const handleSubmit = async (e: FormEvent, targetStatus: GoodsReceiptStatus) => {
    e.preventDefault()
    setError(null)

    if (!selectedPoId) {
      setError('Please select a purchase order to receive against.')
      return
    }

    const itemsToSubmit = receiptItems.map((r) => {
      const qty = typeof r.receivingNow === 'number' ? r.receivingNow : 0
      return {
        purchaseOrderItemId: r.purchaseOrderItemId,
        itemId: r.itemId,
        receivedQuantity: qty,
      }
    })

    const totalReceiving = itemsToSubmit.reduce((acc, i) => acc + i.receivedQuantity, 0)
    if (targetStatus === 'POSTED' && totalReceiving <= 0) {
      setError('Please enter a receiving quantity greater than 0 for at least one item to post the receipt.')
      return
    }

    // Validate that no item exceeds remaining quantity
    for (const row of receiptItems) {
      const rec = typeof row.receivingNow === 'number' ? row.receivingNow : 0
      if (rec > row.remainingQuantity) {
        setError(
          `Cannot receive ${rec} ${row.unitOfMeasure} for "${row.itemName}". Maximum remaining allowed is ${row.remainingQuantity}.`
        )
        return
      }
    }

    setIsLoading(true)
    try {
      const payload: CreateGoodsReceiptPayload = {
        grnNumber: grnNumber.trim().toUpperCase(),
        purchaseOrderId: Number(selectedPoId),
        receiptDate,
        deliveryNoteNumber: deliveryNoteNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        status: targetStatus,
        items: itemsToSubmit,
      }

      await procurementService.createGoodsReceipt(payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save goods receipt.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[780px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <form onSubmit={(e) => handleSubmit(e, 'DRAFT')} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Create Goods Receipt
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Record incoming physical inventory shipments against issued purchase orders.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        {/* Section 1: Order Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Field 1: GRN Number */}
            <Input
              label="GRN Number *"
              placeholder="e.g. GRN-001"
              value={grnNumber}
              onChange={(e) => setGrnNumber(e.target.value.toUpperCase())}
              disabled={isLoading}
              className="font-semibold"
              rightElement={
                <span className="text-[11px] font-sans font-medium text-accent flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Auto
                </span>
              }
              hint="Unique receipt document reference. Auto-generated."
            />

            {/* Field 2: Receipt Date */}
            <div>
              <div className="group relative flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border border-border/80 bg-secondary px-3.5 py-2 transition-all focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
                <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
                  Receipt Date *
                </span>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground focus:outline-none focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Field 3: Purchase Order Selector */}
            <div className="sm:col-span-2">
              <div className="group relative flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border border-border/80 bg-secondary px-3.5 py-2 transition-all focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
                <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
                  Purchase Order *
                </span>
                <div className="mt-1 relative flex items-center">
                  <select
                    value={selectedPoId}
                    onChange={(e) => handlePoChange(e.target.value)}
                    disabled={isLoading}
                    className="w-full border-0 bg-transparent p-0 pr-6 text-sm font-semibold text-foreground focus:outline-none focus:ring-0 cursor-pointer appearance-none"
                  >
                    <option value="" disabled>Select an issued or partially received PO...</option>
                    {eligiblePos.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} — {po.supplierName} ({po.status.replace('_', ' ')}) • Ordered on {po.orderDate}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              {eligiblePos.length === 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  No pending purchase orders available for receiving. Issue a new purchase order first.
                </p>
              )}
            </div>

            {/* Field 4: Supplier (Auto-populated from PO) */}
            <div className="group relative flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border border-border/80 bg-secondary px-3.5 py-2 select-none">
              <span className="text-[11px] font-medium text-muted-foreground leading-none">
                Supplier
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground truncate">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {currentPo ? `${currentPo.supplierName} (${currentPo.supplierCode})` : '—'}
                </span>
              </div>
            </div>

            {/* Field 5: Receiving Warehouse (Auto-populated from PO) */}
            <div className="group relative flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border border-border/80 bg-secondary px-3.5 py-2 select-none">
              <span className="text-[11px] font-medium text-muted-foreground leading-none">
                Receiving Warehouse
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground truncate">
                <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {currentPo ? `${currentPo.warehouseName} (${currentPo.warehouseCode})` : '—'}
                </span>
              </div>
            </div>

            {/* Field 6: Supplier Delivery Note Number */}
            <div className="sm:col-span-2">
              <Input
                label="Supplier Delivery Note No."
                placeholder="Optional vendor reference number or challan ID"
                value={deliveryNoteNumber}
                onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Received items Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Received Items
            </span>
            <span className="text-[11px] text-muted-foreground">
              {receiptItems.length} {receiptItems.length === 1 ? 'item line' : 'item lines'}
            </span>
          </div>

          <div className="rounded-[14px] border border-border/70 overflow-hidden bg-white dark:bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-border/70 bg-[#fafafa] dark:bg-secondary/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-[36%]">Item</th>
                    <th className="py-2.5 px-2 w-[14%] text-right">Ordered</th>
                    <th className="py-2.5 px-2 w-[16%] text-right">Prev. Received</th>
                    <th className="py-2.5 px-2.5 w-[20%] text-center">Receiving Now</th>
                    <th className="py-2.5 px-3 w-[14%] text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {receiptItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        Select a purchase order above to view line items available for receipt.
                      </td>
                    </tr>
                  ) : (
                    receiptItems.map((row) => {
                      const receivingVal = typeof row.receivingNow === 'number' ? row.receivingNow : 0
                      const remainingAfter = Math.max(0, row.remainingQuantity - receivingVal)

                      return (
                        <tr key={row.purchaseOrderItemId} className="hover:bg-secondary/30 transition-colors">
                          {/* Item Column */}
                          <td className="py-2.5 px-3">
                            <p className="text-xs font-semibold text-foreground truncate">{row.itemName}</p>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-secondary text-[10px] font-semibold text-muted-foreground uppercase mt-0.5">
                              {row.unitOfMeasure}
                            </span>
                          </td>

                          {/* Ordered Column */}
                          <td className="py-2.5 px-2 text-right text-xs font-medium text-muted-foreground">
                            {row.orderedQuantity}
                          </td>

                          {/* Previously Received Column */}
                          <td className="py-2.5 px-2 text-right text-xs font-medium text-muted-foreground">
                            {row.previouslyReceivedQuantity}
                          </td>

                          {/* Receiving Now Input */}
                          <td className="py-2.5 px-2.5">
                            <input
                              type="number"
                              min="0"
                              max={row.remainingQuantity}
                              step="any"
                              placeholder="0"
                              value={row.receivingNow}
                              onChange={(e) => handleReceivingChange(row.purchaseOrderItemId, e.target.value)}
                              disabled={isLoading || row.remainingQuantity <= 0}
                              className="h-9 w-full rounded-[8px] border border-border/70 bg-[#f4f4f5] dark:bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground text-center focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground disabled:opacity-50"
                            />
                          </td>

                          {/* Remaining Column */}
                          <td className="py-2.5 px-3 text-right text-xs font-semibold">
                            <span
                              className={
                                remainingAfter === 0
                                  ? 'text-emerald-600 font-bold'
                                  : 'text-foreground'
                              }
                            >
                              {remainingAfter}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 3: Live Post-Status & Inventory Movements Preview Card */}
        {currentPo && receiptItems.length > 0 && (
          <div className="rounded-[14px] border border-border/70 bg-[#f8f9fa] dark:bg-secondary/30 p-4 space-y-3">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground select-none block">
                Purchase Order status after posting
              </span>
              <div className="mt-1 flex items-center gap-2">
                {expectedPoStatus === 'Completed' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Completed (All items fulfilled)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    Partially Received (Items remaining to receive)
                  </span>
                )}
              </div>
            </div>

            {activeMovements.length > 0 && (
              <div className="pt-2 border-t border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Expected Inventory Inbound Movements
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {activeMovements.map((m, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-[8px] bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200"
                    >
                      <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{m.itemName}:</span>
                      <strong className="font-semibold font-mono">+{m.qty} {m.uom}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Notes */}
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Notes & Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Optional receipt notes, condition of goods, or packaging details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-[10px] border border-border/70 bg-[#f4f4f5] dark:bg-secondary p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
          />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-border/80 bg-white text-foreground hover:bg-secondary font-medium px-4 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isLoading || !selectedPoId}
            onClick={(e) => handleSubmit(e, 'DRAFT')}
            className="border-border/80 bg-white text-foreground hover:bg-secondary font-medium px-4 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            Save Draft
          </Button>
          <Button
            type="button"
            disabled={isLoading || !selectedPoId}
            onClick={(e) => handleSubmit(e, 'POSTED')}
            className="bg-[#171717] hover:bg-black text-white font-medium px-5 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            Post Goods Receipt
          </Button>
        </div>
      </form>
    </Modal>
  )
}
