import { useState } from 'react'
import {
  X,
  Download,
  Send,
  Ban,
  Building2,
  Warehouse as WarehouseIcon,
  FileText,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { useAuth } from '../../hooks/useAuth'
import type { PurchaseOrder, PurchaseOrderStatus } from '../../types/procurement'

export interface PurchaseOrderDetailsModalProps {
  isOpen: boolean
  order: PurchaseOrder | null
  onClose: () => void
  onStatusChange?: (orderId: number, status: PurchaseOrderStatus) => Promise<void>
  onDownloadPdf?: (orderId: number, poNumber: string) => Promise<void>
}

export function PurchaseOrderDetailsModal({
  isOpen,
  order,
  onClose,
  onStatusChange,
  onDownloadPdf,
}: PurchaseOrderDetailsModalProps) {
  const { organization } = useAuth()
  const currencySymbol =
    organization?.baseCurrency === 'USD'
      ? '$'
      : organization?.baseCurrency === 'EUR'
      ? '€'
      : '₹'

  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen || !order) return null

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
    setIsProcessing(true)
    try {
      await onStatusChange(order.id, status)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[760px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {order.poNumber}
              </h2>
              {order.status === 'ISSUED' && (
                <Badge variant="success">Issued</Badge>
              )}
              {order.status === 'DRAFT' && (
                <Badge variant="neutral">Draft</Badge>
              )}
              {order.status === 'CANCELLED' && (
                <Badge variant="destructive">Cancelled</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Order date: <span className="text-foreground font-medium">{order.orderDate}</span>
              {order.expectedDeliveryDate && (
                <>
                  {' '}• Expected delivery: <span className="text-foreground font-medium">{order.expectedDeliveryDate}</span>
                </>
              )}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isProcessing}
              className="gap-1.5 text-xs border-border/80 hover:bg-secondary cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-info" />
              <span>Download PDF</span>
            </Button>

            {order.status === 'DRAFT' && (
              <Button
                size="sm"
                onClick={() => handleStatus('ISSUED')}
                disabled={isProcessing}
                className="gap-1.5 text-xs bg-success hover:bg-brand-hover text-white cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Issue Order</span>
              </Button>
            )}

            {order.status !== 'CANCELLED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatus('CANCELLED')}
                disabled={isProcessing}
                className="gap-1.5 text-xs text-destructive border-destructive/20 hover:bg-destructive/10 cursor-pointer"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Supplier Info */}
          <div className="rounded-md border border-border/70 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <Building2 className="h-3.5 w-3.5" />
              <span>Supplier</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{order.supplierName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Code: {order.supplierCode}</p>
          </div>

          {/* Receiving Warehouse Info */}
          <div className="rounded-md border border-border/70 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <WarehouseIcon className="h-3.5 w-3.5" />
              <span>Receiving Warehouse</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{order.warehouseName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Code: {order.warehouseCode}</p>
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Order Items ({order.itemsCount})
            </span>
          </div>

          <Table className="border-0 rounded-none shadow-none" tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="py-2.5 w-[8%] text-center">#</TH>
                    <TH className="py-2.5 w-[46%]">Item & Code</TH>
                    <TH className="py-2.5 w-[14%] text-center">UOM</TH>
                    <TH className="py-2.5 w-[14%] text-right">Qty</TH>
                    <TH className="py-2.5 w-[18%] text-right">Rate ({currencySymbol})</TH>
                    <TH className="py-2.5 w-[20%] text-right">Amount</TH>
                  </tr>
                </THead>
                <TBody className="divide-y divide-border/60 text-sm">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <TR key={item.id} className="hover:bg-secondary/40 transition-colors">
                        <TD className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                          {idx + 1}
                        </TD>
                        <TD className="py-2.5 px-3">
                          <p className="text-xs font-medium text-foreground">{item.itemName}</p>
                          <p className="text-[11px] text-ref text-muted-foreground">{item.itemCode}</p>
                        </TD>
                        <TD className="py-2.5 px-2.5 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-secondary text-[10px] font-semibold text-muted-foreground uppercase">
                            {item.unitOfMeasure}
                          </span>
                        </TD>
                        <TD className="py-2.5 px-2.5 text-right font-medium text-xs text-foreground">
                          {item.quantity}
                        </TD>
                        <TD className="py-2.5 px-2.5 text-right font-medium text-xs text-foreground">
                          {item.unitPrice.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TD>
                        <TD className="py-2.5 px-3 text-right font-semibold text-xs text-foreground">
                          {item.lineAmount.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Notes */}
          <div className="rounded-md border border-border/70 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              <FileText className="h-3.5 w-3.5" />
              <span>Notes & Instructions</span>
            </div>
            <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">
              {order.notes || 'No special instructions recorded.'}
            </p>
          </div>

          {/* Total Box */}
          <div className="rounded-md border border-border/70 bg-surface-subtle dark:bg-secondary/30 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Total Order Amount</span>
              <span>{order.currency}</span>
            </div>
            <div className="text-right mt-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {currencySymbol}
                {order.totalAmount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-border/70">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-border/80 bg-card text-foreground hover:bg-secondary font-medium px-4 py-2 rounded-md text-sm cursor-pointer shadow-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
