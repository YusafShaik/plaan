import { useState } from 'react'
import {
  Download,
  Send,
  Ban,
  Building2,
  Warehouse as WarehouseIcon,
  FileText,
  PackageCheck,
} from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { useAuth } from '../../hooks/useAuth'
import { confirmAction } from '../../lib/feedback'
import { formatMoney, formatQuantity, formatShortDate, getCurrencySymbol } from '../../lib/format'
import type { PurchaseOrder, PurchaseOrderStatus } from '../../types/procurement'

const STATUS_BADGE: Record<PurchaseOrderStatus, { variant: BadgeVariant; label: string }> = {
  DRAFT: { variant: 'neutral', label: 'Draft' },
  ISSUED: { variant: 'info', label: 'Issued' },
  PARTIALLY_RECEIVED: { variant: 'warning', label: 'Partially received' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

export interface PurchaseOrderDetailsModalProps {
  isOpen: boolean
  order: PurchaseOrder | null
  onClose: () => void
  onStatusChange?: (orderId: number, status: PurchaseOrderStatus) => Promise<void>
  onDownloadPdf?: (orderId: number, poNumber: string) => Promise<void>
  onReceiveGoods?: (orderId: number) => void
}

export function PurchaseOrderDetailsModal({
  isOpen,
  order,
  onClose,
  onStatusChange,
  onDownloadPdf,
  onReceiveGoods,
}: PurchaseOrderDetailsModalProps) {
  const { organization } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen || !order) return null

  const currency = order.currency || organization?.baseCurrency || 'INR'
  const currencySymbol = getCurrencySymbol(currency)
  const badge = STATUS_BADGE[order.status] ?? { variant: 'neutral', label: order.status }
  const canReceive = order.status === 'ISSUED' || order.status === 'PARTIALLY_RECEIVED'

  const handleDownload = async () => {
    if (!onDownloadPdf) return
    setIsProcessing(true)
    try {
      await onDownloadPdf(order.id, order.poNumber)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStatus = async (status: PurchaseOrderStatus) => {
    if (!onStatusChange) return
    if (status === 'CANCELLED') {
      const confirmed = await confirmAction({
        title: `Cancel ${order.poNumber}?`,
        description: 'This purchase order will be marked cancelled and excluded from open pipeline.',
        confirmLabel: 'Cancel order',
        variant: 'destructive',
      })
      if (!confirmed) return
    }
    setIsProcessing(true)
    try {
      await onStatusChange(order.id, status)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="lg">
      <div className="space-y-5 pb-4">
          {/* Header */}
          <div className="flex flex-col gap-3 pb-4 border-b border-border/80 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {order.poNumber}
                </h2>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Order date:{' '}
                <span className="text-foreground font-medium">
                  {formatShortDate(order.orderDate)}
                </span>
                {order.expectedDeliveryDate && (
                  <>
                    {' · '}Expected delivery:{' '}
                    <span className="text-foreground font-medium">
                      {formatShortDate(order.expectedDeliveryDate)}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isProcessing}
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                Download PDF
              </Button>

              {order.status === 'DRAFT' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStatus('ISSUED')}
                  disabled={isProcessing}
                >
                  <Send className="h-3.5 w-3.5" />
                  Issue order
                </Button>
              )}

              {canReceive && onReceiveGoods && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onReceiveGoods(order.id)
                  }}
                  disabled={isProcessing}
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  Receive goods
                </Button>
              )}

              {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatus('CANCELLED')}
                  disabled={isProcessing}
                  className="text-destructive border-destructive/25 hover:bg-destructive/10"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}

              <DrawerCloseButton onClick={onClose} />
            </div>
          </div>

          {/* 2-Column Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>Supplier</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{order.supplierName}</p>
              <p className="text-xs text-ref text-muted-foreground mt-0.5">
                {order.supplierCode}
              </p>
            </div>

            <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <WarehouseIcon className="h-3.5 w-3.5" />
                <span>Receiving warehouse</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{order.warehouseName}</p>
              <p className="text-xs text-ref text-muted-foreground mt-0.5">
                {order.warehouseCode}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Order items ({order.itemsCount})
              </span>
            </div>

            <Table tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="py-2.5 px-3 w-[6%] text-center">#</TH>
                  <TH className="py-2.5 px-3 w-[42%]">Item &amp; code</TH>
                  <TH className="py-2.5 px-2.5 w-[10%] text-center">UOM</TH>
                  <TH className="py-2.5 px-2.5 w-[10%] text-right">Qty</TH>
                  <TH className="py-2.5 px-2.5 w-[15%] text-right">
                    Rate ({currencySymbol})
                  </TH>
                  <TH className="py-2.5 px-3 w-[17%] text-right">Amount</TH>
                </tr>
              </THead>
              <TBody>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => (
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
                      <TD className="py-2.5 px-2.5 text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded-md bg-secondary text-xs font-medium text-muted-foreground uppercase">
                          {item.unitOfMeasure}
                        </span>
                      </TD>
                      <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums font-medium text-foreground">
                        {formatQuantity(item.quantity)}
                      </TD>
                      <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums font-medium text-foreground">
                        {formatMoney(item.unitPrice, currency)}
                      </TD>
                      <TD className="py-2.5 px-3 text-right text-xs tabular-nums font-semibold text-foreground">
                        {formatMoney(item.lineAmount, currency)}
                      </TD>
                    </TR>
                  ))
                ) : (
                  <TR>
                    <TD colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                      {order.itemsCount} line items recorded
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </div>

          {/* Notes & Order Total */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7 rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <FileText className="h-3.5 w-3.5" />
                <span>Notes &amp; instructions</span>
              </div>
              <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">
                {order.notes || 'No special instructions recorded.'}
              </p>
            </div>

            <div className="sm:col-span-5 rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Order total</span>
                <span>{currency}</span>
              </div>
              <div className="text-right mt-2">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatMoney(order.totalAmount, currency)}
                </span>
              </div>
            </div>
          </div>
      </div>
    </Drawer>
  )
}
