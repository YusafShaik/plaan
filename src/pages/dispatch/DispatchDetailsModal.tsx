import { useEffect, useState } from 'react'
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { dispatchService } from '../../services/dispatchService'
import { confirmAction, toast } from '../../lib/feedback'
import { formatQuantity, formatShortDate } from '../../lib/format'
import type { DispatchOrder } from '../../types/dispatch'

export interface DispatchDetailsModalProps {
  isOpen: boolean
  dispatch: DispatchOrder | null
  onClose: () => void
  onEdit?: (dispatch: DispatchOrder) => void
  onDispatchUpdated?: () => void
}

export function DispatchDetailsModal({
  isOpen,
  dispatch,
  onClose,
  onEdit,
  onDispatchUpdated,
}: DispatchDetailsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.resolve().then(() => {
      setError(null)
    })
  }, [isOpen, dispatch?.id])

  if (!isOpen || !dispatch) return null

  const hasTransportDetails = Boolean(
    dispatch.transporterName || dispatch.vehicleNumber || dispatch.transportReference
  )

  const handlePost = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await dispatchService.postDispatchOrder(dispatch.id)
      toast.success(`Dispatch ${dispatch.dispatchNumber} posted`)
      onDispatchUpdated?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post dispatch.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: `Delete draft dispatch ${dispatch.dispatchNumber}?`,
      description: 'This draft dispatch order will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return

    setIsSubmitting(true)
    setError(null)
    try {
      await dispatchService.deleteDispatchOrder(dispatch.id)
      toast.success(`Draft dispatch ${dispatch.dispatchNumber} deleted`)
      onDispatchUpdated?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete dispatch.')
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
                {dispatch.dispatchNumber}
              </h2>
              {dispatch.status === 'POSTED' ? (
                <Badge variant="success">Posted</Badge>
              ) : (
                <Badge variant="neutral">Draft</Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {dispatch.customerName} · Sales order {dispatch.salesOrderNumber}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {dispatch.status === 'DRAFT' && (
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
                      onEdit(dispatch)
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
                  onClick={() => void handlePost()}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isSubmitting ? 'Posting...' : 'Post dispatch'}
                </Button>
              </>
            )}

            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-md border border-border/80 bg-surface-subtle p-3.5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Dispatch date</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formatShortDate(dispatch.dispatchDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Sales order</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
              {dispatch.salesOrderNumber}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Dispatch warehouse</p>
            <p className="mt-1 text-sm font-semibold text-foreground truncate">
              {dispatch.dispatchWarehouseName}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total dispatched</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formatQuantity(dispatch.totalQuantityDispatched)} items
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5 space-y-1">
            <p className="font-medium text-muted-foreground">Shipping address</p>
            <p className="text-foreground whitespace-pre-wrap">
              {dispatch.shippingAddress || 'No shipping address specified.'}
            </p>
          </div>

          <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5 space-y-1">
            <p className="font-medium text-muted-foreground">Transport details</p>
            {hasTransportDetails ? (
              <div className="space-y-0.5 text-foreground">
                <p>
                  <span className="text-muted-foreground">Carrier:</span>{' '}
                  {dispatch.transporterName || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Vehicle:</span>{' '}
                  <span className="tabular-nums">{dispatch.vehicleNumber || '—'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">LR / Ref:</span>{' '}
                  <span className="tabular-nums">{dispatch.transportReference || '—'}</span>
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No carrier details recorded.</p>
            )}
          </div>
        </div>

        <section className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Dispatched items</h3>
          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="w-[36%]">Item</TH>
                <TH className="w-[12%] text-right">Ordered</TH>
                <TH className="w-[15%] text-right">Prev. dispatched</TH>
                <TH className="w-[14%] text-right">This dispatch</TH>
                <TH className="w-[13%] text-right">Remaining</TH>
                <TH className="w-[10%] pl-4">UOM</TH>
              </tr>
            </THead>
            <TBody>
              {dispatch.items.map((it) => (
                <TR key={it.id}>
                  <TD>
                    <p className="font-medium text-foreground truncate">{it.itemName}</p>
                    <p className="text-ref text-muted-foreground">{it.itemCode}</p>
                  </TD>
                  <TD className="text-right tabular-nums text-muted-foreground">
                    {formatQuantity(it.orderedQuantity)}
                  </TD>
                  <TD className="text-right tabular-nums text-muted-foreground">
                    {formatQuantity(it.previouslyDispatchedQuantity)}
                  </TD>
                  <TD className="text-right tabular-nums font-medium text-success">
                    {formatQuantity(it.dispatchQuantity)}
                  </TD>
                  <TD className="text-right tabular-nums text-muted-foreground">
                    {formatQuantity(it.remainingQuantity)}
                  </TD>
                  <TD className="pl-4 text-xs text-muted-foreground uppercase">
                    {it.unitOfMeasure}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>

        {dispatch.notes && (
          <div className="rounded-md border border-border/80 bg-surface-subtle p-3.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{dispatch.notes}</p>
          </div>
        )}
      </div>
    </Drawer>
  )
}
