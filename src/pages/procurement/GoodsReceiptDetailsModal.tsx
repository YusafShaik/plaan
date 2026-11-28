import { useState } from 'react'
import {
  Download,
  Building2,
  Warehouse as WarehouseIcon,
  FileText,
  Ban,
  PackageCheck,
} from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { formatQuantity, formatShortDate } from '../../lib/format'
import type { GoodsReceipt, GoodsReceiptStatus } from '../../types/procurement'

const GRN_STATUS_BADGE: Record<GoodsReceiptStatus, { variant: BadgeVariant; label: string }> = {
  POSTED: { variant: 'success', label: 'Posted' },
  DRAFT: { variant: 'neutral', label: 'Draft' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

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

  const badge = GRN_STATUS_BADGE[receipt.status] ?? {
    variant: 'neutral',
    label: receipt.status,
  }

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
    <Drawer isOpen={isOpen} onClose={onClose} width="lg">
      <div className="space-y-5 pb-4">
        {/* Header */}
        <div className="flex flex-col gap-3 pb-4 border-b border-border/80 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {receipt.grnNumber}
              </h2>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Receipt date:{' '}
              <span className="text-foreground font-medium">
                {formatShortDate(receipt.receiptDate)}
              </span>
              {' · PO: '}
              <span className="text-foreground font-medium">{receipt.poNumber}</span>
              {receipt.deliveryNoteNumber && (
                <>
                  {' · Delivery note: '}
                  <span className="text-foreground font-medium">
                    {receipt.deliveryNoteNumber}
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

            {receipt.status === 'DRAFT' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePost}
                  disabled={isProcessing}
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  Post GRN
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="text-destructive border-destructive/25 hover:bg-destructive/10"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </>
            )}

            <DrawerCloseButton onClick={onClose} />
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <span>Supplier</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{receipt.supplierName}</p>
            <p className="text-xs text-ref text-muted-foreground mt-0.5">
              {receipt.supplierCode}
            </p>
          </div>

          <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <WarehouseIcon className="h-3.5 w-3.5" />
              <span>Receiving warehouse</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{receipt.warehouseName}</p>
            <p className="text-xs text-ref text-muted-foreground mt-0.5">
              {receipt.warehouseCode}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Received items ({receipt.itemsCount})
            </span>
          </div>

          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="py-2.5 px-3 w-[6%] text-center">#</TH>
                <TH className="py-2.5 px-3 w-[40%]">Item &amp; code</TH>
                <TH className="py-2.5 px-2.5 w-[10%] text-center">UOM</TH>
                <TH className="py-2.5 px-2.5 w-[14%] text-right">Ordered</TH>
                <TH className="py-2.5 px-2.5 w-[15%] text-right">Received</TH>
                <TH className="py-2.5 px-3 w-[15%] text-right">Remaining</TH>
              </tr>
            </THead>
            <TBody>
              {receipt.items && receipt.items.length > 0 ? (
                receipt.items.map((item, idx) => (
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
                    <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums text-muted-foreground font-medium">
                      {formatQuantity(item.orderedQuantity)}
                    </TD>
                    <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums font-semibold text-success">
                      +{formatQuantity(item.receivedQuantity)}
                    </TD>
                    <TD className="py-2.5 px-3 text-right text-xs tabular-nums font-medium text-foreground">
                      {formatQuantity(item.remainingQuantity)}
                    </TD>
                  </TR>
                ))
              ) : (
                <TR>
                  <TD colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                    No line items recorded
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </div>

        {/* Notes & Delivery Info */}
        <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>Notes &amp; delivery remarks</span>
          </div>
          <p className="text-xs text-foreground whitespace-pre-wrap">
            {receipt.notes || 'No special notes or delivery remarks provided.'}
          </p>
        </div>
      </div>
    </Drawer>
  )
}
