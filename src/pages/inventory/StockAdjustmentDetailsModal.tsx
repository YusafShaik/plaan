import {
  Warehouse as WarehouseIcon,
  Calendar,
  FileText,
  PackageCheck,
  TrendingUp,
  TrendingDown,
  Ban,
} from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { formatQuantity, formatShortDate } from '../../lib/format'
import type { StockAdjustment, StockAdjustmentStatus } from '../../types/inventory'

const STATUS_BADGE: Record<StockAdjustmentStatus, { variant: BadgeVariant; label: string }> = {
  POSTED: { variant: 'success', label: 'Posted' },
  DRAFT: { variant: 'warning', label: 'Draft' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

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

  const badge = STATUS_BADGE[adjustment.status] ?? {
    variant: 'neutral',
    label: adjustment.status,
  }

  const positiveDiffs = adjustment.items.filter((it) => it.adjustmentQuantity > 0)
  const negativeDiffs = adjustment.items.filter((it) => it.adjustmentQuantity < 0)

  const totalPositiveQty = positiveDiffs.reduce((acc, it) => acc + it.adjustmentQuantity, 0)
  const totalNegativeQty = negativeDiffs.reduce(
    (acc, it) => acc + Math.abs(it.adjustmentQuantity),
    0
  )

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="lg">
      <div className="space-y-5 pb-4">
        <div className="flex flex-col gap-3 pb-4 border-b border-border/80 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
                {adjustment.adjustmentNumber}
              </h2>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjustment date:{' '}
              <span className="text-foreground font-medium">
                {formatShortDate(adjustment.adjustmentDate)}
              </span>
              {' · Created '}
              {formatShortDate(adjustment.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {adjustment.status === 'DRAFT' && onPost && (
              <Button variant="primary" size="sm" onClick={() => onPost(adjustment.id)}>
                <PackageCheck className="h-3.5 w-3.5" />
                Post adjustment
              </Button>
            )}
            {adjustment.status === 'DRAFT' && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(adjustment.id)}
                className="text-destructive border-destructive/25 hover:bg-destructive/10"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel draft
              </Button>
            )}
            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <WarehouseIcon className="h-3.5 w-3.5" />
              Warehouse
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {adjustment.warehouseName}
            </p>
            <p className="text-xs text-ref text-muted-foreground mt-0.5">
              {adjustment.warehouseCode}
            </p>
          </div>

          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Date &amp; reason
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatShortDate(adjustment.adjustmentDate)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{adjustment.reason}</p>
          </div>

          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <PackageCheck className="h-3.5 w-3.5" />
              Summary
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
              {adjustment.totalItems} {adjustment.totalItems === 1 ? 'item' : 'items'}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
              Net difference:{' '}
              {adjustment.totalDifference > 0
                ? `+${formatQuantity(adjustment.totalDifference)}`
                : formatQuantity(adjustment.totalDifference)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border/80 bg-card p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span>Positive adjustment</span>
            </div>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-success">
              +{formatQuantity(totalPositiveQty)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adjustment in · {positiveDiffs.length}{' '}
              {positiveDiffs.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="rounded-md border border-border/80 bg-card p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <span>Negative adjustment</span>
            </div>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-destructive">
              -{formatQuantity(totalNegativeQty)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adjustment out · {negativeDiffs.length}{' '}
              {negativeDiffs.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">
            Adjusted items ({adjustment.items.length})
          </h4>
          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="py-2.5 px-3 w-[36%]">Item &amp; code</TH>
                <TH className="py-2.5 px-2.5 w-[15%] text-right">System qty</TH>
                <TH className="py-2.5 px-2.5 w-[15%] text-right">Physical qty</TH>
                <TH className="py-2.5 px-2.5 w-[15%] text-right">Difference</TH>
                <TH className="py-2.5 px-3 w-[19%] pl-5">Movement</TH>
              </tr>
            </THead>
            <TBody>
              {adjustment.items.map((it) => (
                <TR key={it.id}>
                  <TD className="py-2.5 px-3">
                    <p className="text-xs font-medium text-foreground truncate">
                      {it.itemName}
                    </p>
                    <p className="text-xs text-ref text-muted-foreground">{it.itemCode}</p>
                  </TD>
                  <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums text-muted-foreground">
                    {formatQuantity(it.systemQuantity)} {it.unitOfMeasure}
                  </TD>
                  <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums font-medium text-foreground">
                    {formatQuantity(it.physicalQuantity)} {it.unitOfMeasure}
                  </TD>
                  <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums font-medium">
                    {it.adjustmentQuantity > 0 ? (
                      <span className="text-success">
                        +{formatQuantity(it.adjustmentQuantity)}
                      </span>
                    ) : it.adjustmentQuantity < 0 ? (
                      <span className="text-destructive">
                        {formatQuantity(it.adjustmentQuantity)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TD>
                  <TD className="py-2.5 px-3 pl-5">
                    {it.adjustmentQuantity > 0 ? (
                      <Badge variant="success">Adjustment in</Badge>
                    ) : it.adjustmentQuantity < 0 ? (
                      <Badge variant="destructive">Adjustment out</Badge>
                    ) : (
                      <Badge variant="neutral">No difference</Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>

        <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>Notes</span>
          </div>
          <p className="text-xs text-foreground whitespace-pre-wrap">
            {adjustment.notes || 'No adjustment notes provided.'}
          </p>
        </div>
      </div>
    </Drawer>
  )
}
