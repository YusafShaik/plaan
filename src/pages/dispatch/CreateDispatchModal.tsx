import { useState, useEffect, useCallback } from 'react'
import { X, AlertTriangle, Truck } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { dispatchService } from '../../services/dispatchService'
import { salesService } from '../../services/salesService'
import type { SalesOrder } from '../../types/sales'
import type {
  DispatchOrder,
  CreateDispatchOrderPayload,
  DispatchPrepareResponse,
} from '../../types/dispatch'

export interface CreateDispatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedSalesOrder?: SalesOrder | null
  editingDispatch?: DispatchOrder | null
}

interface DispatchLineForm {
  salesOrderItemId: number
  itemId: number
  itemCode: string
  itemName: string
  unitOfMeasure: string
  orderedQuantity: number
  previouslyDispatchedQuantity: number
  pendingQuantity: number
  onHandQuantity: number
  dispatchQuantity: number | ''
}

export function CreateDispatchModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedSalesOrder,
  editingDispatch,
}: CreateDispatchModalProps) {
  const [dispatchNumber, setDispatchNumber] = useState('')
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0])
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<number | ''>('')
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [preparedData, setPreparedData] = useState<DispatchPrepareResponse | null>(null)

  const [shippingAddress, setShippingAddress] = useState('')
  const [transporterName, setTransporterName] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [transportReference, setTransportReference] = useState('')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<DispatchLineForm[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load eligible sales orders (Confirmed or Partially Dispatched)
  const loadEligibleSalesOrders = useCallback(async () => {
    try {
      const [confirmedRes, partialRes] = await Promise.all([
        salesService.getSalesOrders({ status: 'CONFIRMED', size: 100 }),
        salesService.getSalesOrders({ status: 'PARTIALLY_DISPATCHED', size: 100 }),
      ])
      const merged = [...confirmedRes.content, ...partialRes.content]
      // deduplicate
      const map = new Map<number, SalesOrder>()
      merged.forEach((so) => map.set(so.id, so))
      setSalesOrders(Array.from(map.values()))
    } catch (err) {
      console.error('Failed to load sales orders:', err)
    }
  }, [])

  // Load next number
  const loadNextNumber = useCallback(async () => {
    try {
      const res = await dispatchService.getNextDispatchNumber()
      setDispatchNumber(res.nextCode)
    } catch (err) {
      console.error('Failed to load next dispatch number:', err)
    }
  }, [])

  // Prepare dispatch data when sales order selected
  const handleSelectSalesOrder = useCallback(
    async (orderId: number, currentEditingDispatch?: DispatchOrder | null) => {
      setIsLoading(true)
      setError(null)
      try {
        const prep = await dispatchService.prepareDispatch(orderId)
        setPreparedData(prep)

        // Find full order details if not already loaded
        const fullOrder = await salesService.getSalesOrderById(orderId)
        setSelectedOrder(fullOrder)

        if (!currentEditingDispatch) {
          setShippingAddress(prep.shippingAddress || fullOrder.shippingAddress || '')
        }

        // Map items
        const lineForms: DispatchLineForm[] = prep.items.map((it) => {
          let initialQty: number | '' = ''
          if (currentEditingDispatch) {
            const found = currentEditingDispatch.items.find((i) => i.salesOrderItemId === it.salesOrderItemId)
            if (found) {
              initialQty = found.dispatchQuantity
            }
          }

          return {
            salesOrderItemId: it.salesOrderItemId,
            itemId: it.itemId,
            itemCode: it.itemCode,
            itemName: it.itemName,
            unitOfMeasure: it.unitOfMeasure,
            orderedQuantity: it.orderedQuantity,
            previouslyDispatchedQuantity: it.dispatchedQuantity,
            pendingQuantity: it.pendingQuantity,
            onHandQuantity: it.onHandQuantity,
            dispatchQuantity: initialQty,
          }
        })

        setItems(lineForms)
      } catch (err: unknown) {
        console.error('Failed to prepare dispatch:', err)
        setError(err instanceof Error ? err.message : 'Failed to prepare dispatch for selected order')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!isOpen) return

    Promise.resolve().then(() => {
      loadEligibleSalesOrders()
      setError(null)

      if (editingDispatch) {
        setDispatchNumber(editingDispatch.dispatchNumber)
        setDispatchDate(editingDispatch.dispatchDate)
        setSelectedSalesOrderId(editingDispatch.salesOrderId)
        setShippingAddress(editingDispatch.shippingAddress || '')
        setTransporterName(editingDispatch.transporterName || '')
        setVehicleNumber(editingDispatch.vehicleNumber || '')
        setTransportReference(editingDispatch.transportReference || '')
        setNotes(editingDispatch.notes || '')
        handleSelectSalesOrder(editingDispatch.salesOrderId, editingDispatch)
      } else {
        loadNextNumber()
        setDispatchDate(new Date().toISOString().split('T')[0])
        setTransporterName('')
        setVehicleNumber('')
        setTransportReference('')
        setNotes('')

        if (preselectedSalesOrder) {
          setSelectedSalesOrderId(preselectedSalesOrder.id)
          setShippingAddress(preselectedSalesOrder.shippingAddress || '')
          handleSelectSalesOrder(preselectedSalesOrder.id, null)
        } else {
          setSelectedSalesOrderId('')
          setSelectedOrder(null)
          setPreparedData(null)
          setShippingAddress('')
          setItems([])
        }
      }
    })
  }, [isOpen, editingDispatch, preselectedSalesOrder, loadEligibleSalesOrders, loadNextNumber, handleSelectSalesOrder])

  const handleSalesOrderChange = (soIdStr: string) => {
    const id = Number(soIdStr)
    setSelectedSalesOrderId(id)
    if (id) {
      handleSelectSalesOrder(id, null)
    } else {
      setSelectedOrder(null)
      setPreparedData(null)
      setItems([])
      setShippingAddress('')
    }
  }

  const handleLineQtyChange = (salesOrderItemId: number, valStr: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.salesOrderItemId !== salesOrderItemId) return it
        if (valStr === '') return { ...it, dispatchQuantity: '' }
        const num = parseFloat(valStr)
        return { ...it, dispatchQuantity: isNaN(num) ? '' : num }
      })
    )
  }

  // Fill available quantities matching screenshot
  const handleFillAvailable = () => {
    setItems((prev) =>
      prev.map((it) => {
        const availableToFill = Math.min(it.pendingQuantity, Math.max(0, it.onHandQuantity))
        return {
          ...it,
          dispatchQuantity: availableToFill,
        }
      })
    )
  }

  const formatQuantity = (qty: number) => {
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
  }

  const handleSubmit = async (postDirectly: boolean) => {
    if (!selectedSalesOrderId) {
      setError('Please select a Sales Order.')
      return
    }

    if (!dispatchDate) {
      setError('Dispatch Date is required.')
      return
    }

    // Check items
    const validLines = items.filter(
      (it) => typeof it.dispatchQuantity === 'number' && it.dispatchQuantity > 0
    )

    if (validLines.length === 0) {
      setError('At least one positive dispatch quantity is required.')
      return
    }

    // Validate quantities
    for (const line of items) {
      const q = typeof line.dispatchQuantity === 'number' ? line.dispatchQuantity : 0
      if (q < 0) {
        setError(`Dispatch quantity cannot be negative for ${line.itemName}.`)
        return
      }
      if (q > line.pendingQuantity) {
        setError(`Dispatch quantity (${q}) cannot exceed pending quantity (${line.pendingQuantity}) for ${line.itemName}.`)
        return
      }
      if (postDirectly && q > line.onHandQuantity) {
        setError(`Dispatch quantity (${q}) exceeds available stock (${line.onHandQuantity}) for ${line.itemName}.`)
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateDispatchOrderPayload = {
        dispatchNumber: dispatchNumber.trim() || undefined,
        salesOrderId: Number(selectedSalesOrderId),
        dispatchDate,
        shippingAddress: shippingAddress.trim() || undefined,
        transporterName: transporterName.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
        transportReference: transportReference.trim() || undefined,
        notes: notes.trim() || undefined,
        status: postDirectly ? 'POSTED' : 'DRAFT',
        items: items.map((it) => ({
          salesOrderItemId: it.salesOrderItemId,
          itemId: it.itemId,
          dispatchQuantity: typeof it.dispatchQuantity === 'number' ? it.dispatchQuantity : 0,
        })),
      }

      if (editingDispatch) {
        await dispatchService.updateDispatchOrder(editingDispatch.id, {
          dispatchDate: payload.dispatchDate,
          shippingAddress: payload.shippingAddress,
          transporterName: payload.transporterName,
          vehicleNumber: payload.vehicleNumber,
          transportReference: payload.transportReference,
          notes: payload.notes,
          items: payload.items,
        })
        if (postDirectly) {
          await dispatchService.postDispatchOrder(editingDispatch.id)
        }
      } else {
        await dispatchService.createDispatchOrder(payload)
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      console.error('Failed to save dispatch:', err)
      setError(err instanceof Error ? err.message : 'Failed to save dispatch order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[760px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-5">
        {/* Header matching Screenshot 2 */}
        <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Dispatch / Dispatch Orders / {editingDispatch ? editingDispatch.dispatchNumber : 'New'}
            </p>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {editingDispatch ? `Edit Dispatch ${editingDispatch.dispatchNumber}` : 'Create Dispatch'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-[10px] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1.5">Dispatch Number</label>
            <input
              type="text"
              value={dispatchNumber}
              disabled
              className="w-full px-3 py-2 rounded-[8px] border border-border/80 bg-secondary/30 text-muted-foreground font-mono text-xs cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1.5">Dispatch Date *</label>
            <input
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-[8px] border border-border/80 bg-card text-foreground text-xs focus:outline-hidden focus:border-foreground transition-colors"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1.5">Sales Order *</label>
            <select
              value={selectedSalesOrderId}
              onChange={(e) => handleSalesOrderChange(e.target.value)}
              disabled={isSubmitting || !!editingDispatch || (!!preselectedSalesOrder && salesOrders.length <= 1)}
              className="w-full px-3 py-2 rounded-[8px] border border-border/80 bg-card text-foreground text-xs focus:outline-hidden focus:border-foreground transition-colors cursor-pointer disabled:opacity-60"
            >
              <option value="">Select confirmed Sales Order...</option>
              {salesOrders.map((so) => (
                <option key={so.id} value={so.id}>
                  {so.orderNumber} — {so.customerName} ({so.status === 'PARTIALLY_DISPATCHED' ? 'Partially Dispatched' : 'Confirmed'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1.5">Customer</label>
            <input
              type="text"
              value={preparedData?.customerName || selectedOrder?.customerName || '—'}
              disabled
              className="w-full px-3 py-2 rounded-[8px] border border-border/80 bg-secondary/30 text-muted-foreground text-xs cursor-not-allowed"
            />
          </div>
        </div>

        {/* Dispatch Warehouse */}
        <div className="text-xs">
          <label className="block font-medium text-foreground mb-1.5">Dispatch Warehouse</label>
          <input
            type="text"
            value={preparedData?.dispatchWarehouseName || selectedOrder?.warehouseName || '—'}
            disabled
            className="w-full px-3 py-2 rounded-[8px] border border-border/80 bg-secondary/30 text-muted-foreground text-xs cursor-not-allowed"
          />
        </div>

        {/* Shipping Address */}
        <div className="text-xs">
          <label className="block font-medium text-foreground mb-1.5">Shipping Address</label>
          <textarea
            rows={2}
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            disabled={isSubmitting}
            placeholder="Shipping destination address..."
            className="w-full px-3 py-2 rounded-[8px] border border-border/80 bg-card text-foreground text-xs focus:outline-hidden focus:border-foreground transition-colors resize-none"
          />
        </div>

        {/* Items to dispatch */}
        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Items to dispatch</h3>

          <div className="overflow-x-auto rounded-[10px] border border-border/80 bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3.5">Item</th>
                  <th className="py-2.5 px-3 text-right">Pending</th>
                  <th className="py-2.5 px-3 text-right">On Hand</th>
                  <th className="py-2.5 px-3.5 text-right w-36">Dispatch Qty</th>
                  <th className="py-2.5 px-3">UOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Loading order items and warehouse stock...
                    </td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((line) => {
                    const isExceeded =
                      typeof line.dispatchQuantity === 'number' &&
                      (line.dispatchQuantity > line.pendingQuantity || line.dispatchQuantity > line.onHandQuantity)

                    return (
                      <tr key={line.salesOrderItemId} className="hover:bg-secondary/15 transition-colors">
                        <td className="py-3 px-3.5 font-medium text-foreground">
                          <p>{line.itemName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{line.itemCode}</p>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">
                          {formatQuantity(line.pendingQuantity)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {formatQuantity(line.onHandQuantity)}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <input
                            type="number"
                            min="0"
                            max={line.pendingQuantity}
                            step="any"
                            value={line.dispatchQuantity}
                            onChange={(e) => handleLineQtyChange(line.salesOrderItemId, e.target.value)}
                            disabled={isSubmitting}
                            placeholder="0"
                            className={`w-28 px-2.5 py-1.5 rounded-[6px] border text-right font-mono text-xs focus:outline-hidden transition-colors ${
                              isExceeded
                                ? 'border-destructive bg-destructive/10 text-destructive'
                                : 'border-border/80 bg-secondary/20 text-foreground focus:border-foreground'
                            }`}
                          />
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{line.unitOfMeasure}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      {selectedSalesOrderId ? 'No pending items found for this order.' : 'Select a Sales Order to load items.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleFillAvailable}
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded-[10px] border border-border/80 bg-secondary/30 hover:bg-secondary/60 text-xs font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              Fill available quantities
            </button>
          )}
        </div>

        {/* Transportation Details Section matching Screenshot 2 */}
        <div className="space-y-2.5 pt-1">
          <h3 className="text-sm font-semibold text-foreground">Transportation details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-foreground mb-1.5">Transporter Name</label>
              <input
                type="text"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                disabled={isSubmitting}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-[8px] border border-border/80 bg-card text-foreground text-xs focus:outline-hidden focus:border-foreground transition-colors"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1.5">Vehicle Number</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                disabled={isSubmitting}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-[8px] border border-border/80 bg-card text-foreground text-xs focus:outline-hidden focus:border-foreground transition-colors font-mono"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-medium text-foreground mb-1.5">Transport Reference / LR Number</label>
            <input
              type="text"
              value={transportReference}
              onChange={(e) => setTransportReference(e.target.value)}
              disabled={isSubmitting}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-[8px] border border-border/80 bg-card text-foreground text-xs focus:outline-hidden focus:border-foreground transition-colors font-mono"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="text-xs">
          <label className="block font-medium text-foreground mb-1.5">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            placeholder="Additional dispatch instructions..."
            className="w-full px-3 py-2 rounded-[8px] border border-border/80 bg-card text-foreground text-xs focus:outline-hidden focus:border-foreground transition-colors resize-none"
          />
        </div>

        {/* Actions matching Screenshot 2 & 3 */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/80">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || items.length === 0}
            className="text-xs font-medium cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button
            size="sm"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || items.length === 0}
            className="bg-[#107048] hover:bg-[#0d603e] text-white font-medium text-xs px-4 h-9 rounded-[8px] cursor-pointer shadow-xs"
          >
            {isSubmitting ? 'Posting...' : 'Post Dispatch'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
