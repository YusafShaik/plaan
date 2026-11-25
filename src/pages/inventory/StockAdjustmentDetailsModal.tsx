import {
  X,
  Warehouse as WarehouseIcon,
  Calendar,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  PackageCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { StockAdjustment } from '../../types/inventory'

export interface StockAdjustmentDetailsModalProps {
  isOpen: boolean
  adjustment: StockAdjustment | null
  onClose: () => void
  onPost?: (id: number) => Promise<void>
  onCancel?: (id: number) => Promise<void>
}

export function StockAdjustmentDetailsModal({
  isOpen,
  adjustment,
  onClose,
  onPost,
  onCancel,
}: StockAdjustmentDetailsModalProps) {
  if (!isOpen || !adjustment) return null

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

  const positiveDiffs = adjustment.items.filter((it) => it.adjustmentQuantity > 0)
  const negativeDiffs = adjustment.items.filter((it) => it.adjustmentQuantity < 0)

  const totalPositiveQty = positiveDiffs.reduce((acc, it) => acc + it.adjustmentQuantity, 0)
  const totalNegativeQty = negativeDiffs.reduce((acc, it) => acc + Math.abs(it.adjustmentQuantity), 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl p-0">
      <div className="flex flex-col p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold tracking-tight text-foreground">
                {adjustment.adjustmentNumber}
              </span>
              {adjustment.status === 'POSTED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Posted
                </span>
              )}
              {adjustment.status === 'DRAFT' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" />
                  Draft
                </span>
              )}
              {adjustment.status === 'CANCELLED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20">
                  <Ban className="h-3.5 w-3.5" />
                  Cancelled
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Stock adjustment recorded for warehouse reconciliation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Strip */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-[12px] border border-border/80 bg-secondary/30 p-4">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <WarehouseIcon className="h-3.5 w-3.5" />
              Warehouse
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {adjustment.warehouseName}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {adjustment.warehouseCode}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Adjustment Date & Reason
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatDate(adjustment.adjustmentDate)}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">
              Reason: {adjustment.reason}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <PackageCheck className="h-3.5 w-3.5" />
              Items Count
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground font-mono">
              {adjustment.totalItems} {adjustment.totalItems === 1 ? 'item' : 'items'}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Net difference: {adjustment.totalDifference > 0 ? `+${adjustment.totalDifference}` : adjustment.totalDifference}
            </p>
          </div>
        </div>

        {/* Visual Cards Strip matching screenshot 2: Positive Adjustment In & Negative Adjustment Out */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Positive Adjustment Card */}
          <div className="rounded-[12px] border border-border/80 bg-card p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold text-foreground">Positive Adjustment</span>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-emerald-500">
              +{formatQuantity(totalPositiveQty)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adjustment In · {positiveDiffs.length} {positiveDiffs.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          {/* Negative Adjustment Card */}
          <div className="rounded-[12px] border border-border/80 bg-card p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-foreground">Negative Adjustment</span>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-rose-500">
              -{formatQuantity(totalNegativeQty)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adjustment Out · {negativeDiffs.length} {negativeDiffs.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        {/* Notes */}
        {adjustment.notes && (
          <div className="mt-4 rounded-[10px] border border-border/70 bg-card p-3">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              <FileText className="h-3.5 w-3.5" />
              Notes
            </span>
            <p className="text-xs text-foreground whitespace-pre-wrap">{adjustment.notes}</p>
          </div>
        )}

        {/* Line Items Table */}
        <div className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Adjusted Items
          </h4>
          <div className="overflow-x-auto rounded-[10px] border border-border/80 bg-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground bg-secondary/30">
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3 text-right">System Qty</th>
                  <th className="py-2.5 px-3 text-right">Physical Qty</th>
                  <th className="py-2.5 px-3 text-right">Difference</th>
                  <th className="py-2.5 px-3 text-right">Movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {adjustment.items.map((it) => (
                  <tr key={it.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-foreground">{it.itemName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {it.itemCode}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {formatQuantity(it.systemQuantity)} {it.unitOfMeasure}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                      {formatQuantity(it.physicalQuantity)} {it.unitOfMeasure}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {it.adjustmentQuantity > 0 ? (
                        <span className="text-emerald-500">
                          +{formatQuantity(it.adjustmentQuantity)}
                        </span>
                      ) : it.adjustmentQuantity < 0 ? (
                        <span className="text-rose-500">
                          {formatQuantity(it.adjustmentQuantity)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {it.adjustmentQuantity > 0 ? (
                        <span className="inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 border border-emerald-500/20">
                          Adjustment In
                        </span>
                      ) : it.adjustmentQuantity < 0 ? (
                        <span className="inline-block rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-500 border border-rose-500/20">
                          Adjustment Out
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          No difference
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-border/80 pt-4">
          <div className="text-xs text-muted-foreground">
            Created on {formatDate(adjustment.createdAt)}
          </div>
          <div className="flex items-center gap-2">
            {adjustment.status === 'DRAFT' && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(adjustment.id)}
                className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Cancel Draft
              </Button>
            )}
            {adjustment.status === 'DRAFT' && onPost && (
              <Button
                size="sm"
                onClick={() => onPost(adjustment.id)}
                className="bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Post Adjustment
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
