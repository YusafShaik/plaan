import { useState, useEffect, useMemo, type FormEvent } from 'react'
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  X,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { CreateItemModal } from '../master-data/CreateItemModal'
import { masterDataService } from '../../services/masterDataService'
import { procurementService } from '../../services/procurementService'
import { useAuth } from '../../hooks/useAuth'
import type { Supplier, Warehouse, Item, ItemType, CreateItemPayload } from '../../types/masterData'
import type { CreatePurchaseOrderPayload, PurchaseOrderStatus } from '../../types/procurement'

export interface CreatePurchaseOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface OrderItemRow {
  rowId: string
  itemId: string
  quantity: number | ''
  unitPrice: number | ''
}

export function CreatePurchaseOrderModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePurchaseOrderModalProps) {
  const { organization } = useAuth()
  const currencySymbol =
    organization?.baseCurrency === 'USD'
      ? '$'
      : organization?.baseCurrency === 'EUR'
      ? '€'
      : '₹'

  // Master data collections
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [itemTypes, setItemTypes] = useState<ItemType[]>([])

  // Form states
  const [poNumber, setPoNumber] = useState('PO-...')
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')

  // Order Items
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([
    { rowId: 'row-1', itemId: '', quantity: '', unitPrice: '' },
  ])

  // Sub-modal and loading state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial data when modal opens
  useEffect(() => {
    let isMounted = true
    if (!isOpen) return

    // 1. Next PO Number
    procurementService
      .getNextPoNumber()
      .then((res) => {
        if (isMounted && res?.nextCode) setPoNumber(res.nextCode)
      })
      .catch((err) => console.error('Failed to get next PO number', err))

    // 2. Active Suppliers
    masterDataService
      .getSuppliers({ active: true, size: 100 })
      .then((res) => {
        if (isMounted) setSuppliers(res.content)
      })
      .catch((err) => console.error('Failed to load suppliers', err))

    // 3. Active Warehouses
    masterDataService
      .getWarehouses({ active: true, size: 100 })
      .then((res) => {
        if (isMounted) setWarehouses(res.content)
      })
      .catch((err) => console.error('Failed to load warehouses', err))

    // 4. Active Items
    masterDataService
      .getItems({ active: true, size: 200 })
      .then((res) => {
        if (isMounted) setItems(res.content)
      })
      .catch((err) => console.error('Failed to load items', err))

    // 5. Item Types
    masterDataService
      .getItemTypes()
      .then((res) => {
        if (isMounted) setItemTypes(res)
      })
      .catch((err) => console.error('Failed to load item types', err))

    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Item lookup map for rapid UOM resolution
  const itemsMap = useMemo(() => {
    const map = new Map<number, Item>()
    items.forEach((i) => map.set(i.id, i))
    return map
  }, [items])

  // Track already selected item IDs to prevent duplicate line additions
  const selectedItemIds = useMemo(() => {
    const ids = new Set<string>()
    orderItems.forEach((r) => {
      if (r.itemId) ids.add(r.itemId)
    })
    return ids
  }, [orderItems])

  const canAddMoreItems = items.length === 0 || selectedItemIds.size < items.length

  const handleAddItemRow = () => {
    if (!canAddMoreItems) {
      setError('All available items are already added to this order. Adjust quantity to increase volume.')
      return
    }
    setOrderItems((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        itemId: '',
        quantity: '',
        unitPrice: '',
      },
    ])
  }

  const handleRemoveItemRow = (rowId: string) => {
    if (orderItems.length <= 1) return
    setOrderItems((prev) => prev.filter((r) => r.rowId !== rowId))
  }

  const handleRowChange = (
    rowId: string,
    field: 'itemId' | 'quantity' | 'unitPrice',
    val: string | number
  ) => {
    setOrderItems((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row
        if (field === 'itemId') {
          return { ...row, itemId: String(val) }
        }
        if (field === 'quantity') {
          const num = typeof val === 'string' ? (val === '' ? '' : parseFloat(val)) : val
          return { ...row, quantity: isNaN(num as number) ? '' : (num as number) }
        }
        if (field === 'unitPrice') {
          const num = typeof val === 'string' ? (val === '' ? '' : parseFloat(val)) : val
          return { ...row, unitPrice: isNaN(num as number) ? '' : (num as number) }
        }
        return row
      })
    )
  }

  const orderTotal = useMemo(() => {
    return orderItems.reduce((acc, row) => {
      const q = typeof row.quantity === 'number' ? row.quantity : 0
      const p = typeof row.unitPrice === 'number' ? row.unitPrice : 0
      return acc + q * p
    }, 0)
  }, [orderItems])

  const handleCreateItemSuccess = async (payload: CreateItemPayload) => {
    const created = await masterDataService.createItem(payload)
    setItems((prev) => [created, ...prev])
    setOrderItems((prev) => {
      const emptyIdx = prev.findIndex((r) => !r.itemId)
      if (emptyIdx >= 0) {
        const copy = [...prev]
        copy[emptyIdx] = { ...copy[emptyIdx], itemId: String(created.id) }
        return copy
      }
      return [
        ...prev,
        { rowId: `row-${Date.now()}`, itemId: String(created.id), quantity: '', unitPrice: '' },
      ]
    })
  }

  const handleSubmit = async (e: FormEvent, targetStatus: PurchaseOrderStatus) => {
    e.preventDefault()
    setError(null)

    if (!supplierId) {
      setError('Please select a supplier.')
      return
    }
    if (!warehouseId) {
      setError('Please select a receiving warehouse.')
      return
    }
    if (!orderDate) {
      setError('Order date is required.')
      return
    }

    const validItems = orderItems.filter((r) => r.itemId && Number(r.quantity) > 0)
    if (validItems.length === 0) {
      setError('Please add at least one line item with valid item and quantity.')
      return
    }

    const itemIds = validItems.map((r) => r.itemId)
    if (new Set(itemIds).size !== itemIds.length) {
      setError('Duplicate items detected. Please adjust the quantity instead of adding the same item multiple times.')
      return
    }

    setIsLoading(true)
    try {
      const payload: CreatePurchaseOrderPayload = {
        poNumber: poNumber.trim().toUpperCase(),
        supplierId: Number(supplierId),
        receivingWarehouseId: Number(warehouseId),
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes.trim() || undefined,
        status: targetStatus,
        items: validItems.map((r) => ({
          itemId: Number(r.itemId),
          quantity: Number(r.quantity),
          unitPrice: Number(r.unitPrice) || 0,
        })),
      }

      await procurementService.createPurchaseOrder(payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save purchase order.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[760px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <form onSubmit={(e) => handleSubmit(e, 'DRAFT')} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Create Purchase Order
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Generate a purchase order for suppliers and inventory intake.
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

        {/* Section 1: Order details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Order Details
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Field 1: PO Number (Matching Supplier and Warehouse code structure) */}
            <Input
              label="PO number *"
              placeholder="e.g. PO-001"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value.toUpperCase())}
              disabled={isLoading}
              className="font-semibold"
              rightElement={
                <span className="text-[11px] font-sans font-medium text-accent flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Auto
                </span>
              }
              hint="Unique within the organization. Can be auto-generated."
            />

            {/* Field 2: Order Date (Single native date picker, no duplicate calendar icon) */}
            <div>
              <div className="group relative flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border border-border/80 bg-secondary px-3.5 py-2 transition-all focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
                <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
                  Order date *
                </span>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground focus:outline-none focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Field 3: Supplier */}
            <div>
              <div className="group relative flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border border-border/80 bg-secondary px-3.5 py-2 transition-all focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
                <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
                  Supplier *
                </span>
                <div className="mt-1 relative flex items-center">
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    disabled={isLoading}
                    className="w-full border-0 bg-transparent p-0 pr-6 text-sm font-medium text-foreground focus:outline-none focus:ring-0 cursor-pointer appearance-none"
                  >
                    <option value="" disabled>Select supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.supplierCode})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Field 4: Receiving Warehouse */}
            <div>
              <div className="group relative flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border border-border/80 bg-secondary px-3.5 py-2 transition-all focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
                <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
                  Receiving warehouse *
                </span>
                <div className="mt-1 relative flex items-center">
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    disabled={isLoading}
                    className="w-full border-0 bg-transparent p-0 pr-6 text-sm font-medium text-foreground focus:outline-none focus:ring-0 cursor-pointer appearance-none"
                  >
                    <option value="" disabled>Select receiving warehouse...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.warehouseCode})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Field 5: Expected delivery date (Single native date picker, no duplicate calendar icon) */}
            <div>
              <div className="group relative flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border border-border/80 bg-secondary px-3.5 py-2 transition-all focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
                <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
                  Expected delivery date
                </span>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground focus:outline-none focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Field 6: Base Currency Context */}
            <div>
              <div className="group relative flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border border-border/80 bg-secondary px-3.5 py-2 select-none">
                <span className="text-[11px] font-medium text-muted-foreground leading-none">
                  Currency
                </span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {organization?.baseCurrency || 'INR'} ({currencySymbol})
                  </span>
                  <span className="text-[10px] text-muted-foreground">Org default</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Order items */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Order Items
            </span>
            <button
              type="button"
              onClick={() => setIsItemModalOpen(true)}
              className="text-xs font-semibold text-foreground hover:underline cursor-pointer flex items-center gap-1 py-1 px-2 rounded-[6px] hover:bg-secondary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create new item in Master</span>
            </button>
          </div>

          <div className="rounded-[14px] border border-border/70 overflow-hidden bg-white dark:bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-border/70 bg-[#fafafa] dark:bg-secondary/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-[42%]">Item</th>
                    <th className="py-2.5 px-2.5 w-[18%]">Qty</th>
                    <th className="py-2.5 px-2.5 w-[18%]">Rate ({currencySymbol})</th>
                    <th className="py-2.5 px-3 w-[16%] text-right">Amount</th>
                    <th className="py-2.5 px-1.5 w-[6%] text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {orderItems.map((row) => {
                    const selectedItem = row.itemId ? itemsMap.get(Number(row.itemId)) : null
                    const qty = typeof row.quantity === 'number' ? row.quantity : 0
                    const price = typeof row.unitPrice === 'number' ? row.unitPrice : 0
                    const amount = qty * price

                    return (
                      <tr key={row.rowId} className="group">
                        {/* Item Column */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                              <select
                                value={row.itemId}
                                onChange={(e) => handleRowChange(row.rowId, 'itemId', e.target.value)}
                                disabled={isLoading}
                                className="h-9 w-full rounded-[8px] border border-border/70 bg-[#f4f4f5] dark:bg-secondary px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer appearance-none pr-6"
                              >
                                <option value="" disabled>Select item...</option>
                                {items.map((i) => {
                                  const isSelectedInOtherRow =
                                    selectedItemIds.has(String(i.id)) && String(i.id) !== row.itemId
                                  return (
                                    <option key={i.id} value={i.id} disabled={isSelectedInOtherRow}>
                                      {i.name} ({i.itemCode}) {isSelectedInOtherRow ? '— (Already added)' : ''}
                                    </option>
                                  )
                                })}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            </div>
                            {selectedItem && (
                              <span
                                className="shrink-0 px-2 py-1 rounded-[6px] bg-secondary text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
                                title={`Unit of Measure: ${selectedItem.unitOfMeasure}`}
                              >
                                {selectedItem.unitOfMeasure}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Qty Column */}
                        <td className="py-2.5 px-2.5">
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(row.rowId, 'quantity', e.target.value)}
                            disabled={isLoading}
                            className="h-9 w-full rounded-[8px] border border-border/70 bg-[#f4f4f5] dark:bg-secondary px-2.5 py-1 text-xs font-mono font-medium text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                          />
                        </td>

                        {/* Rate Column */}
                        <td className="py-2.5 px-2.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={row.unitPrice}
                            onChange={(e) => handleRowChange(row.rowId, 'unitPrice', e.target.value)}
                            disabled={isLoading}
                            className="h-9 w-full rounded-[8px] border border-border/70 bg-[#f4f4f5] dark:bg-secondary px-2.5 py-1 text-xs font-mono font-medium text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                          />
                        </td>

                        {/* Amount Column */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="h-9 flex items-center justify-end font-mono text-xs font-semibold text-foreground">
                            {amount.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </td>

                        {/* Delete action */}
                        <td className="py-2.5 px-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(row.rowId)}
                            disabled={orderItems.length <= 1}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-[6px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-2.5 border-t border-border/60 bg-[#fafafa]/50 dark:bg-secondary/20 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItemRow}
                disabled={!canAddMoreItems}
                className="gap-1.5 text-xs font-medium border-border/70 bg-white hover:bg-secondary text-foreground px-3 py-1.5 rounded-[8px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canAddMoreItems ? 'All available items are already added to this order' : 'Add Item'}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {orderItems.length} {orderItems.length === 1 ? 'line item' : 'line items'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Notes & Total */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Notes & Instructions
            </label>
            <textarea
              rows={2}
              placeholder="Additional delivery or supplier instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-[10px] border border-border/70 bg-[#f4f4f5] dark:bg-secondary p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>

          {/* Order Total Box */}
          <div className="rounded-[12px] border border-border/70 bg-[#f8f9fa] dark:bg-secondary/40 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Order Total</span>
              <span>{orderItems.filter((r) => r.itemId).length} items</span>
            </div>
            <div className="text-right mt-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {currencySymbol}
                {orderTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
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
            disabled={isLoading}
            onClick={(e) => handleSubmit(e, 'DRAFT')}
            className="border-border/80 bg-white text-foreground hover:bg-secondary font-medium px-4 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            Save Draft
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            onClick={(e) => handleSubmit(e, 'ISSUED')}
            className="bg-[#171717] hover:bg-black text-white font-medium px-5 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            Issue Purchase Order
          </Button>
        </div>
      </form>

      {/* Integrate Existing CreateItemModal for on-the-fly item creation */}
      <CreateItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        itemTypes={itemTypes}
        onSubmit={handleCreateItemSuccess}
      />
    </Modal>
  )
}