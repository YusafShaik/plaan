import { useState } from 'react'
import {
  X,
  Ban,
  Calculator,
  Pencil,
  Trash2,
  PackageCheck,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
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
              <span className="font-mono text-xl font-medium tracking-tight text-foreground">
                {bom.bomCode}
              </span>
              {bom.status === 'ACTIVE' && (
                <Badge variant="success">Active</Badge>
              )}
              {bom.status === 'DRAFT' && (
                <Badge variant="warning">Draft</Badge>
              )}
              {bom.status === 'INACTIVE' && (
                <Badge variant="destructive">Inactive</Badge>
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
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-md border border-border/80 bg-secondary/30 p-3.5 text-xs">
          <div>
            <p className="text-muted-foreground">Output Batch</p>
            <p className="mt-0.5 font-medium text-foreground font-mono">
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
          <div className="rounded-md border border-border/70 bg-secondary/20 p-3 text-xs">
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

          <Table>
              <THead>
                <tr>
                  <TH className="py-2.5">Material</TH>
                  <TH className="py-2.5 text-right">BOM Quantity</TH>
                  <TH className="py-2.5">UOM</TH>
                </tr>
              </THead>
              <TBody className="divide-y divide-border/60">
                {bom.items.map((it) => (
                  <TR key={it.id} className="hover:bg-secondary/30 transition-colors">
                    <TD className="py-2.5 px-3.5">
                      <p className="font-medium text-foreground">{it.materialName}</p>
                      <p className="text-[10px] text-ref text-muted-foreground">
                        {it.materialCode}
                      </p>
                    </TD>
                    <TD className="py-2.5 px-3.5 text-right font-mono font-medium text-foreground">
                      {formatQuantity(it.quantity)}
                    </TD>
                    <TD className="py-2.5 px-3.5 text-muted-foreground">
                      {it.unitOfMeasure}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
        </div>

        {/* Interactive BOM Quantity Calculator (Feature Spec 5) */}
        <div className="rounded-md border border-border/80 bg-secondary/30 p-4 space-y-3">
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
                  className="flex h-8 w-24 rounded-md border border-border/80 bg-background px-2.5 text-center text-xs font-mono font-medium text-foreground focus:outline-none focus:border-foreground"
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {bom.unitOfMeasure}
                </span>
              </div>
            </div>
          </div>

          {/* Calculator Table */}
            <Table className="border-0 rounded-none shadow-none">
              <THead>
                <tr>
                  <TH className="py-2.5">Material</TH>
                  <TH className="py-2.5 text-right">BOM Qty</TH>
                  <TH className="py-2.5 text-right">Required Qty</TH>
                  <TH className="py-2.5">UOM</TH>
                </tr>
              </THead>
              <TBody className="divide-y divide-border/60">
                {bom.items.map((it) => {
                  const requiredQty = (effectivePlannedQty / outputQty) * it.quantity
                  return (
                    <TR key={it.id} className="hover:bg-secondary/30 transition-colors">
                      <TD className="py-2 px-3">
                        <span className="font-medium text-foreground">{it.materialName}</span>
                      </TD>
                      <TD className="py-2 px-3 text-right font-mono text-muted-foreground">
                        {formatQuantity(it.quantity)}
                      </TD>
                      <TD className="py-2 px-3 text-right font-mono font-medium text-foreground">
                        {formatQuantity(requiredQty)}
                      </TD>
                      <TD className="py-2 px-3 text-muted-foreground text-[11px]">
                        {it.unitOfMeasure}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
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
                className="bg-success text-success-foreground hover:opacity-90 font-semibold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
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
                className="text-xs font-medium text-warning border-warning/30 hover:bg-warning/10 cursor-pointer flex items-center gap-1.5"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Deactivate BOM</span>
              </Button>
            )}

            {bom.status === 'INACTIVE' && onActivate && (
              <Button
                size="sm"
                onClick={() => onActivate(bom.id)}
                className="bg-success text-success-foreground hover:opacity-90 font-semibold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
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
