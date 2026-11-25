import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Ban,
  Pencil,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Truck,
  Plus,
  ChevronRight,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { salesService } from '../../services/salesService'
import { dispatchService } from '../../services/dispatchService'
import { useAuth } from '../../hooks/useAuth'
import type { SalesOrder, SalesOrderStockAvailability } from '../../types/sales'
import type { DispatchOrder } from '../../types/dispatch'
import { CreateDispatchModal } from '../dispatch/CreateDispatchModal'
import { DispatchDetailsModal } from '../dispatch/DispatchDetailsModal'

export interface SalesOrderDetailsModalProps {
  isOpen: boolean
  order: SalesOrder | null
  onClose: () => void
  onEdit?: (order: SalesOrder) => void
  onOrderUpdated?: () => void
}

export function SalesOrderDetailsModal({
  isOpen,
  order,
  onClose,
  onEdit,
  onOrderUpdated,
}: SalesOrderDetailsModalProps) {
  const { organization } = useAuth()
  const currencySymbol =
    organization?.baseCurrency === 'USD'
      ? '$'
      : organization?.baseCurrency === 'EUR'
      ? '€'
      : '₹'

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [currentOrder, setCurrentOrder] = useState<SalesOrder | null>(order)

  const [availability, setAvailability] = useState<SalesOrderStockAvailability | null>(null)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const [dispatches, setDispatches] = useState<DispatchOrder[]>([])
  const [isLoadingDispatches, setIsLoadingDispatches] = useState(false)
  const [isCreateDispatchOpen, setIsCreateDispatchOpen] = useState(false)
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchOrder | null>(null)
  const [isDispatchDetailsOpen, setIsDispatchDetailsOpen] = useState(false)

  const fetchAvailability = useCallback(async (orderId: number) => {
    setIsLoadingAvailability(true)
    setAvailabilityError(null)
    try {
      const res = await salesService.getStockAvailability(orderId)
      setAvailability(res)
    } catch (err: unknown) {
      console.error('Failed to fetch stock availability:', err)
      setAvailabilityError(err instanceof Error ? err.message : 'Failed to fetch stock availability.')
    } finally {
      setIsLoadingAvailability(false)
    }
  }, [])

  const fetchDispatches = useCallback(async (orderId: number) => {
    setIsLoadingDispatches(true)
    try {
      const list = await dispatchService.getDispatchOrdersBySalesOrder(orderId)
      setDispatches(list)
    } catch (err) {
      console.error('Failed to fetch dispatches:', err)
    } finally {
      setIsLoadingDispatches(false)
    }
  }, [])

  const refreshOrder = useCallback(
    async (orderId: number) => {
      try {
        const fresh = await salesService.getSalesOrderById(orderId)
        setCurrentOrder(fresh)
      } catch (err) {
        console.error('Failed to reload order:', err)
      }
      fetchAvailability(orderId)
      fetchDispatches(orderId)
      onOrderUpdated?.()
    },
    [fetchAvailability, fetchDispatches, onOrderUpdated]
  )

  useEffect(() => {
    if (isOpen && order?.id) {
      Promise.resolve().then(() => {
        setCurrentOrder(order)
        fetchAvailability(order.id)
        fetchDispatches(order.id)
      })
    } else {
      Promise.resolve().then(() => {
        setCurrentOrder(null)
        setAvailability(null)
        setAvailabilityError(null)
        setDispatches([])
      })
    }
  }, [isOpen, order?.id, order, fetchAvailability, fetchDispatches])

  if (!isOpen || !order) return null

  const displayOrder = currentOrder || order

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`
  }

  const formatQuantity = (qty: number) => {
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setActionError(null)
    try {
      await salesService.confirmSalesOrder(order.id)
      onOrderUpdated?.()
      onClose()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm sales order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm(`Are you sure you want to cancel sales order ${order.orderNumber}?`)) {
      return
    }

    setIsSubmitting(true)
    setActionError(null)
    try {
      await salesService.cancelSalesOrder(order.id)
      onOrderUpdated?.()
      onClose()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel sales order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete draft sales order ${order.orderNumber}?`)) {
      return
    }

    setIsSubmitting(true)
    setActionError(null)
    try {
      await salesService.deleteSalesOrder(order.id)
      onOrderUpdated?.()
      onClose()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete sales order.')
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
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Sales / Sales Orders / {displayOrder.orderNumber}
            </p>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl font-medium tracking-tight text-foreground">
                {displayOrder.orderNumber}
              </span>
              {displayOrder.status === 'CONFIRMED' && (
                <Badge variant="success">Confirmed</Badge>
              )}
              {displayOrder.status === 'PARTIALLY_DISPATCHED' && (
                <Badge variant="warning">Partially Dispatched</Badge>
              )}
              {displayOrder.status === 'FULLY_DISPATCHED' && (
                <Badge variant="success">Fully Dispatched</Badge>
              )}
              {displayOrder.status === 'DRAFT' && (
                <Badge variant="warning">Draft</Badge>
              )}
              {displayOrder.status === 'CANCELLED' && (
                <Badge variant="destructive">Cancelled</Badge>
              )}
            </div>

            <p className="mt-1 text-sm font-semibold text-foreground">
              {displayOrder.customerName} · {formatCurrency(displayOrder.totalAmount)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Error Alert */}
        {actionError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Order Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Order Date</span>
            <p className="mt-1 font-semibold text-foreground">{formatDate(displayOrder.orderDate)}</p>
          </div>

          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Expected Delivery</span>
            <p className="mt-1 font-semibold text-foreground">
              {formatDate(displayOrder.expectedDeliveryDate)}
            </p>
          </div>

          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">PO Reference</span>
            <p className="mt-1 font-medium text-foreground font-mono">
              {displayOrder.customerPoReference || '—'}
            </p>
          </div>

          <div className="rounded-md border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Dispatch Warehouse</span>
            <p className="mt-1 font-semibold text-foreground">{displayOrder.warehouseName}</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-border/80 bg-secondary/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-medium">Billing Address</span>
            <p className="text-foreground whitespace-pre-wrap">
              {displayOrder.billingAddress || 'No billing address specified.'}
            </p>
          </div>

          <div className="rounded-md border border-border/80 bg-secondary/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-medium">Shipping Address</span>
            <p className="text-foreground whitespace-pre-wrap">
              {displayOrder.shippingAddress || 'No shipping address specified.'}
            </p>
          </div>
        </div>

        {/* Order Fulfillment Section matching Screenshot 4 */}
        <div className="space-y-4 rounded-md border border-border/80 bg-secondary/15 p-4">
          <h3 className="text-sm font-semibold text-foreground">Order Fulfillment</h3>

          {/* Item Progress Bars */}
          <div className="space-y-3.5">
            {displayOrder.items.map((it) => {
              const ordered = it.orderedQuantity || 0
              const dispatched = it.dispatchedQuantity || 0
              const pending = it.pendingQuantity ?? Math.max(0, ordered - dispatched)
              const percent = ordered > 0 ? Math.min(100, Math.round((dispatched / ordered) * 100)) : 0
              const isFullyDispatched = dispatched >= ordered && ordered > 0

              return (
                <div key={it.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{it.itemName}</span>
                    <span className="font-mono text-muted-foreground">
                      {formatQuantity(dispatched)} / {formatQuantity(ordered)} {it.unitOfMeasure}
                    </span>
                  </div>

                  <div className="w-full bg-secondary/80 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-success h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="text-[11px]">
                    {isFullyDispatched ? (
                      <span className="text-success font-medium">Fully dispatched</span>
                    ) : (
                      <span className="text-muted-foreground">{formatQuantity(pending)} {it.unitOfMeasure} pending</span>
                    )}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Fulfillment Summary Table matching Screenshot 4 */}
          <Table>
              <THead>
                <tr>
                  <TH className="py-2.5">Item</TH>
                  <TH className="py-2.5 text-right">Ordered</TH>
                  <TH className="py-2.5 text-right">Dispatched</TH>
                  <TH className="py-2.5 text-right">Pending</TH>
                </tr>
              </THead>
              <TBody className="divide-y divide-border/60">
                {displayOrder.items.map((it) => {
                  const ordered = it.orderedQuantity || 0
                  const dispatched = it.dispatchedQuantity || 0
                  const pending = it.pendingQuantity ?? Math.max(0, ordered - dispatched)

                  return (
                    <TR key={it.id} className="hover:bg-secondary/20 transition-colors">
                      <TD className="py-2.5 px-3.5 font-medium text-foreground">
                        {it.itemName}
                      </TD>
                      <TD className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                        {formatQuantity(ordered)}
                      </TD>
                      <TD className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                        {formatQuantity(dispatched)}
                      </TD>
                      <TD className={`py-2.5 px-3.5 text-right font-mono font-medium ${
                        pending > 0 ? 'text-orange-400' : 'text-muted-foreground'
                      }`}>
                        {formatQuantity(pending)}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
        </div>

        {/* Dispatch History Section matching Screenshot 4 */}
        <div className="space-y-3 rounded-md border border-border/80 bg-secondary/15 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Dispatch History</h3>
            {(displayOrder.status === 'CONFIRMED' || displayOrder.status === 'PARTIALLY_DISPATCHED') && (
              <Button
                size="sm"
                onClick={() => setIsCreateDispatchOpen(true)}
                className="bg-brand hover:bg-brand-hover text-brand-foreground font-medium text-xs px-3.5 h-7.5 rounded-md cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Dispatch</span>
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {isLoadingDispatches ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Loading dispatch history...
              </div>
            ) : dispatches.length === 0 ? (
              <div className="p-4 rounded-md border border-border/80 bg-secondary/10 text-center text-xs text-muted-foreground">
                No dispatches recorded yet for this order.
              </div>
            ) : (
              dispatches.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    setSelectedDispatch(d)
                    setIsDispatchDetailsOpen(true)
                  }}
                  className="flex items-center justify-between p-3 rounded-md border border-border/80 bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-secondary/50 text-muted-foreground">
                      <Truck className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="font-mono font-medium text-foreground text-xs">{d.dispatchNumber}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(d.dispatchDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {d.status === 'POSTED' ? (
                      <span className="text-xs font-semibold text-success">Posted</span>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">Draft</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stock Availability Section matching Screenshot */}
        <div className="space-y-3 rounded-md border border-border/80 bg-secondary/15 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Stock Availability</h3>
            {availability && (
              availability.overallStatus === 'STOCK_SHORTAGE' ? (
                <Badge variant="warning">Stock Shortage</Badge>
              ) : (
                <Badge variant="success">All Available</Badge>
              )
            )}
          </div>

          {availabilityError ? (
            <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <span>{availabilityError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAvailability(order.id)}
                className="h-7 text-xs"
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <Table>
              <THead>
                <tr>
                  <TH className="py-2.5">Item</TH>
                      <TH className="py-2.5 text-right">Ordered</TH>
                      <TH className="py-2.5 text-right">On Hand</TH>
                      <TH className="py-2.5 text-right">Shortage</TH>
                      <TH className="py-2.5 text-right">Status</TH>
                    </tr>
                  </THead>
                  <TBody className="divide-y divide-border/60">
                    {isLoadingAvailability && !availability ? (
                      <TR>
                        <TD colSpan={5} className="py-6 text-center text-muted-foreground">
                          Checking warehouse stock levels...
                        </TD>
                      </TR>
                    ) : availability && availability.items.length > 0 ? (
                      availability.items.map((it) => (
                        <TR key={it.itemId} className="hover:bg-secondary/20 transition-colors">
                          <TD className="py-3 px-3.5 font-medium text-foreground">
                            <p>{it.itemName}</p>
                            <p className="text-[11px] text-ref text-muted-foreground">{it.itemCode}</p>
                          </TD>
                          <TD className="py-3 px-3 text-right font-mono font-medium text-foreground">
                            {formatQuantity(it.orderedQuantity)}
                          </TD>
                          <TD className="py-3 px-3 text-right font-mono font-medium text-foreground">
                            {formatQuantity(it.onHandQuantity)}
                          </TD>
                          <TD className={`py-3 px-3 text-right font-mono font-medium ${
                            it.shortageQuantity > 0 ? 'text-destructive' : 'text-foreground'
                          }`}>
                            {formatQuantity(it.shortageQuantity)}
                          </TD>
                          <TD className="py-3 px-3.5 text-right">
                            {it.status === 'AVAILABLE' && (
                              <Badge variant="success" className="h-auto px-2 py-0.5 text-[11px] font-medium">
                                Available
                              </Badge>
                            )}
                            {it.status === 'PARTIALLY_AVAILABLE' && (
                              <Badge variant="warning" className="h-auto px-2 py-0.5 text-[11px] font-medium">
                                Partial
                              </Badge>
                            )}
                            {it.status === 'NOT_AVAILABLE' && (
                              <Badge variant="destructive" className="h-auto px-2 py-0.5 text-[11px] font-medium">
                                Unavailable
                              </Badge>
                            )}
                          </TD>
                        </TR>
                      ))
                    ) : (
                      <TR>
                        <TD colSpan={5} className="py-4 text-center text-muted-foreground">
                          No items to evaluate.
                        </TD>
                      </TR>
                    )}
                  </TBody>
            </Table>

              {availability && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    {availability.shortageItems === 0
                      ? `All items have sufficient stock in ${displayOrder.warehouseName}.`
                      : availability.shortageItems === 1
                      ? '1 item has insufficient stock.'
                      : `${availability.shortageItems} items have insufficient stock.`}
                  </span>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => fetchAvailability(displayOrder.id)}
                  disabled={isLoadingAvailability}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-border/80 bg-secondary/30 hover:bg-secondary/60 text-xs font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAvailability ? 'animate-spin' : ''}`} />
                  <span>Refresh live stock</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Items Table */}
        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Ordered Items</h3>

          <Table>
              <THead>
                <tr>
                  <TH className="py-2.5">Item</TH>
                  <TH className="py-2.5 text-right">Quantity</TH>
                  <TH className="py-2.5">UOM</TH>
                  <TH className="py-2.5 text-right">Unit Price</TH>
                  <TH className="py-2.5 text-right">Amount</TH>
                </tr>
              </THead>
              <TBody className="divide-y divide-border/60">
                {displayOrder.items.map((it) => (
                  <TR key={it.id} className="hover:bg-secondary/20 transition-colors">
                    <TD className="py-3 px-3.5 font-medium text-foreground">
                      <p>{it.itemName}</p>
                      <p className="text-[11px] text-ref text-muted-foreground">{it.itemCode}</p>
                    </TD>
                    <TD className="py-3 px-3 text-right font-mono font-medium text-foreground">
                      {formatQuantity(it.orderedQuantity)}
                    </TD>
                    <TD className="py-3 px-3 text-muted-foreground">{it.unitOfMeasure}</TD>
                    <TD className="py-3 px-3 text-right font-mono text-muted-foreground">
                      {formatCurrency(it.unitPrice)}
                    </TD>
                    <TD className="py-3 px-3.5 text-right font-mono font-medium text-foreground">
                      {formatCurrency(it.lineAmount)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
        </div>

        {/* Order Total Card */}
        <div className="flex items-center justify-between p-3.5 rounded-md border border-border/80 bg-secondary/30">
          <span className="text-sm font-semibold text-foreground">Total Order Amount</span>
          <span className="text-xl font-medium font-mono text-foreground">
            {formatCurrency(displayOrder.totalAmount)}
          </span>
        </div>

        {/* Notes */}
        {displayOrder.notes && (
          <div className="rounded-md border border-border/80 bg-secondary/20 p-3 text-xs">
            <span className="text-muted-foreground font-medium">Notes:</span>
            <p className="mt-0.5 text-foreground italic">{displayOrder.notes}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/80">
          <div>
            {displayOrder.status === 'DRAFT' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Draft</span>
              </Button>
            )}

            {displayOrder.status === 'CONFIRMED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSubmitting || dispatches.some((d) => d.status === 'POSTED')}
                title={dispatches.some((d) => d.status === 'POSTED') ? 'Cannot cancel sales order with posted dispatches' : 'Cancel order'}
                className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Cancel Order</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {displayOrder.status === 'DRAFT' && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(displayOrder)
                  onClose()
                }}
                disabled={isSubmitting}
                className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Draft</span>
              </Button>
            )}

            {displayOrder.status === 'DRAFT' && (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="bg-brand hover:bg-brand-hover text-brand-foreground font-medium text-xs px-4 h-8 rounded-md cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Order'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-medium cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>

        {/* Create Dispatch Modal */}
        <CreateDispatchModal
          isOpen={isCreateDispatchOpen}
          onClose={() => setIsCreateDispatchOpen(false)}
          onSuccess={() => refreshOrder(displayOrder.id)}
          preselectedSalesOrder={displayOrder}
        />

        {/* Dispatch Details Modal */}
        <DispatchDetailsModal
          isOpen={isDispatchDetailsOpen}
          dispatch={selectedDispatch}
          onClose={() => {
            setIsDispatchDetailsOpen(false)
            setSelectedDispatch(null)
          }}
          onDispatchUpdated={() => refreshOrder(displayOrder.id)}
        />
      </div>
    </Modal>
  )
}
