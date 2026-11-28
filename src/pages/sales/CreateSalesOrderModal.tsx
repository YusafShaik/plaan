import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { DateField } from '../../components/ui/DateField'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { masterDataService } from '../../services/masterDataService'
import { salesService } from '../../services/salesService'
import { useAuth } from '../../hooks/useAuth'
import { toast } from '../../lib/feedback'
import { formatMoney } from '../../lib/format'
import type { Customer, Warehouse, Item } from '../../types/masterData'
import type {
  SalesOrder,
  CreateSalesOrderPayload,
  UpdateSalesOrderPayload,
  SalesOrderStatus,
} from '../../types/sales'

export interface CreateSalesOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  orderToEdit?: SalesOrder | null
}

interface OrderItemRow {
  rowId: string
  itemId: string
  orderedQuantity: string
  unitPrice: string
}

export function CreateSalesOrderModal({
  isOpen,
  onClose,
  onSuccess,
  orderToEdit,
}: CreateSalesOrderModalProps) {
  const { organization } = useAuth()
  const currency = organization?.baseCurrency || 'INR'

  const [customers, setCustomers] = useState<Customer[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [items, setItems] = useState<Item[]>([])

  const [orderNumber, setOrderNumber] = useState('SO-...')
  const [customerId, setCustomerId] = useState('')
  const [dispatchWarehouseId, setDispatchWarehouseId] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [customerPoReference, setCustomerPoReference] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')

  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([
    { rowId: 'row-1', itemId: '', orderedQuantity: '', unitPrice: '' },
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(orderToEdit)

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoading(true)
      Promise.all([
        masterDataService.getCustomers({ active: true, size: 200 }),
        masterDataService.getWarehouses({ active: true, size: 100 }),
        masterDataService.getItems({ active: true, size: 300 }),
      ])
        .then(([custRes, whRes, itemRes]) => {
          if (!isMounted) return
          setCustomers(custRes.content)
          setWarehouses(whRes.content)
          setItems(itemRes.content)
        })
        .catch(() => {
          if (isMounted) setError('Failed to load customer, warehouse, or item options.')
        })
        .finally(() => {
          if (isMounted) setIsLoading(false)
        })
    })

    return () => {
      isMounted = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    Promise.resolve().then(() => {
      if (!isMounted) return
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
              orderedQuantity: String(it.orderedQuantity),
              unitPrice: String(it.unitPrice),
            }))
          )
        } else {
          setOrderItems([{ rowId: 'row-1', itemId: '', orderedQuantity: '', unitPrice: '' }])
        }
      } else {
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
            if (isMounted && res?.nextCode) setOrderNumber(res.nextCode)
          })
          .catch(() => {
            if (isMounted) setOrderNumber('SO-001')
          })
      }
    })

    return () => {
      isMounted = false
    }
  }, [isOpen, orderToEdit])

  const itemMap = useMemo(() => {
    const map = new Map<number, Item>()
    items.forEach((it) => map.set(it.id, it))
    return map
  }, [items])

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
    val: string
  ) => {
    setOrderItems((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: val } : r))
    )
  }

  const parsedNum = (raw: string) => {
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  const calculatedTotal = useMemo(() => {
    return orderItems.reduce((acc, row) => {
      const q = parsedNum(row.orderedQuantity)
      const p = Number.isFinite(Number(row.unitPrice)) && Number(row.unitPrice) >= 0 ? Number(row.unitPrice) : 0
      return acc + q * p
    }, 0)
  }, [orderItems])

  const handleSave = async (targetStatus: SalesOrderStatus, e?: FormEvent) => {
    e?.preventDefault()
    setError(null)

    if (!customerId) {
      setError('Customer is required.')
      return
    }
    if (!dispatchWarehouseId) {
      setError('Dispatch warehouse is required.')
      return
    }
    if (!orderDate) {
      setError('Order date is required.')
      return
    }

    const validRows = orderItems.filter((r) => {
      const q = Number(r.orderedQuantity)
      return r.itemId && Number.isFinite(q) && q > 0
    })

    if (validRows.length === 0) {
      setError('Add at least one item with a valid quantity.')
      return
    }

    const itemIds = validRows.map((r) => Number(r.itemId))
    if (new Set(itemIds).size < itemIds.length) {
      setError('Duplicate items found. Each item can only be added once per order.')
      return
    }

    setIsSubmitting(true)
    try {
      const payloadItems = validRows.map((r) => {
        const p = Number(r.unitPrice)
        return {
          itemId: Number(r.itemId),
          orderedQuantity: Number(r.orderedQuantity),
          unitPrice: Number.isFinite(p) && p >= 0 ? p : 0,
        }
      })

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
        toast.success(
          targetStatus === 'CONFIRMED'
            ? `Sales order ${orderToEdit.orderNumber} updated and confirmed`
            : `Sales order ${orderToEdit.orderNumber} updated`
        )
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
        const created = await salesService.createSalesOrder(createPayload)
        toast.success(
          targetStatus === 'CONFIRMED'
            ? `Sales order ${created.orderNumber} confirmed`
            : `Sales order ${created.orderNumber} saved as draft`
        )
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save sales order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addedCount = orderItems.filter((r) => r.itemId).length

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[780px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <form onSubmit={(e) => handleSave('DRAFT', e)} className="space-y-4">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {isEditing ? `Edit sales order · ${orderNumber}` : 'Create sales order'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select customer, dispatch warehouse, delivery schedule, and line items.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                Sales order number
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="tabular-nums text-sm font-medium text-foreground">
                  {orderNumber}
                </span>
                {!isEditing && (
                  <span className="text-xs text-muted-foreground select-none">Auto</span>
                )}
              </div>
            </div>

            <DateField
              label="Order date *"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              label="Dispatch warehouse *"
              value={dispatchWarehouseId}
              onChange={setDispatchWarehouseId}
              placeholder="Select dispatch warehouse..."
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.name} (${w.warehouseCode})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DateField
              label="Expected delivery date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />

            <Input
              label="Customer PO reference"
              value={customerPoReference}
              onChange={(e) => setCustomerPoReference(e.target.value)}
              placeholder="Optional reference"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Shipping address"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Auto-filled from customer master"
            />

            <Input
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional order instructions..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Order items</p>
            <span className="text-xs text-muted-foreground tabular-nums">
              {addedCount} {addedCount === 1 ? 'item' : 'items'} added
            </span>
          </div>

          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            <Table className="border-0 rounded-none" tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="w-[37%]">Item</TH>
                  <TH className="w-[14%] text-right">Qty</TH>
                  <TH className="w-[9%]">UOM</TH>
                  <TH className="w-[17%] text-right">Unit price</TH>
                  <TH className="w-[17%] text-right">Amount</TH>
                  <TH className="w-[6%]" />
                </tr>
              </THead>
              <TBody>
                {orderItems.map((row) => {
                  const selItem = row.itemId ? itemMap.get(Number(row.itemId)) : null
                  const qty = parsedNum(row.orderedQuantity)
                  const rawPrice = Number(row.unitPrice)
                  const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0
                  const lineAmount = qty * price

                  return (
                    <TR key={row.rowId}>
                      <TD className="py-2 px-3">
                        <NativeSelect
                          dense
                          value={row.itemId}
                          onChange={(e) => handleRowChange(row.rowId, 'itemId', e.target.value)}
                        >
                          <option value="">Select item...</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} ({it.itemCode})
                            </option>
                          ))}
                        </NativeSelect>
                      </TD>

                      <TD className="py-2 px-2">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={row.orderedQuantity}
                          onChange={(e) =>
                            handleRowChange(row.rowId, 'orderedQuantity', e.target.value)
                          }
                          placeholder="1"
                          className="h-9 w-full rounded-md border border-border/80 bg-card px-2.5 text-right text-sm tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                        />
                      </TD>

                      <TD className="py-2 px-2 text-xs text-muted-foreground uppercase">
                        {selItem?.unitOfMeasure || '—'}
                      </TD>

                      <TD className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.unitPrice}
                          onChange={(e) => handleRowChange(row.rowId, 'unitPrice', e.target.value)}
                          placeholder="0.00"
                          className="h-9 w-full rounded-md border border-border/80 bg-card px-2.5 text-right text-sm tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                        />
                      </TD>

                      <TD className="py-2 px-3 text-right tabular-nums font-medium text-foreground">
                        {formatMoney(lineAmount, currency)}
                      </TD>

                      <TD className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(row.rowId)}
                          aria-label="Remove item"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-surface-muted/50 px-3 py-2.5">
              <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow}>
                <Plus className="h-3.5 w-3.5" />
                Add item
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">Order total</span>
                <span className="text-base font-semibold tabular-nums text-foreground">
                  {formatMoney(calculatedTotal, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handleSave('DRAFT', e)}
            disabled={isSubmitting || isLoading}
          >
            Save draft
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={(e) => handleSave('CONFIRMED', e)}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? 'Confirming...' : 'Confirm order'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
