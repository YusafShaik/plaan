import {
  X,
  Warehouse as WarehouseIcon,
  Calendar,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  PackageCheck,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { StockTransfer } from '../../types/inventory'

export interface StockTransferDetailsModalProps {
  isOpen: boolean
  transfer: StockTransfer | null
  onClose: () => void
  onPost?: (id: number) => Promise<void>
  onCancel?: (id: number) => Promise<void>
}

export function StockTransferDetailsModal({
  isOpen,
  transfer,
  onClose,
  onPost,
  onCancel,
}: StockTransferDetailsModalProps) {
  if (!isOpen || !transfer) return null

  const formatQuantity = (qty: number) => {
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[720px] max-h-[90vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-mono">
                {transfer.transferNumber}
              </h2>
              {transfer.status === 'POSTED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Posted (Transferred)
                </span>
              )}
              {transfer.status === 'DRAFT' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" />
                  Draft
                </span>
              )}
              {transfer.status === 'CANCELLED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20">
                  <Ban className="h-3.5 w-3.5" />
                  Cancelled
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Internal warehouse material transfer
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

        {/* Transfer Visual Strip (Matching design screenshot) */}
        <div className="rounded-[12px] border border-border/80 bg-secondary/30 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Source Warehouse */}
            <div className="rounded-[10px] border border-border/60 bg-card p-3 text-center sm:text-left">
              <div className="flex items-center gap-2 mb-1">
                <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">Source Warehouse</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{transfer.fromWarehouseName}</p>
              <p className="text-[11px] font-mono text-muted-foreground">{transfer.fromWarehouseCode}</p>
              <p className="mt-2 text-xs font-semibold text-rose-500 font-mono">
                −{formatQuantity(transfer.totalQuantity)} Total Out
              </p>
            </div>

            {/* Destination Warehouse */}
            <div className="rounded-[10px] border border-border/60 bg-card p-3 text-center sm:text-left">
              <div className="flex items-center gap-2 mb-1">
                <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">Destination Warehouse</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{transfer.toWarehouseName}</p>
              <p className="text-[11px] font-mono text-muted-foreground">{transfer.toWarehouseCode}</p>
              <p className="mt-2 text-xs font-semibold text-emerald-500 font-mono">
                +{formatQuantity(transfer.totalQuantity)} Total In
              </p>
            </div>
          </div>

          {/* Subtext info */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Transfer Date: <strong className="text-foreground">{formatDate(transfer.transferDate)}</strong>
            </span>
            <span className="font-medium text-emerald-500">Total organization stock remains unchanged</span>
          </div>

          {transfer.notes && (
            <div className="pt-2 border-t border-border/40 flex items-start gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-muted-foreground">Notes: </span>
                <span className="text-foreground">{transfer.notes}</span>
              </div>
            </div>
          )}
        </div>

        {/* Transfer Items Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">
              Transferred Items ({transfer.items.length})
            </h3>
          </div>

          <div className="rounded-[10px] border border-border/80 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border/80">
                <tr>
                  <th className="py-2.5 px-3.5">#</th>
                  <th className="py-2.5 px-3.5">Item</th>
                  <th className="py-2.5 px-3.5 text-right">Transfer Qty</th>
                  <th className="py-2.5 px-3.5">UOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transfer.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 px-3.5 text-muted-foreground font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <p className="font-medium text-foreground">{item.itemName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {item.itemCode}
                      </p>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-foreground">
                      {formatQuantity(item.transferQuantity)}
                    </td>
                    <td className="py-2.5 px-3.5 text-muted-foreground">
                      {item.unitOfMeasure}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border/80">
          <div>
            {transfer.status === 'DRAFT' && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(transfer.id)}
                className="text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Cancel Draft
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {transfer.status === 'DRAFT' && onPost && (
              <Button
                size="sm"
                onClick={() => onPost(transfer.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                <PackageCheck className="mr-1.5 h-3.5 w-3.5" />
                Post Transfer
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
