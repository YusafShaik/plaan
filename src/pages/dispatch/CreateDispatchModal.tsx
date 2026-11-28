import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateField } from '../../components/ui/DateField'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { dispatchService } from '../../services/dispatchService'
import { salesService } from '../../services/salesService'
import { toast } from '../../lib/feedback'
import { formatQuantity } from '../../lib/format'
import { cn } from '../../lib/cn'
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
  dispatchQuantity: string
}

export function CreateDispatchModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedSalesOrder,
  editingDispatch,
}: CreateDispatchModalProps) {
  const [dispatchNumber, setDispatchNumber] = useState('DSP-...')
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

  const loadEligibleSalesOrders = useCallback(async () => {
    try {
      const [confirmedRes, partialRes] = await Promise.all([
        salesService.getSalesOrders({ status: 'CONFIRMED', size: 100 }),
        salesService.getSalesOrders({ status: 'PARTIALLY_DISPATCHED', size: 100 }),
      ])
      const map = new Map<number, SalesOrder>()
      ;[...confirmedRes.content, ...partialRes.content].forEach((so) => map.set(so.id, so))
      setSalesOrders(Array.from(map.values()))
    } catch {
      // Handled smoothly if dropdown list fails
    }
  }, [])

  const handleSelectSalesOrder = useCallback(
    async (orderId: number, currentEditingDispatch?: DispatchOrder | null) => {
      setIsLoading(true)
      setError(null)
      try {
        const [prep, fullOrder] = await Promise.all([
          dispatchService.prepareDispatch(orderId),
          salesService.getSalesOrderById(orderId),
        ])
        setPreparedData(prep)
        setSelectedOrder(fullOrder)

        if (!currentEditingDispatch) {
          setShippingAddress(prep.shippingAddress || fullOrder.shippingAddress || '')
        }

        const lineForms: DispatchLineForm[] = prep.items.map((it) => {
          let initialQty = ''
          if (currentEditingDispatch) {
            const found = currentEditingDispatch.items.find(
              (i) => i.salesOrderItemId === it.salesOrderItemId
            )
            if (found) initialQty = String(found.dispatchQuantity)
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
        setError(
          err instanceof Error ? err.message : 'Failed to prepare dispatch for selected order.'
        )
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!isOpen) return
    let mounted = true

    Promise.resolve().then(() => {
      if (!mounted) return
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
        dispatchService
          .getNextDispatchNumber()
          .then((res) => {
            if (mounted && res?.nextCode) setDispatchNumber(res.nextCode)
          })
          .catch(() => {
            if (mounted) setDispatchNumber('DSP-001')
          })

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

    return () => {
      mounted = false
    }
  }, [isOpen, editingDispatch, preselectedSalesOrder, loadEligibleSalesOrders, handleSelectSalesOrder])

  const handleSalesOrderChange = (soIdStr: string) => {
    const id = Number(soIdStr)
    setSelectedSalesOrderId(id || '')
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
      prev.map((it) =>
        it.salesOrderItemId === salesOrderItemId ? { ...it, dispatchQuantity: valStr } : it
      )
    )
  }

  const handleFillAvailable = () => {
    setItems((prev) =>
      prev.map((it) => {
        const availableToFill = Math.min(it.pendingQuantity, Math.max(0, it.onHandQuantity))
        return {
          ...it,
          dispatchQuantity: availableToFill > 0 ? String(availableToFill) : '0',
        }
      })
    )
  }

  const handleSubmit = async (postDirectly: boolean) => {
    if (!selectedSalesOrderId) {
      setError('Sales order is required.')
      return
    }
    if (!dispatchDate) {
      setError('Dispatch date is required.')
      return
    }

    const parsedQty = (raw: string) => {
      const n = Number(raw)
      return Number.isFinite(n) ? n : 0
    }

    const validLines = items.filter((it) => parsedQty(it.dispatchQuantity) > 0)
    if (validLines.length === 0) {
      setError('Enter a positive dispatch quantity for at least one item.')
      return
    }

    for (const line of items) {
      const q = parsedQty(line.dispatchQuantity)
      if (q < 0) {
        setError(`Dispatch quantity cannot be negative for ${line.itemName}.`)
        return
      }
      if (q > line.pendingQuantity) {
        setError(
          `Dispatch quantity (${q}) cannot exceed pending quantity (${line.pendingQuantity}) for ${line.itemName}.`
        )
        return
      }
      if (postDirectly && q > line.onHandQuantity) {
        setError(
          `Dispatch quantity (${q}) exceeds available stock (${line.onHandQuantity}) for ${line.itemName}.`
        )
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
          dispatchQuantity: parsedQty(it.dispatchQuantity),
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
        toast.success(
          postDirectly
            ? `Dispatch ${editingDispatch.dispatchNumber} updated and posted`
            : `Dispatch ${editingDispatch.dispatchNumber} updated`
        )
      } else {
        const created = await dispatchService.createDispatchOrder(payload)
        toast.success(
          postDirectly
            ? `Dispatch ${created.dispatchNumber} posted`
            : `Dispatch ${created.dispatchNumber} saved as draft`
        )
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save dispatch order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const customerDisplay = preparedData?.customerName || selectedOrder?.customerName || '—'
  const warehouseDisplay =
    preparedData?.dispatchWarehouseName || selectedOrder?.warehouseName || '—'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[820px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {editingDispatch
                ? `Edit dispatch · ${editingDispatch.dispatchNumber}`
                : 'Create dispatch'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Prepare outbound shipment quantities, destination address, and transport details.
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
                Dispatch number
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="tabular-nums text-sm font-medium text-foreground">
                  {dispatchNumber}
                </span>
                {!editingDispatch && (
                  <span className="text-xs text-muted-foreground select-none">Auto</span>
                )}
              </div>
            </div>

            <DateField
              label="Dispatch date *"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              disabled={isSubmitting}
            />

            <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                Dispatch warehouse
              </span>
              <span className="text-sm font-medium text-foreground truncate">
                {warehouseDisplay}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Select
                label="Sales order *"
                value={selectedSalesOrderId}
                onChange={handleSalesOrderChange}
                disabled={
                  isSubmitting ||
                  !!editingDispatch ||
                  (!!preselectedSalesOrder && salesOrders.length <= 1)
                }
                placeholder="Select confirmed sales order..."
                options={salesOrders.map((so) => ({
                  value: so.id,
                  label: `${so.orderNumber} — ${so.customerName} (${
                    so.status === 'PARTIALLY_DISPATCHED' ? 'Partially dispatched' : 'Confirmed'
                  })`,
                }))}
              />
            </div>

            <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                Customer
              </span>
              <span className="text-sm font-medium text-foreground truncate">
                {customerDisplay}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Shipping address"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              disabled={isSubmitting}
              placeholder="Shipping destination address..."
            />

            <Input
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder="Optional dispatch instructions..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Items to dispatch</h3>
            {items.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillAvailable}
                disabled={isSubmitting}
              >
                Fill available quantities
              </Button>
            )}
          </div>

          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            <Table className="border-0 rounded-none" tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="w-[42%]">Item</TH>
                  <TH className="w-[14%] text-right">Pending</TH>
                  <TH className="w-[14%] text-right">On hand</TH>
                  <TH className="w-[20%] text-right">Dispatch qty</TH>
                  <TH className="w-[10%] pl-4">UOM</TH>
                </tr>
              </THead>
              <TBody>
                {isLoading ? (
                  <TR>
                    <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                      Loading order items and warehouse stock...
                    </TD>
                  </TR>
                ) : items.length > 0 ? (
                  items.map((line) => {
                    const numQty = Number(line.dispatchQuantity)
                    const isExceeded =
                      line.dispatchQuantity !== '' &&
                      Number.isFinite(numQty) &&
                      (numQty > line.pendingQuantity || numQty > line.onHandQuantity)

                    return (
                      <TR key={line.salesOrderItemId}>
                        <TD>
                          <p className="font-medium text-foreground truncate">{line.itemName}</p>
                          <p className="text-ref text-muted-foreground">{line.itemCode}</p>
                        </TD>
                        <TD className="text-right tabular-nums font-medium">
                          {formatQuantity(line.pendingQuantity)}
                        </TD>
                        <TD className="text-right tabular-nums text-muted-foreground">
                          {formatQuantity(line.onHandQuantity)}
                        </TD>
                        <TD className="text-right">
                          <input
                            type="number"
                            min="0"
                            max={line.pendingQuantity}
                            step="any"
                            value={line.dispatchQuantity}
                            onChange={(e) =>
                              handleLineQtyChange(line.salesOrderItemId, e.target.value)
                            }
                            disabled={isSubmitting}
                            placeholder="0"
                            className={cn(
                              'h-9 w-full rounded-md border px-2.5 text-right text-sm tabular-nums focus:outline-none focus:ring-1',
                              isExceeded
                                ? 'border-destructive bg-destructive/10 text-destructive focus:ring-destructive'
                                : 'border-border/80 bg-card text-foreground focus:border-foreground focus:ring-foreground'
                            )}
                          />
                        </TD>
                        <TD className="pl-4 text-xs text-muted-foreground uppercase">
                          {line.unitOfMeasure}
                        </TD>
                      </TR>
                    )
                  })
                ) : (
                  <TR>
                    <TD colSpan={5} className="py-6 text-center text-muted-foreground">
                      {selectedSalesOrderId
                        ? 'No pending items found for this order.'
                        : 'Select a sales order above to load pending items.'}
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground">Transportation details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Transporter name"
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              disabled={isSubmitting}
              placeholder="Optional carrier"
            />
            <Input
              label="Vehicle number"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              disabled={isSubmitting}
              placeholder="Optional vehicle"
            />
            <Input
              label="LR / transport ref"
              value={transportReference}
              onChange={(e) => setTransportReference(e.target.value)}
              disabled={isSubmitting}
              placeholder="Optional reference"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSubmit(false)}
            disabled={isSubmitting || items.length === 0}
          >
            {isSubmitting ? 'Saving...' : 'Save draft'}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleSubmit(true)}
            disabled={isSubmitting || items.length === 0}
          >
            {isSubmitting ? 'Posting...' : 'Post dispatch'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
