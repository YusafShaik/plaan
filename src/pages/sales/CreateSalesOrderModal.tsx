import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { DateField } from '../../components/ui/DateField'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { masterDataService } from '../../services/masterDataService'
import { salesService } from '../../services/salesService'
import { useAuth } from '../../hooks/useAuth'
import type { Customer, Warehouse, Item } from '../../types/masterData'
import type { SalesOrder, CreateSalesOrderPayload, UpdateSalesOrderPayload, SalesOrderStatus } from '../../types/sales'

export interface CreateSalesOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  orderToEdit?: SalesOrder | null
}

interface OrderItemRow {
  rowId: string
  itemId: string
  orderedQuantity: number | ''
  unitPrice: number | ''
}

export function CreateSalesOrderModal({
  isOpen,
  onClose,
  onSuccess,
  orderToEdit,
}: CreateSalesOrderModalProps) {
  const { organization } = useAuth()
  const currencySymbol =
    organization?.baseCurrency === 'USD'
      ? '$'
      : organization?.baseCurrency === 'EUR'
      ? '€'
      : '₹'

  // Master data
  const [customers, setCustomers] = useState<Customer[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [items, setItems] = useState<Item[]>([])

  // Form fields
  const [orderNumber, setOrderNumber] = useState('SO-...')
  const [customerId, setCustomerId] = useState('')
  const [dispatchWarehouseId, setDispatchWarehouseId] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [customerPoReference, setCustomerPoReference] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')

  // Line items
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([
    { rowId: 'row-1', itemId: '', orderedQuantity: '', unitPrice: '' },
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(orderToEdit)

  // Load master data on modal open
  useEffect(() => {
    let isMounted = true
    if (!isOpen) return

    Promise.resolve().then(() => {
      if (isMounted) setIsLoading(true)
    })

    // Load active customers
    masterDataService
      .getCustomers({ active: true, size: 200 })
      .then((res) => {
        if (isMounted) setCustomers(res.content)
      })
      .catch((err) => console.error('Failed to load customers', err))

    // Load active warehouses
    masterDataService
      .getWarehouses({ active: true, size: 100 })
      .then((res) => {
        if (isMounted) setWarehouses(res.content)
      })
      .catch((err) => console.error('Failed to load warehouses', err))

    // Load active items
    masterDataService
      .getItems({ active: true, size: 300 })
      .then((res) => {
        if (isMounted) {
          setItems(res.content)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load items', err)
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Reset or initialize form
  useEffect(() => {
    if (!isOpen) return

    Promise.resolve().then(() => {
      setError(null)

      if (orderToEdit) {
        setOrderNumber(orderToEdit.orderNumber)
        setCustomerId(String(orderToEdit.customerId))
        setDispatchWarehouseId(String(orderToEdit.dispatchWarehouseId))
        setOrderDate(orderToEdit.orderDate)
        setExpectedDeliveryDate(orderToEdit.expectedDeliveryDate || '')
        setCustomerPoReference(orderToEdit.customerPoReference || '')
        setBillingAddress(orderToEdit.billingAddress || '')
        setShippingAddress(orderToEdit.shippingAddress || '')
        setNotes(orderToEdit.notes || '')

        if (orderToEdit.items && orderToEdit.items.length > 0) {
          setOrderItems(
            orderToEdit.items.map((it, idx) => ({
              rowId: `row-${it.id || idx}`,
              itemId: String(it.itemId),
              orderedQuantity: it.orderedQuantity,
              unitPrice: it.unitPrice,
            }))
          )
        } else {
          setOrderItems([{ rowId: 'row-1', itemId: '', orderedQuantity: '', unitPrice: '' }])
        }
      } else {
        // New order
        setCustomerId('')
        setDispatchWarehouseId('')
        setOrderDate(new Date().toISOString().split('T')[0])
        setExpectedDeliveryDate('')
        setCustomerPoReference('')
        setBillingAddress('')
        setShippingAddress('')
        setNotes('')
        setOrderItems([{ rowId: 'row-1', itemId: '', orderedQuantity: '', unitPrice: '' }])

        salesService
          .getNextSalesOrderNumber()
          .then((res) => {
            if (res?.nextCode) setOrderNumber(res.nextCode)
          })
          .catch((err) => {
            console.error('Failed to get next SO number', err)
            setOrderNumber('SO-001')
          })
      }
    })
  }, [isOpen, orderToEdit])

  // Item map for quick lookup of UOM
  const itemMap = useMemo(() => {
    const map = new Map<number, Item>()
    items.forEach((it) => map.set(it.id, it))
    return map
  }, [items])

  // Auto-populate customer address when customer changes
  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId)
    if (!newCustId) {
      setBillingAddress('')
      setShippingAddress('')
      return
    }

    const cust = customers.find((c) => String(c.id) === newCustId)
    if (cust) {
      setBillingAddress(cust.billingAddress || '')
      setShippingAddress(cust.shippingAddress || cust.billingAddress || '')
    }
  }

  // Row operations
  const handleAddItemRow = () => {
    setOrderItems((prev) => [
      ...prev,
      { rowId: `row-${Date.now()}`, itemId: '', orderedQuantity: '', unitPrice: '' },
    ])
  }

  const handleRemoveItemRow = (rowId: string) => {
    if (orderItems.length === 1) {
      setOrderItems([{ rowId: 'row-1', itemId: '', orderedQuantity: '', unitPrice: '' }])
      return
    }
    setOrderItems((prev) => prev.filter((r) => r.rowId !== rowId))
  }

  const handleRowChange = (
    rowId: string,
    field: 'itemId' | 'orderedQuantity' | 'unitPrice',
    val: string | number
  ) => {
    setOrderItems((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r
        return { ...r, [field]: val }
      })
    )
  }

  // Calculate order total
  const calculatedTotal = useMemo(() => {
    return orderItems.reduce((acc, row) => {
      const q = typeof row.orderedQuantity === 'number' ? row.orderedQuantity : 0
      const p = typeof row.unitPrice === 'number' ? row.unitPrice : 0
      return acc + q * p
    }, 0)
  }, [orderItems])

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`
  }

  const handleSave = async (targetStatus: SalesOrderStatus, e?: FormEvent) => {
    if (e) e.preventDefault()
    setError(null)

    if (!customerId) {
      setError('Please select a customer.')
      return
    }

    if (!dispatchWarehouseId) {
      setError('Please select a dispatch warehouse.')
      return
    }

    if (!orderDate) {
      setError('Order date is required.')
      return
    }

    // Validate rows
    const validRows = orderItems.filter(
      (r) => r.itemId && typeof r.orderedQuantity === 'number' && r.orderedQuantity > 0
    )

    if (validRows.length === 0) {
      setError('At least one item with a valid quantity is required.')
      return
    }

    // Check for duplicate items
    const itemIds = validRows.map((r) => Number(r.itemId))
    const uniqueIds = new Set(itemIds)
    if (uniqueIds.size < itemIds.length) {
      setError('Duplicate items found. Each item can only be added once per sales order.')
      return
    }

    setIsSubmitting(true)
    try {
      const payloadItems = validRows.map((r) => ({
        itemId: Number(r.itemId),
        orderedQuantity: Number(r.orderedQuantity),
        unitPrice: typeof r.unitPrice === 'number' ? Number(r.unitPrice) : 0,
      }))

      if (isEditing && orderToEdit) {
        const updatePayload: UpdateSalesOrderPayload = {
          customerId: Number(customerId),
          dispatchWarehouseId: Number(dispatchWarehouseId),
          orderDate,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          customerPoReference: customerPoReference.trim() || undefined,
          billingAddress: billingAddress.trim() || undefined,
          shippingAddress: shippingAddress.trim() || undefined,
          notes: notes.trim() || undefined,
          items: payloadItems,
        }
        await salesService.updateSalesOrder(orderToEdit.id, updatePayload)

        if (targetStatus === 'CONFIRMED') {
          await salesService.confirmSalesOrder(orderToEdit.id)
        }
      } else {
        const createPayload: CreateSalesOrderPayload = {
          orderNumber: orderNumber.trim() || undefined,
          customerId: Number(customerId),
          dispatchWarehouseId: Number(dispatchWarehouseId),
          orderDate,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          customerPoReference: customerPoReference.trim() || undefined,
          billingAddress: billingAddress.trim() || undefined,
          shippingAddress: shippingAddress.trim() || undefined,
          notes: notes.trim() || undefined,
          status: targetStatus,
          items: payloadItems,
        }
        await salesService.createSalesOrder(createPayload)
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save sales order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[780px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <form onSubmit={(e) => handleSave('DRAFT', e)} className="space-y-5">
        {/* Header matching Screenshot 0 */}
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Sales / Sales Orders / {isEditing ? orderNumber : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isEditing ? 'Edit Sales Order' : 'Create Sales Order'}
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

        {/* Error Alert */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Header Fields matching Screenshot 0 */}
        <div className="space-y-3.5">
          {/* Row 1: Sales Order Number | Order Date * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Sales Order Number
              </label>
              <input
                type="text"
                value={orderNumber}
                readOnly
                disabled
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground tabular-nums focus:outline-none opacity-80 cursor-not-allowed"
              />
            </div>

            <DateField
              label="Order Date *"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              required
            />
          </div>

          {/* Row 2: Customer * | Dispatch Warehouse * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Customer *"
              value={customerId}
              onChange={handleCustomerChange}
              placeholder="Select customer..."
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.customerCode})`,
              }))}
            />

            <Select
              label="Dispatch Warehouse *"
              value={dispatchWarehouseId}
              onChange={setDispatchWarehouseId}
              placeholder="Select dispatch warehouse..."
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.name} (${w.warehouseCode})`,
              }))}
            />
          </div>

          {/* Row 3: Expected Delivery Date | Customer PO Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <DateField
              label="Expected Delivery Date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Customer PO Reference
              </label>
              <input
                type="text"
                value={customerPoReference}
                onChange={(e) => setCustomerPoReference(e.target.value)}
                placeholder="Optional reference"
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>

          {/* Row 4: Shipping Address */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Shipping Address
            </label>
            <textarea
              rows={2}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Enter shipping address (auto-populated from Customer Master)"
              className="flex w-full rounded-md border border-border/80 bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>
        </div>

        <div className="border-t border-border/80 pt-2" />

        {/* Section: Order Items matching Screenshot 0 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Order Items</h3>
            <span className="text-xs text-muted-foreground">
              {orderItems.filter((r) => r.itemId).length} items added
            </span>
          </div>

          <Table>
              <THead>
                <tr>
                  <TH className="py-2.5 w-[38%]">Item</TH>
                  <TH className="py-2.5 w-[16%]">Qty</TH>
                  <TH className="py-2.5 w-[10%]">UOM</TH>
                  <TH className="py-2.5 w-[18%]">Unit Price</TH>
                  <TH className="py-2.5 text-right w-[14%]">Amount</TH>
                  <TH className="py-2.5 w-[4%] text-center"></TH>
                </tr>
              </THead>
              <TBody className="divide-y divide-border/60">
                {orderItems.map((row) => {
                  const selItem = row.itemId ? itemMap.get(Number(row.itemId)) : null
                  const qty = typeof row.orderedQuantity === 'number' ? row.orderedQuantity : 0
                  const price = typeof row.unitPrice === 'number' ? row.unitPrice : 0
                  const lineAmount = qty * price

                  return (
                    <TR key={row.rowId} className="hover:bg-secondary/20">
                      {/* Item Select */}
                      <TD className="py-2.5 px-3">
                        <NativeSelect
                          dense
                          value={row.itemId}
                          onChange={(e) =>
                            handleRowChange(row.rowId, 'itemId', e.target.value)
                          }
                        >
                          <option value="">Select item...</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} ({it.itemCode})
                            </option>
                          ))}
                        </NativeSelect>
                      </TD>

                      {/* Qty Input */}
                      <TD className="py-2.5 px-2">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={row.orderedQuantity}
                          onChange={(e) =>
                            handleRowChange(
                              row.rowId,
                              'orderedQuantity',
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                            )
                          }
                          placeholder="1"
                          className="flex h-9 w-full rounded-md border border-border/80 bg-secondary/40 px-2.5 text-xs text-foreground tabular-nums focus:outline-none focus:border-foreground"
                        />
                      </TD>

                      {/* UOM */}
                      <TD className="py-2.5 px-2 text-muted-foreground font-medium">
                        {selItem?.unitOfMeasure || '—'}
                      </TD>

                      {/* Unit Price */}
                      <TD className="py-2.5 px-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.unitPrice}
                          onChange={(e) =>
                            handleRowChange(
                              row.rowId,
                              'unitPrice',
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                            )
                          }
                          placeholder="0.00"
                          className="flex h-9 w-full rounded-md border border-border/80 bg-secondary/40 px-2.5 text-xs text-foreground tabular-nums focus:outline-none focus:border-foreground"
                        />
                      </TD>

                      {/* Line Amount */}
                      <TD className="py-2.5 px-3 text-right tabular-nums font-medium text-foreground">
                        {formatCurrency(lineAmount)}
                      </TD>

                      {/* Delete */}
                      <TD className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(row.rowId)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItemRow}
            className="flex items-center gap-1.5 text-xs font-medium cursor-pointer h-8 rounded-md"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Item</span>
          </Button>
        </div>

        {/* Order Total matching Screenshot 0 */}
        <div className="flex items-center justify-between p-3.5 rounded-md border border-border/80 bg-secondary/30">
          <span className="text-sm font-semibold text-foreground">Order Total</span>
          <span className="text-xl font-medium tabular-nums text-foreground">
            {formatCurrency(calculatedTotal)}
          </span>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional order instructions..."
            className="flex w-full rounded-md border border-border/80 bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
          />
        </div>

        {/* Footer Actions matching Screenshot 0: Save Draft | Confirm Order */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => handleSave('DRAFT', e)}
            disabled={isSubmitting || isLoading}
            className="text-xs font-medium cursor-pointer"
          >
            Save Draft
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={(e) => handleSave('CONFIRMED', e)}
            disabled={isSubmitting || isLoading}
            className="bg-brand hover:bg-brand-hover text-brand-foreground font-medium text-xs px-4 h-9 rounded-md cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Confirming...' : 'Confirm Order'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
