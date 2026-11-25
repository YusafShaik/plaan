import { useState } from 'react'
import {
  X,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { dispatchService } from '../../services/dispatchService'
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

  if (!isOpen || !dispatch) return null

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

  const handlePost = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await dispatchService.postDispatchOrder(dispatch.id)
      onDispatchUpdated?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post dispatch.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete draft dispatch ${dispatch.dispatchNumber}?`)) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await dispatchService.deleteDispatchOrder(dispatch.id)
      onDispatchUpdated?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete dispatch.')
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
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Dispatch / Dispatch Orders / {dispatch.dispatchNumber}
            </p>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl font-bold tracking-tight text-foreground">
                {dispatch.dispatchNumber}
              </span>
              {dispatch.status === 'POSTED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Posted
                </span>
              )}
              {dispatch.status === 'DRAFT' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" />
                  Draft
                </span>
              )}
            </div>

            <p className="mt-1 text-sm font-semibold text-foreground">
              {dispatch.customerName} · Sales Order {dispatch.salesOrderNumber}
            </p>
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

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-[10px] border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Dispatch Date</span>
            <p className="mt-1 font-semibold text-foreground">{formatDate(dispatch.dispatchDate)}</p>
          </div>

          <div className="rounded-[10px] border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Sales Order</span>
            <p className="mt-1 font-semibold text-foreground font-mono">{dispatch.salesOrderNumber}</p>
          </div>

          <div className="rounded-[10px] border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Dispatch Warehouse</span>
            <p className="mt-1 font-semibold text-foreground">{dispatch.dispatchWarehouseName}</p>
          </div>

          <div className="rounded-[10px] border border-border/80 bg-secondary/30 p-3">
            <span className="text-muted-foreground font-normal">Total Dispatched</span>
            <p className="mt-1 font-semibold text-foreground font-mono">
              {formatQuantity(dispatch.totalQuantityDispatched)} Items
            </p>
          </div>
        </div>

        {/* Shipping Address & Transport */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-[10px] border border-border/80 bg-secondary/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-medium">Shipping Address</span>
            <p className="text-foreground whitespace-pre-wrap">
              {dispatch.shippingAddress || 'No shipping address specified.'}
            </p>
          </div>

          <div className="rounded-[10px] border border-border/80 bg-secondary/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-medium">Transport Details</span>
            <div className="space-y-0.5 text-foreground">
              <p>
                <span className="text-muted-foreground">Carrier:</span> {dispatch.transporterName || '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Vehicle:</span> {dispatch.vehicleNumber || '—'}
              </p>
              <p>
                <span className="text-muted-foreground">LR / Ref:</span> {dispatch.transportReference || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Dispatched Items</h3>

          <div className="overflow-x-auto rounded-[10px] border border-border/80 bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3.5">Item</th>
                  <th className="py-2.5 px-3 text-right">Ordered</th>
                  <th className="py-2.5 px-3 text-right">Prev. Dispatched</th>
                  <th className="py-2.5 px-3 text-right">This Dispatch</th>
                  <th className="py-2.5 px-3 text-right">Remaining</th>
                  <th className="py-2.5 px-3.5">UOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {dispatch.items.map((it) => (
                  <tr key={it.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-3.5 font-medium text-foreground">
                      <p>{it.itemName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{it.itemCode}</p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                      {formatQuantity(it.orderedQuantity)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                      {formatQuantity(it.previouslyDispatchedQuantity)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatQuantity(it.dispatchQuantity)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                      {formatQuantity(it.remainingQuantity)}
                    </td>
                    <td className="py-3 px-3.5 text-muted-foreground">{it.unitOfMeasure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        {dispatch.notes && (
          <div className="rounded-[10px] border border-border/80 bg-secondary/20 p-3 text-xs">
            <span className="text-muted-foreground font-medium">Notes:</span>
            <p className="mt-0.5 text-foreground italic">{dispatch.notes}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/80">
          <div>
            {dispatch.status === 'DRAFT' && (
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
          </div>

          <div className="flex items-center gap-2">
            {dispatch.status === 'DRAFT' && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(dispatch)
                  onClose()
                }}
                disabled={isSubmitting}
                className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Draft</span>
              </Button>
            )}

            {dispatch.status === 'DRAFT' && (
              <Button
                size="sm"
                onClick={handlePost}
                disabled={isSubmitting}
                className="bg-[#107048] hover:bg-[#0d603e] text-white font-medium text-xs px-4 h-8 rounded-[8px] cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Posting...' : 'Post Dispatch'}</span>
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
      </div>
    </Modal>
  )
}
