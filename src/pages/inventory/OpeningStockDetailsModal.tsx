import {
  X,
  Warehouse as WarehouseIcon,
  Calendar,
  PackageCheck,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { OpeningStock } from '../../types/inventory'

export interface OpeningStockDetailsModalProps {
  isOpen: boolean
  openingStock: OpeningStock | null
  onClose: () => void
  onPost?: (id: number) => Promise<void>
  onCancel?: (id: number) => Promise<void>
}

export function OpeningStockDetailsModal({
  isOpen,
  openingStock,
  onClose,
  onPost,
  onCancel,
}: OpeningStockDetailsModalProps) {
  if (!isOpen || !openingStock) return null

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
      className="!max-w-[700px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-mono">
                {openingStock.openingStockNumber}
              </h2>
              {openingStock.status === 'POSTED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Posted (Stock Initialized)
                </span>
              )}
              {openingStock.status === 'DRAFT' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" />
                  Draft
                </span>
              )}
              {openingStock.status === 'CANCELLED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20">
                  <Ban className="h-3.5 w-3.5" />
                  Cancelled
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Opening stock initialization entry
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

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-[10px] border border-border/80 bg-secondary/40 p-4">
          <div className="flex items-start gap-2.5">
            <WarehouseIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Warehouse</p>
              <p className="text-sm font-semibold text-foreground">
                {openingStock.warehouseName}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {openingStock.warehouseCode}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Opening Date</p>
              <p className="text-sm font-semibold text-foreground">
                {formatDate(openingStock.openingDate)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Total Items: {openingStock.totalItems}
              </p>
            </div>
          </div>

          {openingStock.notes && (
            <div className="sm:col-span-2 flex items-start gap-2.5 pt-2 border-t border-border/40">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Notes</p>
                <p className="text-xs text-foreground mt-0.5">{openingStock.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">
              Initialized Items ({openingStock.items.length})
            </h3>
          </div>

          <div className="rounded-[10px] border border-border/80 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border/80">
                <tr>
                  <th className="py-2.5 px-3.5">#</th>
                  <th className="py-2.5 px-3.5">Item</th>
                  <th className="py-2.5 px-3.5 text-right">Quantity</th>
                  <th className="py-2.5 px-3.5">UOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {openingStock.items.map((item, idx) => (
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
                    <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-emerald-500">
                      +{formatQuantity(item.quantity)}
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
            {openingStock.status === 'DRAFT' && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(openingStock.id)}
                className="text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Cancel Draft
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {openingStock.status === 'DRAFT' && onPost && (
              <Button
                size="sm"
                onClick={() => onPost(openingStock.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                <PackageCheck className="mr-1.5 h-3.5 w-3.5" />
                Post Opening Stock
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
