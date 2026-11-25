import { useState } from 'react'
import {
  X,
  CheckCircle2,
  Clock,
  Ban,
  Calculator,
  Pencil,
  Trash2,
  PackageCheck,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { Bom } from '../../types/manufacturing'

export interface BomDetailsModalProps {
  isOpen: boolean
  bom: Bom | null
  onClose: () => void
  onEdit?: (bom: Bom) => void
  onActivate?: (id: number) => Promise<void>
  onDeactivate?: (id: number) => Promise<void>
  onDelete?: (id: number) => Promise<void>
}

export function BomDetailsModal({
  isOpen,
  bom,
  onClose,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
}: BomDetailsModalProps) {
  const [plannedQty, setPlannedQty] = useState<number | ''>(() => (bom ? bom.outputQuantity : 1))
  const [prevBomId, setPrevBomId] = useState<number | null>(null)

  if (bom && bom.id !== prevBomId) {
    setPrevBomId(bom.id)
    setPlannedQty(bom.outputQuantity)
  }

  if (!isOpen || !bom) return null

  const formatQuantity = (qty: number) => {
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
  }

  const formatDate = (dateStr: string) => {
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

  const effectivePlannedQty = typeof plannedQty === 'number' && plannedQty > 0 ? plannedQty : 0
  const outputQty = bom.outputQuantity > 0 ? bom.outputQuantity : 1

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[740px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl font-bold tracking-tight text-foreground">
                {bom.bomCode}
              </span>
              {bom.status === 'ACTIVE' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active
                </span>
              )}
              {bom.status === 'DRAFT' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" />
                  Draft
                </span>
              )}
              {bom.status === 'INACTIVE' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
                  <Ban className="h-3.5 w-3.5" />
                  Inactive
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">{bom.productName}</span>
              <span className="font-mono text-muted-foreground">({bom.productCode})</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Output: {formatQuantity(bom.outputQuantity)} {bom.unitOfMeasure}</span>
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

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-[12px] border border-border/80 bg-secondary/30 p-3.5 text-xs">
          <div>
            <p className="text-muted-foreground">Output Batch</p>
            <p className="mt-0.5 font-semibold text-foreground font-mono">
              {formatQuantity(bom.outputQuantity)} {bom.unitOfMeasure}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Components</p>
            <p className="mt-0.5 font-semibold text-foreground">
              {bom.totalComponents} materials
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Created Date</p>
            <p className="mt-0.5 font-semibold text-foreground">
              {formatDate(bom.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="mt-0.5 font-semibold capitalize text-foreground">
              {bom.status.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Notes (if present) */}
        {bom.notes && (
          <div className="rounded-[10px] border border-border/70 bg-secondary/20 p-3 text-xs">
            <p className="font-semibold text-foreground mb-0.5">Manufacturing Notes</p>
            <p className="text-muted-foreground whitespace-pre-line">{bom.notes}</p>
          </div>
        )}

        {/* Component Materials Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bill of Materials Components
            </h4>
            <span className="text-[11px] text-muted-foreground">
              {bom.items.length} items required per {formatQuantity(bom.outputQuantity)} {bom.unitOfMeasure}
            </span>
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-border/80 bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3.5">Material</th>
                  <th className="py-2.5 px-3.5 text-right">BOM Quantity</th>
                  <th className="py-2.5 px-3.5">UOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {bom.items.map((it) => (
                  <tr key={it.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <p className="font-medium text-foreground">{it.materialName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {it.materialCode}
                      </p>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-foreground">
                      {formatQuantity(it.quantity)}
                    </td>
                    <td className="py-2.5 px-3.5 text-muted-foreground">
                      {it.unitOfMeasure}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive BOM Quantity Calculator (Feature Spec 5) */}
        <div className="rounded-[12px] border border-border/80 bg-secondary/30 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground">
                <Calculator className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">
                  BOM Quantity Calculator
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Calculate material requirements for planned production batches.
                </p>
              </div>
            </div>

            {/* Production Quantity Input */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Planned quantity:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={plannedQty}
                  onChange={(e) => {
                    const val = e.target.value
                    setPlannedQty(val === '' ? '' : Math.max(0, parseFloat(val) || 0))
                  }}
                  className="flex h-8 w-24 rounded-[8px] border border-border/80 bg-background px-2.5 text-center text-xs font-mono font-semibold text-foreground focus:outline-none focus:border-foreground"
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {bom.unitOfMeasure}
                </span>
              </div>
            </div>
          </div>

          {/* Calculator Table */}
          <div className="overflow-x-auto rounded-[8px] border border-border/70 bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-secondary/50 text-[11px] font-semibold text-muted-foreground">
                  <th className="py-2 px-3">Material</th>
                  <th className="py-2 px-3 text-right">BOM Qty</th>
                  <th className="py-2 px-3 text-right">Required Qty</th>
                  <th className="py-2 px-3">UOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {bom.items.map((it) => {
                  const requiredQty = (effectivePlannedQty / outputQty) * it.quantity
                  return (
                    <tr key={it.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-2 px-3">
                        <span className="font-medium text-foreground">{it.materialName}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                        {formatQuantity(it.quantity)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                        {formatQuantity(requiredQty)}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-[11px]">
                        {it.unitOfMeasure}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/80">
          <div>
            {bom.status === 'DRAFT' && onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(bom.id)}
                className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Draft</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {bom.status === 'DRAFT' && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(bom)}
                className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Draft</span>
              </Button>
            )}

            {bom.status === 'DRAFT' && onActivate && (
              <Button
                size="sm"
                onClick={() => onActivate(bom.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <PackageCheck className="h-4 w-4" />
                <span>Activate BOM</span>
              </Button>
            )}

            {bom.status === 'ACTIVE' && onDeactivate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeactivate(bom.id)}
                className="text-xs font-medium text-amber-500 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer flex items-center gap-1.5"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Deactivate BOM</span>
              </Button>
            )}

            {bom.status === 'INACTIVE' && onActivate && (
              <Button
                size="sm"
                onClick={() => onActivate(bom.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <PackageCheck className="h-4 w-4" />
                <span>Reactivate BOM</span>
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
