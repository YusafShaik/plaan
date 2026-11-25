import { useState, useEffect, useMemo, type FormEvent } from 'react'
import {
  Sparkles,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { DateField } from '../../components/ui/DateField'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
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
            <Input
              label="PO number *"
              placeholder="e.g. PO-001"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value.toUpperCase())}
              disabled={isLoading}
              rightElement={
                <span className="text-[11px] font-medium text-brand flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Auto
                </span>
              }
              hint="Unique within the organization. Can be auto-generated."
            />

            <DateField
              label="Order date *"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              disabled={isLoading}
            />

            <Select
              label="Supplier *"
              value={supplierId}
              onChange={setSupplierId}
              disabled={isLoading}
              placeholder="Select supplier..."
              options={suppliers.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.supplierCode})`,
              }))}
            />

            <Select
              label="Receiving warehouse *"
              value={warehouseId}
              onChange={setWarehouseId}
              disabled={isLoading}
              placeholder="Select receiving warehouse..."
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.name} (${w.warehouseCode})`,
              }))}
            />

            <DateField
              label="Expected delivery date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              disabled={isLoading}
            />

            <div className="group relative flex min-h-14 w-full flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2 select-none">
              <span className="text-[11px] font-medium text-muted-foreground leading-none">
                Currency
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {organization?.baseCurrency || 'INR'} ({currencySymbol})
                </span>
                <span className="text-[10px] text-muted-foreground">Org default</span>
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
              className="text-xs font-semibold text-foreground hover:underline cursor-pointer flex items-center gap-1 py-1 px-2 rounded-md hover:bg-secondary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create new item in Master</span>
            </button>
          </div>

          <div className="rounded-md border border-border/70 overflow-hidden bg-card">
            <Table tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="py-2.5 w-[42%]">Item</TH>
                    <TH className="py-2.5 w-[18%]">Qty</TH>
                    <TH className="py-2.5 w-[18%]">Rate ({currencySymbol})</TH>
                    <TH className="py-2.5 w-[16%] text-right">Amount</TH>
                    <TH className="py-2.5 w-[6%] text-center"></TH>
                  </tr>
                </THead>
                <TBody className="divide-y divide-border/60 text-sm">
                  {orderItems.map((row) => {
                    const selectedItem = row.itemId ? itemsMap.get(Number(row.itemId)) : null
                    const qty = typeof row.quantity === 'number' ? row.quantity : 0
                    const price = typeof row.unitPrice === 'number' ? row.unitPrice : 0
                    const amount = qty * price

                    return (
                      <TR key={row.rowId} className="group">
                        {/* Item Column */}
                        <TD className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 min-w-0">
                              <NativeSelect
                                dense
                                value={row.itemId}
                                onChange={(e) =>
                                  handleRowChange(row.rowId, 'itemId', e.target.value)
                                }
                                disabled={isLoading}
                              >
                                <option value="" disabled>
                                  Select item...
                                </option>
                                {items.map((i) => {
                                  const isSelectedInOtherRow =
                                    selectedItemIds.has(String(i.id)) &&
                                    String(i.id) !== row.itemId
                                  return (
                                    <option
                                      key={i.id}
                                      value={i.id}
                                      disabled={isSelectedInOtherRow}
                                    >
                                      {i.name} ({i.itemCode})
                                      {isSelectedInOtherRow
                                        ? ' — (Already added)'
                                        : ''}
                                    </option>
                                  )
                                })}
                              </NativeSelect>
                            </div>
                            {selectedItem && (
                              <span
                                className="shrink-0 px-2 py-1 rounded-md bg-secondary text-[10px] font-medium text-muted-foreground uppercase tracking-wider"
                                title={`Unit of Measure: ${selectedItem.unitOfMeasure}`}
                              >
                                {selectedItem.unitOfMeasure}
                              </span>
                            )}
                          </div>
                        </TD>

                        {/* Qty Column */}
                        <TD className="py-2.5 px-2.5">
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(row.rowId, 'quantity', e.target.value)}
                            disabled={isLoading}
                            className="h-9 w-full rounded-md border border-border/70 bg-secondary dark:bg-secondary px-2.5 py-1 text-xs font-mono font-medium text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                          />
                        </TD>

                        {/* Rate Column */}
                        <TD className="py-2.5 px-2.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={row.unitPrice}
                            onChange={(e) => handleRowChange(row.rowId, 'unitPrice', e.target.value)}
                            disabled={isLoading}
                            className="h-9 w-full rounded-md border border-border/70 bg-secondary dark:bg-secondary px-2.5 py-1 text-xs font-mono font-medium text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                          />
                        </TD>

                        {/* Amount Column */}
                        <TD className="py-2.5 px-3 text-right">
                          <div className="h-9 flex items-center justify-end font-mono text-xs font-medium text-foreground">
                            {amount.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </TD>

                        {/* Delete action */}
                        <TD className="py-2.5 px-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(row.rowId)}
                            disabled={orderItems.length <= 1}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TD>
                      </TR>
                    )
                  })}
                </TBody>
            </Table>

            <div className="p-2.5 border-t border-border/60 bg-surface-muted/50 dark:bg-secondary/20 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItemRow}
                disabled={!canAddMoreItems}
                title={
                  !canAddMoreItems
                    ? 'All available items are already added to this order'
                    : 'Add Item'
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
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
          <div className="group relative flex min-h-14 w-full flex-col rounded-md border border-border/80 bg-secondary px-3.5 py-2 focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
            <span className="text-[11px] font-medium text-muted-foreground leading-none">
              Notes & Instructions
            </span>
            <textarea
              rows={2}
              placeholder="Additional delivery or supplier instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              className="mt-1 w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
            />
          </div>

          {/* Order Total Box */}
          <div className="rounded-md border border-border/70 bg-surface-subtle dark:bg-secondary/40 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Order Total</span>
              <span>{orderItems.filter((r) => r.itemId).length} items</span>
            </div>
            <div className="text-right mt-1">
              <span className="text-2xl font-medium font-mono tracking-tight text-foreground">
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
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={(e) => handleSubmit(e, 'DRAFT')}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isLoading}
            onClick={(e) => handleSubmit(e, 'ISSUED')}
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