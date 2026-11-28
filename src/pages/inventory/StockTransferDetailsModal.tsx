import {
  Warehouse as WarehouseIcon,
  Calendar,
  FileText,
  PackageCheck,
  Ban,
} from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { formatQuantity, formatShortDate } from '../../lib/format'
import type { StockTransfer, StockTransferStatus } from '../../types/inventory'

const STATUS_BADGE: Record<StockTransferStatus, { variant: BadgeVariant; label: string }> = {
  POSTED: { variant: 'success', label: 'Posted' },
  DRAFT: { variant: 'warning', label: 'Draft' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

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

  const badge = STATUS_BADGE[transfer.status] ?? {
    variant: 'neutral',
    label: transfer.status,
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="lg">
      <div className="space-y-5 pb-4">
        <div className="flex flex-col gap-3 pb-4 border-b border-border/80 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
                {transfer.transferNumber}
              </h2>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Transfer date:{' '}
              <span className="text-foreground font-medium">
                {formatShortDate(transfer.transferDate)}
              </span>
              {' · '}Internal warehouse movement
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {transfer.status === 'DRAFT' && onPost && (
              <Button variant="primary" size="sm" onClick={() => onPost(transfer.id)}>
                <PackageCheck className="h-3.5 w-3.5" />
                Post transfer
              </Button>
            )}
            {transfer.status === 'DRAFT' && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(transfer.id)}
                className="text-destructive border-destructive/25 hover:bg-destructive/10"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel draft
              </Button>
            )}
            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <WarehouseIcon className="h-3.5 w-3.5" />
              <span>Source warehouse</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {transfer.fromWarehouseName}
            </p>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-ref text-muted-foreground">
                {transfer.fromWarehouseCode}
              </span>
              <span className="font-medium text-destructive tabular-nums">
                −{formatQuantity(transfer.totalQuantity)} out
              </span>
            </div>
          </div>

          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <WarehouseIcon className="h-3.5 w-3.5" />
              <span>Destination warehouse</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {transfer.toWarehouseName}
            </p>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-ref text-muted-foreground">
                {transfer.toWarehouseCode}
              </span>
              <span className="font-medium text-success tabular-nums">
                +{formatQuantity(transfer.totalQuantity)} in
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Transferred items ({transfer.items.length})
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Total organization stock remains unchanged
            </span>
          </div>

          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="py-2.5 px-3 w-[8%] text-center">#</TH>
                <TH className="py-2.5 px-3 w-[56%]">Item &amp; code</TH>
                <TH className="py-2.5 px-3 w-[18%] text-right">Transfer qty</TH>
                <TH className="py-2.5 px-3 w-[18%] pl-5">UOM</TH>
              </tr>
            </THead>
            <TBody>
              {transfer.items.map((item, idx) => (
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
                  <TD className="py-2.5 px-3 text-right text-xs tabular-nums font-medium text-foreground">
                    {formatQuantity(item.transferQuantity)}
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
            {transfer.notes || 'No transfer notes recorded.'}
          </p>
        </div>
      </div>
    </Drawer>
  )
}
