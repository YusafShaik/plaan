import { useState, useEffect, useCallback } from 'react'
import {
  Ban,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
} from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge, type BadgeProps } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { salesService } from '../../services/salesService'
import { dispatchService } from '../../services/dispatchService'
import { useAuth } from '../../hooks/useAuth'
import { confirmAction, toast } from '../../lib/feedback'
import { formatMoney, formatQuantity, formatShortDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import type {
  SalesOrder,
  SalesOrderStatus,
  SalesOrderStockAvailability,
} from '../../types/sales'
import type { DispatchOrder } from '../../types/dispatch'
import { CreateDispatchModal } from '../dispatch/CreateDispatchModal'
import { DispatchDetailsModal } from '../dispatch/DispatchDetailsModal'

const STATUS_BADGE: Record<
  SalesOrderStatus,
  { variant: NonNullable<BadgeProps['variant']>; label: string }
> = {
  DRAFT: { variant: 'neutral', label: 'Draft' },
  CONFIRMED: { variant: 'info', label: 'Confirmed' },
  PARTIALLY_DISPATCHED: { variant: 'warning', label: 'Partially dispatched' },
  FULLY_DISPATCHED: { variant: 'success', label: 'Fully dispatched' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

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
  const baseCurrency = organization?.baseCurrency || 'INR'

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
      setAvailabilityError(
        err instanceof Error ? err.message : 'Failed to fetch stock availability.'
      )
    } finally {
      setIsLoadingAvailability(false)
    }
  }, [])

  const fetchDispatches = useCallback(async (orderId: number) => {
    setIsLoadingDispatches(true)
    try {
      const list = await dispatchService.getDispatchOrdersBySalesOrder(orderId)
      setDispatches(list)
    } catch {
      // Non-critical list fetch failure handled silently
    } finally {
      setIsLoadingDispatches(false)
    }
  }, [])

  const refreshOrder = useCallback(
    async (orderId: number) => {
      try {
        const fresh = await salesService.getSalesOrderById(orderId)
        setCurrentOrder(fresh)
      } catch {
        // Keep current snapshot on partial error
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
        setActionError(null)
        fetchAvailability(order.id)
        fetchDispatches(order.id)
      })
    } else {
      Promise.resolve().then(() => {
        setCurrentOrder(null)
        setActionError(null)
        setAvailability(null)
        setAvailabilityError(null)
        setDispatches([])
      })
    }
  }, [isOpen, order?.id, order, fetchAvailability, fetchDispatches])

  if (!isOpen || !order) return null

  const displayOrder = currentOrder || order
  const orderCurrency = displayOrder.currency || baseCurrency
  const badge = STATUS_BADGE[displayOrder.status] ?? {
    variant: 'neutral',
    label: displayOrder.status,
  }
  const hasPostedDispatch = dispatches.some((d) => d.status === 'POSTED')
  const showAvailability =
    displayOrder.status !== 'FULLY_DISPATCHED' && displayOrder.status !== 'CANCELLED'

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setActionError(null)
    try {
      await salesService.confirmSalesOrder(order.id)
      toast.success(`Sales order ${order.orderNumber} confirmed`)
      onOrderUpdated?.()
      onClose()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm sales order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    const ok = await confirmAction({
      title: `Cancel sales order ${order.orderNumber}?`,
      description: 'This sales order will be marked as cancelled.',
      confirmLabel: 'Cancel order',
      variant: 'destructive',
    })
    if (!ok) return

    setIsSubmitting(true)
    setActionError(null)
    try {
      await salesService.cancelSalesOrder(order.id)
      toast.success(`Sales order ${order.orderNumber} cancelled`)
      onOrderUpdated?.()
      onClose()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel sales order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: `Delete draft sales order ${order.orderNumber}?`,
      description: 'This draft sales order will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return

    setIsSubmitting(true)
    setActionError(null)
    try {
      await salesService.deleteSalesOrder(order.id)
      toast.success(`Draft sales order ${order.orderNumber} deleted`)
      onOrderUpdated?.()
      onClose()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete sales order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="lg">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="tabular-nums text-xl font-semibold tracking-tight text-foreground">
                {displayOrder.orderNumber}
              </h2>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {displayOrder.customerName} · {formatMoney(displayOrder.totalAmount, orderCurrency)}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            {displayOrder.status === 'DRAFT' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-destructive hover:text-destructive"
                  onClick={() => void handleDelete()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
                {onEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => {
                      onEdit(displayOrder)
                      onClose()
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => void handleConfirm()}
                >
                  {isSubmitting ? 'Confirming...' : 'Confirm order'}
                </Button>
              </>
            )}

            {displayOrder.status === 'CONFIRMED' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || hasPostedDispatch}
                title={
                  hasPostedDispatch
                    ? 'Cannot cancel sales order with posted dispatches'
                    : 'Cancel order'
                }
                className="text-destructive hover:text-destructive"
                onClick={() => void handleCancel()}
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel order
              </Button>
            )}

            {(displayOrder.status === 'CONFIRMED' ||
              displayOrder.status === 'PARTIALLY_DISPATCHED') && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsCreateDispatchOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create dispatch
              </Button>
            )}

            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        {actionError && <Alert variant="destructive">{actionError}</Alert>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-md border border-border/80 bg-surface-subtle p-3.5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Order date</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formatShortDate(displayOrder.orderDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Expected delivery</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formatShortDate(displayOrder.expectedDeliveryDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">PO reference</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-foreground truncate">
              {displayOrder.customerPoReference || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Dispatch warehouse</p>
            <p className="mt-1 text-sm font-semibold text-foreground truncate">
              {displayOrder.warehouseName}
            </p>
          </div>
        </div>

        {(displayOrder.billingAddress || displayOrder.shippingAddress) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5 space-y-1">
              <p className="font-medium text-muted-foreground">Billing address</p>
              <p className="text-foreground whitespace-pre-wrap">
                {displayOrder.billingAddress || 'No billing address specified.'}
              </p>
            </div>
            <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5 space-y-1">
              <p className="font-medium text-muted-foreground">Shipping address</p>
              <p className="text-foreground whitespace-pre-wrap">
                {displayOrder.shippingAddress || 'No shipping address specified.'}
              </p>
            </div>
          </div>
        )}

        <section className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Order fulfillment</h3>
          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="w-[36%]">Item</TH>
                <TH className="w-[14%] text-right">Ordered</TH>
                <TH className="w-[14%] text-right">Dispatched</TH>
                <TH className="w-[14%] text-right">Pending</TH>
                <TH className="w-[22%] text-right">Progress</TH>
              </tr>
            </THead>
            <TBody>
              {displayOrder.items.map((it) => {
                const ordered = it.orderedQuantity || 0
                const dispatched = it.dispatchedQuantity || 0
                const pending = it.pendingQuantity ?? Math.max(0, ordered - dispatched)
                const percent =
                  ordered > 0 ? Math.min(100, Math.round((dispatched / ordered) * 100)) : 0

                return (
                  <TR key={it.id}>
                    <TD>
                      <p className="font-medium text-foreground truncate">{it.itemName}</p>
                      <p className="text-ref text-muted-foreground">{it.itemCode}</p>
                    </TD>
                    <TD className="text-right tabular-nums text-muted-foreground">
                      {formatQuantity(ordered)}
                    </TD>
                    <TD className="text-right tabular-nums font-medium text-foreground">
                      {formatQuantity(dispatched)}
                    </TD>
                    <TD
                      className={cn(
                        'text-right tabular-nums font-medium',
                        pending > 0 ? 'text-warning' : 'text-muted-foreground'
                      )}
                    >
                      {formatQuantity(pending)}
                    </TD>
                    <TD className="text-right">
                      <div className="inline-flex items-center justify-end gap-2 w-full">
                        <div className="h-1.5 w-16 rounded-md bg-secondary overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-md transition-all duration-300',
                              percent === 100 ? 'bg-success' : 'bg-warning'
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums text-muted-foreground w-9 text-right">
                          {percent}%
                        </span>
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Dispatch history</h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {dispatches.length} {dispatches.length === 1 ? 'dispatch' : 'dispatches'}
            </span>
          </div>

          {isLoadingDispatches ? (
            <div className="py-5 text-center text-xs text-muted-foreground rounded-md border border-border/80 bg-card">
              Loading dispatch history...
            </div>
          ) : dispatches.length === 0 ? (
            <div className="p-4 rounded-md border border-border/80 bg-surface-subtle text-center text-xs text-muted-foreground">
              No dispatches recorded yet for this order.
            </div>
          ) : (
            <div className="space-y-2">
              {dispatches.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    setSelectedDispatch(d)
                    setIsDispatchDetailsOpen(true)
                  }}
                  className="flex items-center justify-between p-3 rounded-md border border-border/80 bg-card hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-secondary/50 text-muted-foreground">
                      <Truck className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="tabular-nums font-medium text-foreground text-xs">
                        {d.dispatchNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatShortDate(d.dispatchDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={d.status === 'POSTED' ? 'success' : 'neutral'}>
                      {d.status === 'POSTED' ? 'Posted' : 'Draft'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {showAvailability && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-foreground">Stock availability</h3>
                {availability && (
                  <Badge
                    variant={
                      availability.overallStatus === 'STOCK_SHORTAGE' ? 'warning' : 'success'
                    }
                  >
                    {availability.overallStatus === 'STOCK_SHORTAGE'
                      ? 'Stock shortage'
                      : 'All available'}
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchAvailability(displayOrder.id)}
                disabled={isLoadingAvailability}
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', isLoadingAvailability && 'animate-spin')}
                />
                Refresh stock
              </Button>
            </div>

            {availabilityError ? (
              <Alert variant="destructive">{availabilityError}</Alert>
            ) : (
              <Table tableClassName="table-fixed">
                <THead>
                  <tr>
                    <TH className="w-[36%]">Item</TH>
                    <TH className="w-[14%] text-right">Ordered</TH>
                    <TH className="w-[14%] text-right">On hand</TH>
                    <TH className="w-[14%] text-right">Shortage</TH>
                    <TH className="w-[22%] text-right">Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {isLoadingAvailability && !availability ? (
                    <TR>
                      <TD colSpan={5} className="py-6 text-center text-muted-foreground">
                        Checking warehouse stock levels...
                      </TD>
                    </TR>
                  ) : availability && availability.items.length > 0 ? (
                    availability.items.map((it) => (
                      <TR key={it.itemId}>
                        <TD>
                          <p className="font-medium text-foreground truncate">{it.itemName}</p>
                          <p className="text-ref text-muted-foreground">{it.itemCode}</p>
                        </TD>
                        <TD className="text-right tabular-nums font-medium">
                          {formatQuantity(it.orderedQuantity)}
                        </TD>
                        <TD className="text-right tabular-nums font-medium">
                          {formatQuantity(it.onHandQuantity)}
                        </TD>
                        <TD
                          className={cn(
                            'text-right tabular-nums font-medium',
                            it.shortageQuantity > 0 ? 'text-destructive' : 'text-muted-foreground'
                          )}
                        >
                          {formatQuantity(it.shortageQuantity)}
                        </TD>
                        <TD className="text-right">
                          {it.status === 'AVAILABLE' && <Badge variant="success">Available</Badge>}
                          {it.status === 'PARTIALLY_AVAILABLE' && (
                            <Badge variant="warning">Partial</Badge>
                          )}
                          {it.status === 'NOT_AVAILABLE' && (
                            <Badge variant="destructive">Unavailable</Badge>
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
            )}
          </section>
        )}

        <section className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Ordered items</h3>
          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="w-[38%]">Item</TH>
                <TH className="w-[14%] text-right">Quantity</TH>
                <TH className="w-[10%]">UOM</TH>
                <TH className="w-[18%] text-right">Unit price</TH>
                <TH className="w-[20%] text-right">Amount</TH>
              </tr>
            </THead>
            <TBody>
              {displayOrder.items.map((it) => (
                <TR key={it.id}>
                  <TD>
                    <p className="font-medium text-foreground truncate">{it.itemName}</p>
                    <p className="text-ref text-muted-foreground">{it.itemCode}</p>
                  </TD>
                  <TD className="text-right tabular-nums font-medium">
                    {formatQuantity(it.orderedQuantity)}
                  </TD>
                  <TD className="text-xs text-muted-foreground uppercase">{it.unitOfMeasure}</TD>
                  <TD className="text-right tabular-nums text-muted-foreground">
                    {formatMoney(it.unitPrice, orderCurrency)}
                  </TD>
                  <TD className="text-right tabular-nums font-medium text-foreground">
                    {formatMoney(it.lineAmount, orderCurrency)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <div className="flex items-center justify-between px-4 py-3 rounded-md border border-border/80 bg-surface-subtle">
            <span className="text-sm font-medium text-foreground">Order total</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {formatMoney(displayOrder.totalAmount, orderCurrency)}
            </span>
          </div>
        </section>

        {displayOrder.notes && (
          <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{displayOrder.notes}</p>
          </div>
        )}

        <CreateDispatchModal
          isOpen={isCreateDispatchOpen}
          onClose={() => setIsCreateDispatchOpen(false)}
          onSuccess={() => refreshOrder(displayOrder.id)}
          preselectedSalesOrder={displayOrder}
        />

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
    </Drawer>
  )
}
