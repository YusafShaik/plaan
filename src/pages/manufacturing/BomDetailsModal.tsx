import { useEffect, useState } from 'react'
import {
  Ban,
  Calculator,
  Pencil,
  Trash2,
  PackageCheck,
  FileText,
} from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { formatQuantity, formatShortDate } from '../../lib/format'
import type { Bom, BomStatus } from '../../types/manufacturing'

const STATUS_BADGE: Record<BomStatus, { variant: BadgeVariant; label: string }> = {
  ACTIVE: { variant: 'success', label: 'Active' },
  DRAFT: { variant: 'warning', label: 'Draft' },
  INACTIVE: { variant: 'neutral', label: 'Inactive' },
}

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
  const [plannedQty, setPlannedQty] = useState<string | number>(bom ? bom.outputQuantity : 1)

  useEffect(() => {
    if (!bom) return
    const timer = setTimeout(() => {
      setPlannedQty(bom.outputQuantity)
    }, 0)
    return () => clearTimeout(timer)
  }, [bom])

  if (!isOpen || !bom) return null

  const badge = STATUS_BADGE[bom.status] ?? { variant: 'neutral', label: bom.status }
  const parsedPlanned =
    typeof plannedQty === 'number' ? plannedQty : parseFloat(plannedQty) || 0
  const effectivePlannedQty = parsedPlanned > 0 ? parsedPlanned : 0
  const outputQty = bom.outputQuantity > 0 ? bom.outputQuantity : 1

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="lg">
      <div className="space-y-5 pb-4">
        {/* Header */}
        <div className="flex flex-col gap-3 pb-4 border-b border-border/80 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
                {bom.bomCode}
              </h2>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{bom.productName}</span>
              <span className="ml-1.5 text-ref text-muted-foreground">
                ({bom.productCode})
              </span>
              {' · '}Output: {formatQuantity(bom.outputQuantity)} {bom.unitOfMeasure}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {bom.status === 'DRAFT' && onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(bom)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit draft
              </Button>
            )}
            {bom.status === 'DRAFT' && onActivate && (
              <Button variant="primary" size="sm" onClick={() => onActivate(bom.id)}>
                <PackageCheck className="h-3.5 w-3.5" />
                Activate BOM
              </Button>
            )}
            {bom.status === 'INACTIVE' && onActivate && (
              <Button variant="primary" size="sm" onClick={() => onActivate(bom.id)}>
                <PackageCheck className="h-3.5 w-3.5" />
                Reactivate BOM
              </Button>
            )}
            {bom.status === 'ACTIVE' && onDeactivate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeactivate(bom.id)}
                className="text-destructive border-destructive/25 hover:bg-destructive/10"
              >
                <Ban className="h-3.5 w-3.5" />
                Deactivate
              </Button>
            )}
            {bom.status === 'DRAFT' && onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(bom.id)}
                className="text-destructive border-destructive/25 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete draft
              </Button>
            )}
            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Output batch</p>
            <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
              {formatQuantity(bom.outputQuantity)}{' '}
              <span className="uppercase">{bom.unitOfMeasure}</span>
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Components</p>
            <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
              {bom.totalComponents} {bom.totalComponents === 1 ? 'material' : 'materials'}
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Created date</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatShortDate(bom.createdAt)}
            </p>
          </div>
        </div>

        {/* Unified Components & Batch Calculator */}
        <div className="space-y-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">
                Components &amp; batch calculator ({bom.items.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Planned batch:
              </span>
              <input
                type="number"
                min="0.0001"
                step="any"
                value={plannedQty}
                onChange={(e) => {
                  const val = e.target.value
                  if (val !== '' && Number(val) < 0) return
                  setPlannedQty(val)
                }}
                aria-label="Planned batch quantity"
                className="h-8 w-24 rounded-md border border-border bg-card px-2.5 text-right text-xs tabular-nums font-medium text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {bom.unitOfMeasure}
              </span>
            </div>
          </div>

          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="py-2.5 px-3 w-[44%]">Material &amp; code</TH>
                <TH className="py-2.5 px-2.5 w-[18%] text-right">Per batch</TH>
                <TH className="py-2.5 px-2.5 w-[22%] text-right">Required qty</TH>
                <TH className="py-2.5 px-3 w-[16%] pl-5">UOM</TH>
              </tr>
            </THead>
            <TBody>
              {bom.items.map((it) => {
                const requiredQty = (effectivePlannedQty / outputQty) * it.quantity
                return (
                  <TR key={it.id}>
                    <TD className="py-2.5 px-3">
                      <p className="text-xs font-medium text-foreground truncate">
                        {it.materialName}
                      </p>
                      <p className="text-xs text-ref text-muted-foreground">
                        {it.materialCode}
                      </p>
                    </TD>
                    <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums text-muted-foreground">
                      {formatQuantity(it.quantity)}
                    </TD>
                    <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums font-semibold text-foreground">
                      {formatQuantity(requiredQty)}
                    </TD>
                    <TD className="py-2.5 px-3 pl-5 text-xs text-muted-foreground uppercase">
                      {it.unitOfMeasure}
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </div>

        {/* Notes */}
        <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>Manufacturing notes</span>
          </div>
          <p className="text-xs text-foreground whitespace-pre-wrap">
            {bom.notes || 'No manufacturing notes recorded.'}
          </p>
        </div>
      </div>
    </Drawer>
  )
}
