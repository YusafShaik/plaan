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
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Issued
                </span>
              )}
              {order.status === 'DRAFT' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  Draft
                </span>
              )}
              {order.status === 'CANCELLED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                  Cancelled
                </span>
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
              <Download className="h-3.5 w-3.5 text-blue-600" />
              <span>Download PDF</span>
            </Button>

            {order.status === 'DRAFT' && (
              <Button
                size="sm"
                onClick={() => handleStatus('ISSUED')}
                disabled={isProcessing}
                className="gap-1.5 text-xs bg-[#048140] hover:bg-[#036a34] text-white cursor-pointer"
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
                className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer"
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
          <div className="rounded-[12px] border border-border/70 bg-[#f8f9fa] dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <Building2 className="h-3.5 w-3.5" />
              <span>Supplier</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{order.supplierName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Code: {order.supplierCode}</p>
          </div>

          {/* Receiving Warehouse Info */}
          <div className="rounded-[12px] border border-border/70 bg-[#f8f9fa] dark:bg-secondary/30 p-3.5">
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

          <div className="rounded-[14px] border border-border/70 overflow-hidden bg-white dark:bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-border/70 bg-[#fafafa] dark:bg-secondary/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-[8%] text-center">#</th>
                    <th className="py-2.5 px-3 w-[46%]">Item & Code</th>
                    <th className="py-2.5 px-2.5 w-[14%] text-center">UOM</th>
                    <th className="py-2.5 px-2.5 w-[14%] text-right">Qty</th>
                    <th className="py-2.5 px-2.5 w-[18%] text-right">Rate ({currencySymbol})</th>
                    <th className="py-2.5 px-3 w-[20%] text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="text-xs font-medium text-foreground">{item.itemName}</p>
                          <p className="text-[11px] text-muted-foreground">{item.itemCode}</p>
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-secondary text-[10px] font-semibold text-muted-foreground uppercase">
                            {item.unitOfMeasure}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-medium text-xs text-foreground">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-medium text-xs text-foreground">
                          {item.unitPrice.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-xs text-foreground">
                          {item.lineAmount.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                        {order.itemsCount} line items recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Notes & Order Total */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Notes */}
          <div className="rounded-[12px] border border-border/70 bg-[#f8f9fa] dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              <FileText className="h-3.5 w-3.5" />
              <span>Notes & Instructions</span>
            </div>
            <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">
              {order.notes || 'No special instructions recorded.'}
            </p>
          </div>

          {/* Total Box */}
          <div className="rounded-[12px] border border-border/70 bg-[#f8f9fa] dark:bg-secondary/30 p-3.5 flex flex-col justify-between">
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
            className="border-border/80 bg-white text-foreground hover:bg-secondary font-medium px-4 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
