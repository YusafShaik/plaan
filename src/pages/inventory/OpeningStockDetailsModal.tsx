import {
  Warehouse as WarehouseIcon,
  Calendar,
  PackageCheck,
  Ban,
  FileText,
} from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { formatQuantity, formatShortDate } from '../../lib/format'
import type { OpeningStock, OpeningStockStatus } from '../../types/inventory'

const STATUS_BADGE: Record<OpeningStockStatus, { variant: BadgeVariant; label: string }> = {
  POSTED: { variant: 'success', label: 'Posted' },
  DRAFT: { variant: 'warning', label: 'Draft' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

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

  const badge = STATUS_BADGE[openingStock.status] ?? {
    variant: 'neutral',
    label: openingStock.status,
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="lg">
      <div className="space-y-5 pb-4">
        <div className="flex flex-col gap-3 pb-4 border-b border-border/80 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
                {openingStock.openingStockNumber}
              </h2>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Opening stock initialization entry
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {openingStock.status === 'DRAFT' && onPost && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onPost(openingStock.id)}
              >
                <PackageCheck className="h-3.5 w-3.5" />
                Post opening stock
              </Button>
            )}
            {openingStock.status === 'DRAFT' && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(openingStock.id)}
                className="text-destructive border-destructive/25 hover:bg-destructive/10"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel draft
              </Button>
            )}
            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <WarehouseIcon className="h-3.5 w-3.5" />
              <span>Warehouse</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {openingStock.warehouseName}
            </p>
            <p className="text-xs text-ref text-muted-foreground mt-0.5">
              {openingStock.warehouseCode}
            </p>
          </div>

          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Opening date</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatShortDate(openingStock.openingDate)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {openingStock.totalItems} {openingStock.totalItems === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Initialized items ({openingStock.items.length})
            </span>
          </div>

          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="py-2.5 px-3 w-[8%] text-center">#</TH>
                <TH className="py-2.5 px-3 w-[56%]">Item &amp; code</TH>
                <TH className="py-2.5 px-3 w-[18%] text-right">Quantity</TH>
                <TH className="py-2.5 px-3 w-[18%] pl-5">UOM</TH>
              </tr>
            </THead>
            <TBody>
              {openingStock.items.map((item, idx) => (
                <TR key={item.id}>
                  <TD className="py-2.5 px-3 text-center text-xs tabular-nums text-muted-foreground">
                    {idx + 1}
                  </TD>
                  <TD className="py-2.5 px-3">
                    <p className="text-xs font-medium text-foreground truncate">
                      {item.itemName}
                    </p>
                    <p className="text-xs text-ref text-muted-foreground">
                      {item.itemCode}
                    </p>
                  </TD>
                  <TD className="py-2.5 px-3 text-right text-xs tabular-nums font-semibold text-success">
                    +{formatQuantity(item.quantity)}
                  </TD>
                  <TD className="py-2.5 px-3 pl-5 text-xs text-muted-foreground uppercase">
                    {item.unitOfMeasure}
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
            {openingStock.notes || 'No notes recorded.'}
          </p>
        </div>
      </div>
    </Drawer>
  )
}
