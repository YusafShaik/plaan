import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  Ban,
  Pencil,
  Trash2,
  PackageCheck,
  AlertTriangle,
  RefreshCw,
  FileText,
  ChevronRight,
  Package,
} from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { formatQuantity, formatShortDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import { manufacturingService } from '../../services/manufacturingService'
import { CreateMaterialIssueModal } from './CreateMaterialIssueModal'
import { RecordMaterialConsumptionModal } from './RecordMaterialConsumptionModal'
import { ReturnMaterialsModal } from './ReturnMaterialsModal'
import { ReceiveFinishedGoodsModal } from './ReceiveFinishedGoodsModal'
import { CloseProductionOrderModal } from './CloseProductionOrderModal'
import type {
  ProductionOrder,
  ProductionOrderStatus,
  ProductionOrderAvailability,
  MaterialIssue,
  MaterialConsumption,
  MaterialReturn,
  MaterialTransaction,
  ProductionReceipt,
} from '../../types/manufacturing'

const STATUS_BADGE: Record<ProductionOrderStatus, { variant: BadgeVariant; label: string }> = {
  DRAFT: { variant: 'neutral', label: 'Draft' },
  RELEASED: { variant: 'info', label: 'Released' },
  IN_PROGRESS: { variant: 'warning', label: 'In progress' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  CLOSED: { variant: 'neutral', label: 'Closed' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
}

export interface ProductionOrderDetailsModalProps {
  isOpen: boolean
  order: ProductionOrder | null
  onClose: () => void
  onEdit?: (order: ProductionOrder) => void
  onRelease?: (id: number) => Promise<void>
  onCancel?: (id: number) => Promise<void>
  onDelete?: (id: number) => Promise<void>
  onOrderUpdated?: () => void
}

export function ProductionOrderDetailsModal({
  isOpen,
  order,
  onClose,
  onEdit,
  onRelease,
  onCancel,
  onDelete,
  onOrderUpdated,
}: ProductionOrderDetailsModalProps) {
  const [currentOrder, setCurrentOrder] = useState<ProductionOrder | null>(order)
  const [availability, setAvailability] = useState<ProductionOrderAvailability | null>(null)

  const [transactions, setTransactions] = useState<MaterialTransaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [editingDraftIssue, setEditingDraftIssue] = useState<MaterialIssue | null>(null)

  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false)
  const [editingDraftConsumption, setEditingDraftConsumption] =
    useState<MaterialConsumption | null>(null)

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [editingDraftReturn, setEditingDraftReturn] = useState<MaterialReturn | null>(null)

  const [receipts, setReceipts] = useState<ProductionReceipt[]>([])
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [editingDraftReceipt, setEditingDraftReceipt] =
    useState<ProductionReceipt | null>(null)

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  const effectiveOrder = currentOrder || order

  const fetchAvailability = useCallback((orderId: number) => {
    manufacturingService
      .getMaterialAvailability(orderId)
      .then(setAvailability)
      .catch((err: unknown) => console.error('Failed to fetch material availability:', err))
  }, [])

  const fetchTransactions = useCallback((orderId: number) => {
    setIsLoadingTransactions(true)
    manufacturingService
      .getMaterialTransactions(orderId)
      .then((res) => {
        setTransactions(res)
        setIsLoadingTransactions(false)
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch transactions:', err)
        setIsLoadingTransactions(false)
      })
  }, [])

  const fetchReceipts = useCallback((orderId: number) => {
    setIsLoadingReceipts(true)
    manufacturingService
      .getProductionReceiptsByProductionOrder(orderId)
      .then((res) => {
        setReceipts(res)
        setIsLoadingReceipts(false)
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch production receipts:', err)
        setIsLoadingReceipts(false)
      })
  }, [])

  const reloadAll = useCallback(
    (orderId: number) => {
      fetchAvailability(orderId)
      fetchTransactions(orderId)
      fetchReceipts(orderId)
      manufacturingService
        .getProductionOrderById(orderId)
        .then((fresh) => setCurrentOrder(fresh))
        .catch(console.error)
    },
    [fetchAvailability, fetchTransactions, fetchReceipts]
  )

  useEffect(() => {
    if (isOpen && order) {
      Promise.resolve().then(() => {
        setCurrentOrder(order)
        setActionError(null)
        reloadAll(order.id)
      })
    } else {
      Promise.resolve().then(() => {
        setCurrentOrder(null)
        setAvailability(null)
        setTransactions([])
        setReceipts([])
        setActionError(null)
        setIsIssueModalOpen(false)
        setEditingDraftIssue(null)
        setIsConsumptionModalOpen(false)
        setEditingDraftConsumption(null)
        setIsReturnModalOpen(false)
        setEditingDraftReturn(null)
        setIsReceiptModalOpen(false)
        setEditingDraftReceipt(null)
      })
    }
  }, [isOpen, order, reloadAll])

  if (!isOpen || !effectiveOrder) return null

  const badge = STATUS_BADGE[effectiveOrder.status] ?? {
    variant: 'neutral',
    label: effectiveOrder.status,
  }

  const handleCompleteProduction = async () => {
    setIsSubmittingAction(true)
    setActionError(null)
    try {
      const updated = await manufacturingService.completeProductionOrder(effectiveOrder.id)
      setCurrentOrder(updated)
      reloadAll(effectiveOrder.id)
      onOrderUpdated?.()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to complete production order.')
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const handleTransactionClick = async (tx: MaterialTransaction) => {
    if (tx.status !== 'DRAFT') return
    try {
      if (tx.transactionType === 'MATERIAL_ISSUE') {
        const issue = await manufacturingService.getMaterialIssueById(tx.id)
        if (issue.status === 'DRAFT') {
          setEditingDraftIssue(issue)
          setIsIssueModalOpen(true)
        }
      } else if (tx.transactionType === 'MATERIAL_CONSUMPTION') {
        const consumption = await manufacturingService.getMaterialConsumptionById(tx.id)
        if (consumption.status === 'DRAFT') {
          setEditingDraftConsumption(consumption)
          setIsConsumptionModalOpen(true)
        }
      } else if (tx.transactionType === 'MATERIAL_RETURN') {
        const ret = await manufacturingService.getMaterialReturnById(tx.id)
        if (ret.status === 'DRAFT') {
          setEditingDraftReturn(ret)
          setIsReturnModalOpen(true)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const displayItems = effectiveOrder.items.map((it) => {
    const availItem = availability?.items.find((a) => a.materialId === it.materialId)
    const required = it.requiredQuantity
    const issued = it.issuedQuantity ?? availItem?.issuedQuantity ?? 0
    const consumed = it.consumedQuantity ?? availItem?.consumedQuantity ?? 0
    const returned = it.returnedQuantity ?? availItem?.returnedQuantity ?? 0
    const remaining = it.remainingQuantity ?? Math.max(0, issued - consumed - returned)

    return {
      id: it.id,
      materialId: it.materialId,
      materialCode: it.materialCode,
      materialName: it.materialName,
      requiredQuantity: required,
      issuedQuantity: issued,
      consumedQuantity: consumed,
      returnedQuantity: returned,
      remainingQuantity: remaining,
      unitOfMeasure: it.unitOfMeasure,
    }
  })

  const hasRemainingMaterials = displayItems.some((it) => it.remainingQuantity > 0)
  const hasPostedTransactions = transactions.some((t) => t.status === 'POSTED')
  const hasPostedConsumption = transactions.some(
    (t) => t.transactionType === 'MATERIAL_CONSUMPTION' && t.status === 'POSTED'
  )
  const hasPostedReceipts = receipts.some((r) => r.status === 'POSTED')

  const orderedQty = effectiveOrder.productionQuantity || 0
  const receivedQty = effectiveOrder.receivedQuantity ?? 0
  const pendingQty =
    effectiveOrder.pendingProductionQuantity ?? Math.max(0, orderedQty - receivedQty)
  const progressPercent =
    effectiveOrder.productionProgress !== undefined &&
    effectiveOrder.productionProgress !== null
      ? effectiveOrder.productionProgress
      : orderedQty > 0
        ? Math.min(100, Math.round((receivedQty / orderedQty) * 100))
        : 0

  const canCancelOrder =
    effectiveOrder.status !== 'CANCELLED' &&
    effectiveOrder.status !== 'IN_PROGRESS' &&
    effectiveOrder.status !== 'COMPLETED' &&
    effectiveOrder.status !== 'CLOSED' &&
    !hasPostedTransactions &&
    !hasPostedReceipts &&
    !!onCancel

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} width="lg">
        <div className="space-y-5 pb-4">
          {/* Header */}
          <div className="flex flex-col gap-3 pb-4 border-b border-border/80 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
                  {effectiveOrder.orderNumber}
                </h2>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {effectiveOrder.productName}
                </span>
                {' · '}BOM: {effectiveOrder.bomCode}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {effectiveOrder.status === 'DRAFT' && onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(effectiveOrder)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit draft
                </Button>
              )}
              {effectiveOrder.status === 'DRAFT' && onRelease && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onRelease(effectiveOrder.id)}
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  Release order
                </Button>
              )}
              {canCancelOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel!(effectiveOrder.id)}
                  className="text-destructive border-destructive/25 hover:bg-destructive/10"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel order
                </Button>
              )}
              {effectiveOrder.status === 'DRAFT' && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(effectiveOrder.id)}
                  className="text-destructive border-destructive/25 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete draft
                </Button>
              )}
              <DrawerCloseButton onClick={onClose} />
            </div>
          </div>

          {actionError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Summary KPIs: Ordered | Received | Pending */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
              <p className="text-xs font-medium text-muted-foreground">Ordered</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
                {formatQuantity(orderedQty)}
              </p>
              <p className="mt-0.5 text-xs uppercase text-muted-foreground">
                {effectiveOrder.unitOfMeasure}
              </p>
            </div>

            <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
              <p className="text-xs font-medium text-muted-foreground">Received</p>
              <p className="mt-1 text-2xl font-semibold text-success tabular-nums">
                {formatQuantity(receivedQty)}
              </p>
              <p className="mt-0.5 text-xs uppercase text-muted-foreground">
                {effectiveOrder.unitOfMeasure}
              </p>
            </div>

            <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
              <p className="text-xs font-medium text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
                {formatQuantity(pendingQty)}
              </p>
              <p className="mt-0.5 text-xs uppercase text-muted-foreground">
                {effectiveOrder.unitOfMeasure}
              </p>
            </div>
          </div>

          {((effectiveOrder.qualityPendingQuantity ?? 0) > 0 ||
            (effectiveOrder.qualityAcceptedQuantity ?? 0) > 0 ||
            (effectiveOrder.qualityRejectedQuantity ?? 0) > 0) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
                <p className="text-xs font-medium text-muted-foreground">Quality pending</p>
                <p className="mt-1 text-lg font-semibold text-warning tabular-nums">
                  {formatQuantity(effectiveOrder.qualityPendingQuantity ?? 0)}
                </p>
              </div>
              <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
                <p className="text-xs font-medium text-muted-foreground">Quality accepted</p>
                <p className="mt-1 text-lg font-semibold text-success tabular-nums">
                  {formatQuantity(effectiveOrder.qualityAcceptedQuantity ?? 0)}
                </p>
              </div>
              <div className="rounded-md border border-border/80 bg-surface-subtle dark:bg-secondary/30 p-3.5">
                <p className="text-xs font-medium text-muted-foreground">Quality rejected</p>
                <p className="mt-1 text-lg font-semibold text-destructive tabular-nums">
                  {formatQuantity(effectiveOrder.qualityRejectedQuantity ?? 0)}
                </p>
              </div>
            </div>
          )}

          {/* Production Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Production progress</span>
              <span className="font-semibold text-foreground tabular-nums">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-md bg-secondary overflow-hidden">
              <div
                className="h-full bg-success rounded-md transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          </div>

          {effectiveOrder.status === 'IN_PROGRESS' && pendingQty <= 0 && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-md border border-success/30 bg-success-soft">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold">All planned products received</span>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isSubmittingAction}
                onClick={handleCompleteProduction}
              >
                {isSubmittingAction ? 'Completing...' : 'Complete production'}
              </Button>
            </div>
          )}

          {effectiveOrder.status === 'COMPLETED' && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-md border border-brand/30 bg-brand-soft">
              <div className="flex items-center gap-2.5 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Production completed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reconcile remaining materials to finalize order.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsCloseModalOpen(true)}
              >
                Close order
              </Button>
            </div>
          )}

          {effectiveOrder.status === 'CLOSED' && (
            <div className="p-3.5 rounded-md border border-border bg-surface-subtle space-y-1">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span>Order finalized &amp; closed</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Closed
                {effectiveOrder.closedDate
                  ? ` on ${formatShortDate(effectiveOrder.closedDate)}`
                  : ''}
                {effectiveOrder.closedBy ? ` by ${effectiveOrder.closedBy}` : ''}.
              </p>
              {effectiveOrder.closureNotes && (
                <p className="text-xs italic text-muted-foreground pt-0.5">
                  &ldquo;{effectiveOrder.closureNotes}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Warehouses Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-border/80 pt-3">
            <div>
              <span className="text-muted-foreground">Source warehouse: </span>
              <span className="font-semibold text-foreground">
                {effectiveOrder.sourceWarehouseName}
              </span>
              <span className="text-ref text-muted-foreground ml-1">
                ({effectiveOrder.sourceWarehouseCode})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Output warehouse: </span>
              <span className="font-semibold text-foreground">
                {effectiveOrder.finishedGoodsWarehouseName}
              </span>
              <span className="text-ref text-muted-foreground ml-1">
                ({effectiveOrder.finishedGoodsWarehouseCode})
              </span>
            </div>
          </div>

          {/* Section: Production Receipts */}
          <div className="space-y-2.5 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Production receipts</h3>

              {effectiveOrder.status === 'IN_PROGRESS' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={pendingQty <= 0 || !hasPostedConsumption}
                  onClick={() => {
                    setEditingDraftReceipt(null)
                    setIsReceiptModalOpen(true)
                  }}
                  title={
                    !hasPostedConsumption
                      ? 'Consume materials before receiving finished goods.'
                      : pendingQty <= 0
                        ? 'All ordered quantity received.'
                        : 'Receive finished goods into inventory'
                  }
                >
                  Receive finished goods
                </Button>
              )}
            </div>

            <Table tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="py-2.5 px-3 w-[22%]">Reference</TH>
                  <TH className="py-2.5 px-2.5 w-[18%]">Date</TH>
                  <TH className="py-2.5 px-2.5 w-[18%] text-right">Quantity</TH>
                  <TH className="py-2.5 px-2.5 w-[26%] pl-4">Warehouse</TH>
                  <TH className="py-2.5 px-3 w-[16%]">Status</TH>
                </tr>
              </THead>
              <TBody>
                {isLoadingReceipts ? (
                  <TR>
                    <TD colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-foreground" />
                      Loading production receipts...
                    </TD>
                  </TR>
                ) : receipts.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                      No production receipts recorded yet.
                    </TD>
                  </TR>
                ) : (
                  receipts.map((pr) => (
                    <TR
                      key={pr.id}
                      clickable={pr.status === 'DRAFT'}
                      onClick={() => {
                        if (pr.status === 'DRAFT') {
                          setEditingDraftReceipt(pr)
                          setIsReceiptModalOpen(true)
                        }
                      }}
                    >
                      <TD className="py-2.5 px-3">
                        <span
                          className={cn(
                            pr.status === 'DRAFT'
                              ? 'text-ref-link'
                              : 'text-ref text-foreground'
                          )}
                        >
                          {pr.receiptNumber}
                        </span>
                      </TD>
                      <TD className="py-2.5 px-2.5 text-xs tabular-nums text-muted-foreground">
                        {formatShortDate(pr.receiptDate)}
                      </TD>
                      <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums font-medium text-foreground">
                        {formatQuantity(pr.receiptQuantity)}{' '}
                        <span className="uppercase text-muted-foreground">
                          {pr.unitOfMeasure}
                        </span>
                      </TD>
                      <TD className="py-2.5 px-2.5 pl-4 text-xs text-muted-foreground truncate">
                        {pr.receivingWarehouseName}
                      </TD>
                      <TD className="py-2.5 px-3">
                        {pr.status === 'POSTED' ? (
                          <Badge variant="success">Posted</Badge>
                        ) : (
                          <Badge variant="warning">Draft</Badge>
                        )}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>

          {/* Section: Materials */}
          <div className="space-y-2.5 pt-2 border-t border-border/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Materials</h3>

              <div className="flex flex-wrap items-center gap-2">
                {(effectiveOrder.status === 'RELEASED' ||
                  effectiveOrder.status === 'IN_PROGRESS') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingDraftIssue(null)
                      setIsIssueModalOpen(true)
                    }}
                  >
                    Issue materials
                  </Button>
                )}

                {(effectiveOrder.status === 'IN_PROGRESS' ||
                  effectiveOrder.status === 'COMPLETED') && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!hasRemainingMaterials}
                      onClick={() => {
                        setEditingDraftReturn(null)
                        setIsReturnModalOpen(true)
                      }}
                    >
                      Return materials
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={!hasRemainingMaterials}
                      onClick={() => {
                        setEditingDraftConsumption(null)
                        setIsConsumptionModalOpen(true)
                      }}
                    >
                      Record consumption
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Table tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="py-2.5 px-3 w-[35%]">Material</TH>
                  <TH className="py-2.5 px-2.5 w-[13%] text-right">Required</TH>
                  <TH className="py-2.5 px-2.5 w-[13%] text-right">Issued</TH>
                  <TH className="py-2.5 px-2.5 w-[13%] text-right">Consumed</TH>
                  <TH className="py-2.5 px-2.5 w-[13%] text-right">Returned</TH>
                  <TH className="py-2.5 px-3 w-[13%] text-right">Remaining</TH>
                </tr>
              </THead>
              <TBody>
                {displayItems.length === 0 ? (
                  <TR>
                    <TD colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                      No materials required for this production order
                    </TD>
                  </TR>
                ) : (
                  displayItems.map((it) => (
                    <TR key={it.materialId}>
                      <TD className="py-2.5 px-3">
                        <p className="text-xs font-medium text-foreground truncate">
                          {it.materialName}
                        </p>
                        <p className="text-xs text-ref text-muted-foreground">
                          {it.materialCode}
                        </p>
                      </TD>
                      <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums text-muted-foreground">
                        {formatQuantity(it.requiredQuantity)}
                      </TD>
                      <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums font-medium text-foreground">
                        {formatQuantity(it.issuedQuantity)}
                      </TD>
                      <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums font-medium text-foreground">
                        {formatQuantity(it.consumedQuantity)}
                      </TD>
                      <TD className="py-2.5 px-2.5 text-right text-xs tabular-nums text-muted-foreground">
                        {formatQuantity(it.returnedQuantity)}
                      </TD>
                      <TD className="py-2.5 px-3 text-right text-xs tabular-nums font-medium">
                        <span
                          className={
                            it.remainingQuantity > 0 ? 'text-warning' : 'text-foreground'
                          }
                        >
                          {formatQuantity(it.remainingQuantity)}
                        </span>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>

          {/* Section: Material Transaction History */}
          <div className="space-y-2.5 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Material transaction history
              </h3>
              {transactions.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {transactions.length}{' '}
                  {transactions.length === 1 ? 'transaction' : 'transactions'}
                </span>
              )}
            </div>

            {isLoadingTransactions ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-foreground" />
                Loading transaction history...
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 rounded-md border border-border/80 bg-surface-subtle text-center">
                <Package className="h-7 w-7 text-muted-foreground/60 mb-2 stroke-[1.5]" />
                <p className="text-xs text-muted-foreground">
                  No material transactions recorded yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isDraft = tx.status === 'DRAFT'
                  return (
                    <div
                      key={`${tx.transactionType}-${tx.id}`}
                      onClick={isDraft ? () => handleTransactionClick(tx) : undefined}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-md border border-border/80 bg-surface-subtle',
                        isDraft && 'hover:bg-secondary/60 transition-colors cursor-pointer'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-card border border-border/80 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p
                            className={cn(
                              'tabular-nums text-sm font-medium',
                              isDraft ? 'text-ref-link' : 'text-foreground'
                            )}
                          >
                            {tx.referenceNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.transactionTypeLabel} ·{' '}
                            {formatShortDate(tx.transactionDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={tx.status === 'POSTED' ? 'success' : 'warning'}>
                          {tx.status === 'POSTED' ? 'Posted' : 'Draft'}
                        </Badge>
                        {isDraft && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      <CreateMaterialIssueModal
        isOpen={isIssueModalOpen}
        order={effectiveOrder}
        availability={availability}
        initialDraft={editingDraftIssue}
        onClose={() => {
          setIsIssueModalOpen(false)
          setEditingDraftIssue(null)
        }}
        onSuccess={() => {
          reloadAll(effectiveOrder.id)
          onOrderUpdated?.()
        }}
      />

      <RecordMaterialConsumptionModal
        isOpen={isConsumptionModalOpen}
        order={effectiveOrder}
        initialDraft={editingDraftConsumption}
        onClose={() => {
          setIsConsumptionModalOpen(false)
          setEditingDraftConsumption(null)
        }}
        onSuccess={() => {
          reloadAll(effectiveOrder.id)
          onOrderUpdated?.()
        }}
      />

      <ReturnMaterialsModal
        isOpen={isReturnModalOpen}
        order={effectiveOrder}
        initialDraft={editingDraftReturn}
        onClose={() => {
          setIsReturnModalOpen(false)
          setEditingDraftReturn(null)
        }}
        onSuccess={() => {
          reloadAll(effectiveOrder.id)
          onOrderUpdated?.()
        }}
      />

      <ReceiveFinishedGoodsModal
        isOpen={isReceiptModalOpen}
        order={effectiveOrder}
        initialDraft={editingDraftReceipt}
        hasPostedConsumption={hasPostedConsumption}
        onClose={() => {
          setIsReceiptModalOpen(false)
          setEditingDraftReceipt(null)
        }}
        onSuccess={() => {
          reloadAll(effectiveOrder.id)
          onOrderUpdated?.()
        }}
      />

      <CloseProductionOrderModal
        isOpen={isCloseModalOpen}
        order={effectiveOrder}
        onClose={() => setIsCloseModalOpen(false)}
        onSuccess={() => {
          reloadAll(effectiveOrder.id)
          onOrderUpdated?.()
        }}
      />
    </>
  )
}
