import { useState, useEffect, useCallback } from 'react'
import {
  X,
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
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { manufacturingService } from '../../services/manufacturingService'
import { CreateMaterialIssueModal } from './CreateMaterialIssueModal'
import { RecordMaterialConsumptionModal } from './RecordMaterialConsumptionModal'
import { ReturnMaterialsModal } from './ReturnMaterialsModal'
import { ReceiveFinishedGoodsModal } from './ReceiveFinishedGoodsModal'
import { CloseProductionOrderModal } from './CloseProductionOrderModal'
import type {
  ProductionOrder,
  ProductionOrderAvailability,
  MaterialIssue,
  MaterialConsumption,
  MaterialReturn,
  MaterialTransaction,
  ProductionReceipt,
} from '../../types/manufacturing'

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

  // Transactions state
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Modals state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [editingDraftIssue, setEditingDraftIssue] = useState<MaterialIssue | null>(null)

  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false)
  const [editingDraftConsumption, setEditingDraftConsumption] = useState<MaterialConsumption | null>(null)

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [editingDraftReturn, setEditingDraftReturn] = useState<MaterialReturn | null>(null)

  // Production Receipts state
  const [receipts, setReceipts] = useState<ProductionReceipt[]>([])
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [editingDraftReceipt, setEditingDraftReceipt] = useState<ProductionReceipt | null>(null)

  // Completion & Closure state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  const handleCompleteProduction = async () => {
    if (!effectiveOrder) return
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

  const effectiveOrder = currentOrder || order

  const fetchAvailability = useCallback((orderId: number) => {
    manufacturingService
      .getMaterialAvailability(orderId)
      .then((res) => {
        setAvailability(res)
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch material availability:', err)
      })
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
        .then((fresh) => {
          setCurrentOrder(fresh)
        })
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

  const formatQuantity = (qty?: number | null) => {
    if (qty === undefined || qty === null) return '0'
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Handle clicking a transaction in the history list
  const handleTransactionClick = async (tx: MaterialTransaction) => {
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

  // Derive item list merging order items with live availability response if loaded
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
  const pendingQty = effectiveOrder.pendingProductionQuantity ?? Math.max(0, orderedQty - receivedQty)
  const progressPercent = effectiveOrder.productionProgress !== undefined && effectiveOrder.productionProgress !== null
    ? effectiveOrder.productionProgress
    : (orderedQty > 0 ? Math.min(100, Math.round((receivedQty / orderedQty) * 100)) : 0)

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className="!max-w-[780px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
      >
        <div className="space-y-5">
          {/* Header matching Screenshot 1 */}
          <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                Manufacturing / Production Orders / {effectiveOrder.orderNumber}
              </p>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xl font-medium tracking-tight text-foreground">
                  {effectiveOrder.orderNumber}
                </span>
                {effectiveOrder.status === 'RELEASED' && (
                  <Badge variant="success">Released</Badge>
                )}
                {effectiveOrder.status === 'IN_PROGRESS' && (
                  <Badge variant="info">In Progress</Badge>
                )}
                {effectiveOrder.status === 'COMPLETED' && (
                  <Badge variant="success">Completed</Badge>
                )}
                {effectiveOrder.status === 'CLOSED' && (
                  <Badge variant="neutral">Closed</Badge>
                )}
                {effectiveOrder.status === 'DRAFT' && (
                  <Badge variant="warning">Draft</Badge>
                )}
                {effectiveOrder.status === 'CANCELLED' && (
                  <Badge variant="destructive">Cancelled</Badge>
                )}
              </div>

              {/* Subtitle matching Screenshot 1: Wooden Table */}
              <p className="mt-1 text-sm font-semibold text-foreground">
                {effectiveOrder.productName}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action error banner */}
          {actionError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Summary Cards matching Screenshot 1: Ordered | Received | Pending */}
          <div className="grid grid-cols-3 gap-3.5 pt-1">
            <div className="rounded-md border border-border/80 bg-secondary/30 p-4">
              <p className="text-xs text-muted-foreground font-normal">Ordered</p>
              <p className="mt-2 text-2xl font-medium text-foreground font-mono">
                {formatQuantity(orderedQty)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{effectiveOrder.unitOfMeasure}</p>
            </div>

            <div className="rounded-md border border-border/80 bg-secondary/30 p-4">
              <p className="text-xs text-muted-foreground font-normal">Received</p>
              <p className="mt-2 text-2xl font-medium text-success font-mono">
                {formatQuantity(receivedQty)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{effectiveOrder.unitOfMeasure}</p>
            </div>

            <div className="rounded-md border border-border/80 bg-secondary/30 p-4">
              <p className="text-xs text-muted-foreground font-normal">Pending</p>
              <p className="mt-2 text-2xl font-medium text-foreground font-mono">
                {formatQuantity(pendingQty)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{effectiveOrder.unitOfMeasure}</p>
            </div>
          </div>

          {/* Production Progress matching Screenshot 1 */}
          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-normal">Production progress</span>
              <span className="font-medium text-foreground font-mono">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          </div>

          {/* All planned products received - Complete Production banner */}
          {effectiveOrder.status === 'IN_PROGRESS' && pendingQty <= 0 && (
            <div className="flex items-center justify-between p-3.5 rounded-md border border-success/30 bg-success/10">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold">All planned products received</span>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={isSubmittingAction}
                onClick={handleCompleteProduction}
                className="bg-success text-success-foreground hover:opacity-90 font-semibold text-xs h-8 px-3.5 rounded-md cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmittingAction ? 'Completing...' : 'Complete Production'}
              </Button>
            </div>
          )}

          {/* Completed banner - Close Order button */}
          {effectiveOrder.status === 'COMPLETED' && (
            <div className="flex items-center justify-between p-3.5 rounded-md border border-purple-500/30 bg-purple-500/10">
              <div className="flex items-center gap-2.5 text-purple-300">
                <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-purple-300">Production Completed</p>
                  <p className="text-[11px] text-purple-400/80">
                    All planned products received. Reconcile remaining materials to finalize order.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsCloseModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs h-8 px-3.5 rounded-md cursor-pointer shadow-xs"
              >
                <span>Close Order</span>
              </Button>
            </div>
          )}

          {/* Closed card */}
          {effectiveOrder.status === 'CLOSED' && (
            <div className="p-3.5 rounded-md border border-zinc-700 bg-secondary/30 space-y-1">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <CheckCircle2 className="h-4 w-4 text-zinc-400" />
                <span>Order Finalized & Closed</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Closed{effectiveOrder.closedDate ? ` on ${formatDate(effectiveOrder.closedDate)}` : ''}{effectiveOrder.closedBy ? ` by ${effectiveOrder.closedBy}` : ''}.
              </p>
              {effectiveOrder.closureNotes && (
                <p className="text-[11px] italic text-muted-foreground pt-0.5">
                  &ldquo;{effectiveOrder.closureNotes}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Section: Production Receipts matching Screenshot 1 */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Production Receipts
              </h3>

              {effectiveOrder.status === 'IN_PROGRESS' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={pendingQty <= 0 || !hasPostedConsumption}
                  onClick={() => {
                    setEditingDraftReceipt(null)
                    setIsReceiptModalOpen(true)
                  }}
                  className="bg-brand hover:bg-brand-hover text-brand-foreground font-semibold text-xs px-3.5 h-8 rounded-md cursor-pointer shadow-xs disabled:opacity-50"
                  title={
                    !hasPostedConsumption
                      ? 'Cannot record production receipt before raw materials have been consumed.'
                      : pendingQty <= 0
                      ? 'All ordered quantity has already been received.'
                      : 'Receive finished goods into inventory'
                  }
                >
                  <span>Receive Finished Goods</span>
                </Button>
              )}
            </div>

            {/* Receipts Table: Reference | Quantity | Warehouse | Status */}
            <Table>
              <THead>
                <tr>
                  <TH className="py-2.5">Reference</TH>
                    <TH className="py-2.5">Quantity</TH>
                    <TH className="py-2.5">Warehouse</TH>
                    <TH className="py-2.5 text-right">Status</TH>
                  </tr>
                </THead>
                <TBody className="divide-y divide-border/60">
                  {isLoadingReceipts ? (
                    <TR>
                      <TD colSpan={4} className="py-6 text-center text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-foreground" />
                        Loading production receipts...
                      </TD>
                    </TR>
                  ) : receipts.length === 0 ? (
                    <TR>
                      <TD colSpan={4} className="py-6 text-center text-muted-foreground">
                        No production receipts recorded yet.
                      </TD>
                    </TR>
                  ) : (
                    receipts.map((pr) => (
                      <TR
                        key={pr.id}
                        onClick={() => {
                          if (pr.status === 'DRAFT') {
                            setEditingDraftReceipt(pr)
                            setIsReceiptModalOpen(true)
                          }
                        }}
                        className={`hover:bg-secondary/30 transition-colors ${
                          pr.status === 'DRAFT' ? 'cursor-pointer' : ''
                        }`}
                      >
                        <TD className="py-3 px-3.5 font-mono font-medium text-foreground">
                          {pr.receiptNumber}
                        </TD>
                        <TD className="py-3 px-3 font-mono font-medium text-foreground">
                          {formatQuantity(pr.receiptQuantity)} {pr.unitOfMeasure}
                        </TD>
                        <TD className="py-3 px-3 text-muted-foreground font-medium">
                          {pr.receivingWarehouseName}
                        </TD>
                        <TD className="py-3 px-3.5 text-right">
                          {pr.status === 'POSTED' ? (
                            <Badge variant="success" className="h-auto px-2 py-0.5 text-[11px] font-medium">
                              Posted
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="h-auto px-2 py-0.5 text-[11px] font-medium">
                              Draft
                            </Badge>
                          )}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
            </Table>
          </div>

          {/* Warehouses Info */}
          <div className="grid grid-cols-2 gap-4 py-1 border-t border-border/80 pt-2 text-xs">
            <div>
              <span className="text-muted-foreground">Source Warehouse: </span>
              <span className="font-semibold text-foreground">{effectiveOrder.sourceWarehouseName}</span>
              <span className="font-mono text-muted-foreground ml-1.5">({effectiveOrder.sourceWarehouseCode})</span>
            </div>
            <div>
              <span className="text-muted-foreground">Destination Warehouse: </span>
              <span className="font-semibold text-foreground">{effectiveOrder.finishedGoodsWarehouseName}</span>
              <span className="font-mono text-muted-foreground ml-1.5">({effectiveOrder.finishedGoodsWarehouseCode})</span>
            </div>
          </div>

          {/* Section: Materials with Action Buttons matching Screenshot 1 */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Materials
              </h3>

              {/* Action buttons matching Screenshot 1 */}
              <div className="flex items-center gap-2">
                {(effectiveOrder.status === 'RELEASED' || effectiveOrder.status === 'IN_PROGRESS') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingDraftIssue(null)
                      setIsIssueModalOpen(true)
                    }}
                    className="h-8 px-3 text-xs font-medium cursor-pointer"
                  >
                    <span>Issue Materials</span>
                  </Button>
                )}

                {(effectiveOrder.status === 'IN_PROGRESS' || effectiveOrder.status === 'COMPLETED') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasRemainingMaterials}
                    onClick={() => {
                      setEditingDraftReturn(null)
                      setIsReturnModalOpen(true)
                    }}
                    className="h-8 px-3 text-xs font-medium cursor-pointer disabled:opacity-50"
                    title={hasRemainingMaterials ? 'Return unused materials to warehouse' : 'No materials available in production to return'}
                  >
                    <span>Return Materials</span>
                  </Button>
                )}

                {(effectiveOrder.status === 'IN_PROGRESS' || effectiveOrder.status === 'COMPLETED') && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={!hasRemainingMaterials}
                    onClick={() => {
                      setEditingDraftConsumption(null)
                      setIsConsumptionModalOpen(true)
                    }}
                    className="bg-brand hover:bg-brand-hover text-brand-foreground font-semibold text-xs px-3.5 h-8 rounded-md cursor-pointer shadow-xs disabled:opacity-50"
                    title={hasRemainingMaterials ? 'Record consumed materials in manufacturing' : 'No materials remaining in production'}
                  >
                    <span>Record Consumption</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Materials Table matching Screenshot 1: Material | Required | Issued | Consumed | Returned | Remaining */}
            <Table>
              <THead>
                <tr>
                  <TH className="py-2.5">Material</TH>
                    <TH className="py-2.5 text-right">Required</TH>
                    <TH className="py-2.5 text-right">Issued</TH>
                    <TH className="py-2.5 text-right">Consumed</TH>
                    <TH className="py-2.5 text-right">Returned</TH>
                    <TH className="py-2.5 text-right">Remaining</TH>
                  </tr>
                </THead>
                <TBody className="divide-y divide-border/60">
                  {displayItems.length === 0 ? (
                    <TR>
                      <TD colSpan={6} className="py-6 text-center text-muted-foreground">
                        No materials required for this production order
                      </TD>
                    </TR>
                  ) : (
                    displayItems.map((it) => (
                      <TR key={it.materialId} className="hover:bg-secondary/30 transition-colors">
                        <TD className="py-3 px-3.5 font-medium text-foreground">
                          {it.materialName}
                        </TD>
                        <TD className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {formatQuantity(it.requiredQuantity)}
                        </TD>
                        <TD className="py-3 px-3 text-right font-mono text-foreground font-medium">
                          {formatQuantity(it.issuedQuantity)}
                        </TD>
                        <TD className="py-3 px-3 text-right font-mono text-foreground font-medium">
                          {formatQuantity(it.consumedQuantity)}
                        </TD>
                        <TD className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {formatQuantity(it.returnedQuantity)}
                        </TD>
                        <TD className="py-3 px-3.5 text-right font-mono font-medium">
                          <span className={it.remainingQuantity > 0 ? 'text-warning' : 'text-foreground'}>
                            {formatQuantity(it.remainingQuantity)}
                          </span>
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
            </Table>
          </div>

          {/* Section: Material Transaction History matching Screenshot 1 */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Material Transaction History
              </h3>
              {transactions.length > 0 && (
                <span className="text-xs text-muted-foreground font-mono">
                  {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
                </span>
              )}
            </div>

            {isLoadingTransactions ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-foreground" />
                Loading transaction history...
              </div>
            ) : transactions.length === 0 ? (
              /* Empty state matching Screenshot 0 style */
              <div className="flex flex-col items-center justify-center py-8 rounded-md border border-border/80 bg-secondary/20 text-center">
                <Package className="h-8 w-8 text-muted-foreground/60 mb-2 stroke-[1.5]" />
                <p className="text-xs text-muted-foreground">No material transactions recorded yet.</p>
              </div>
            ) : (
              /* Populated transactions list matching Screenshot 1 */
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={`${tx.transactionType}-${tx.id}`}
                    onClick={() => handleTransactionClick(tx)}
                    className="flex items-center justify-between p-3.5 rounded-md border border-border/80 bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary border border-border/80 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium text-foreground">
                          {tx.referenceNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.transactionTypeLabel} · {formatDate(tx.transactionDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {tx.status === 'POSTED' ? (
                        <span className="text-xs font-semibold text-success">
                          Posted
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-warning">
                          Draft
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/80">
            <div>
              {effectiveOrder.status === 'DRAFT' && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(effectiveOrder.id)}
                  className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Draft</span>
                </Button>
              )}
              {effectiveOrder.status !== 'CANCELLED' &&
                effectiveOrder.status !== 'IN_PROGRESS' &&
                effectiveOrder.status !== 'COMPLETED' &&
                effectiveOrder.status !== 'CLOSED' &&
                !hasPostedTransactions &&
                !hasPostedReceipts &&
                onCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel(effectiveOrder.id)}
                  className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Cancel Order</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {effectiveOrder.status === 'DRAFT' && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(effectiveOrder)}
                  className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Draft</span>
                </Button>
              )}

              {effectiveOrder.status === 'DRAFT' && onRelease && (
                <Button
                  size="sm"
                  onClick={() => onRelease(effectiveOrder.id)}
                  className="bg-success text-success-foreground hover:opacity-90 font-semibold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <PackageCheck className="h-4 w-4" />
                  <span>Release Order</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs font-medium cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Material Issue Modal */}
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

      {/* Material Consumption Modal */}
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

      {/* Material Return Modal */}
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

      {/* Receive Finished Goods Modal */}
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

      {/* Close Production Order Modal */}
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
