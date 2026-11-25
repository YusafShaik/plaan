import { useState } from 'react'
import {
  X,
  Download,
  Building2,
  Warehouse as WarehouseIcon,
  FileText,
  CheckCircle2,
  Ban,
  Clock,
  PackageCheck,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { GoodsReceipt } from '../../types/procurement'

export interface GoodsReceiptDetailsModalProps {
  isOpen: boolean
  receipt: GoodsReceipt | null
  onClose: () => void
  onPost?: (receiptId: number) => Promise<void>
  onCancel?: (receiptId: number) => Promise<void>
  onDownloadPdf?: (receiptId: number, grnNumber: string) => Promise<void>
}

export function GoodsReceiptDetailsModal({
  isOpen,
  receipt,
  onClose,
  onPost,
  onCancel,
  onDownloadPdf,
}: GoodsReceiptDetailsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen || !receipt) return null

  const handleDownload = async () => {
    if (!onDownloadPdf) return
    setIsProcessing(true)
    try {
      await onDownloadPdf(receipt.id, receipt.grnNumber)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePost = async () => {
    if (!onPost) return
    setIsProcessing(true)
    try {
      await onPost(receipt.id)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!onCancel) return
    setIsProcessing(true)
    try {
      await onCancel(receipt.id)
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
                {receipt.grnNumber}
              </h2>
              {receipt.status === 'POSTED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Posted (Inventory Updated)
                </span>
              )}
              {receipt.status === 'DRAFT' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Draft
                </span>
              )}
              {receipt.status === 'CANCELLED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                  <Ban className="h-3.5 w-3.5 text-rose-600" />
                  Cancelled
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Receipt date: <span className="text-foreground font-medium">{receipt.receiptDate}</span> • PO:{' '}
              <span className="text-foreground font-medium">{receipt.poNumber}</span>
              {receipt.deliveryNoteNumber && (
                <>
                  {' '}• Delivery Note: <span className="text-foreground font-medium">{receipt.deliveryNoteNumber}</span>
                </>
              )}
            </p>
          </div>

          {/* Quick Header Actions */}
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

            {receipt.status === 'DRAFT' && (
              <>
                <Button
                  size="sm"
                  onClick={handlePost}
                  disabled={isProcessing}
                  className="gap-1.5 text-xs bg-[#171717] hover:bg-black text-white cursor-pointer"
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  <span>Post GRN</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </Button>
              </>
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

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Supplier Info */}
          <div className="rounded-[12px] border border-border/70 bg-[#f8f9fa] dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <Building2 className="h-3.5 w-3.5" />
              <span>Supplier</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{receipt.supplierName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Code: {receipt.supplierCode}</p>
          </div>

          {/* Receiving Warehouse Info */}
          <div className="rounded-[12px] border border-border/70 bg-[#f8f9fa] dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <WarehouseIcon className="h-3.5 w-3.5" />
              <span>Receiving Warehouse</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{receipt.warehouseName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Code: {receipt.warehouseCode}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Received Items ({receipt.itemsCount})
            </span>
          </div>

          <div className="rounded-[14px] border border-border/70 overflow-hidden bg-white dark:bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-border/70 bg-[#fafafa] dark:bg-secondary/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-[6%] text-center">#</th>
                    <th className="py-2.5 px-3 w-[40%]">Item & Code</th>
                    <th className="py-2.5 px-2 w-[12%] text-center">UOM</th>
                    <th className="py-2.5 px-2 w-[14%] text-right">Ordered</th>
                    <th className="py-2.5 px-2 w-[14%] text-right">Received</th>
                    <th className="py-2.5 px-3 w-[14%] text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {receipt.items && receipt.items.length > 0 ? (
                    receipt.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="text-xs font-semibold text-foreground">{item.itemName}</p>
                          <p className="text-[11px] text-muted-foreground">{item.itemCode}</p>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-secondary text-[10px] font-semibold text-muted-foreground uppercase">
                            {item.unitOfMeasure}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right text-xs text-muted-foreground font-medium">
                          {item.orderedQuantity}
                        </td>
                        <td className="py-2.5 px-2 text-right text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          +{item.receivedQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-medium text-foreground">
                          {item.remainingQuantity}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                        No line items recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Notes & Stock status */}
        <div className="rounded-[12px] border border-border/70 bg-[#f8f9fa] dark:bg-secondary/30 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <FileText className="h-3.5 w-3.5" />
            <span>Notes & Delivery Info</span>
          </div>
          <p className="text-xs text-foreground whitespace-pre-wrap">
            {receipt.notes || 'No special notes or delivery remarks provided.'}
          </p>
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
