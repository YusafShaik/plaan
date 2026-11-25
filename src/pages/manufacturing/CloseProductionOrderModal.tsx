import { useState, useEffect } from 'react'
import { X, CheckCircle2, XCircle, RefreshCw, AlertCircle } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { manufacturingService } from '../../services/manufacturingService'
import type {
  ProductionOrder,
  ProductionOrderClosureValidation,
} from '../../types/manufacturing'

export interface CloseProductionOrderModalProps {
  isOpen: boolean
  order: ProductionOrder | null
  onClose: () => void
  onSuccess: () => void
}

export function CloseProductionOrderModal({
  isOpen,
  order,
  onClose,
  onSuccess,
}: CloseProductionOrderModalProps) {
  const [validation, setValidation] = useState<ProductionOrderClosureValidation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [closureNotes, setClosureNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !order) return

    Promise.resolve().then(() => {
      setIsLoading(true)
      setError(null)
      setSuccessMessage(null)
      setClosureNotes('')

      manufacturingService
        .getClosureValidation(order.id)
        .then((res) => {
          setValidation(res)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to validate order closure conditions.')
          setIsLoading(false)
        })
    })
  }, [isOpen, order])

  const formatQuantity = (qty?: number | null) => {
    if (qty === undefined || qty === null || isNaN(qty)) return '0'
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
  }

  const handleCloseOrder = async () => {
    if (!order || !validation?.canClose) return

    setIsSubmitting(true)
    setError(null)
    try {
      await manufacturingService.closeProductionOrder(order.id, {
        closureNotes: closureNotes.trim() || undefined,
      })
      setSuccessMessage('Production order closed successfully.')
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to close production order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !order) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[700px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-4">
        {/* Header matching Screenshot 0 */}
        <div className="flex items-start justify-between pb-3 border-b border-border/80">
          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Close Production Order
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review all production transactions before closing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-muted-foreground">
              {order.orderNumber}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-[10px] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{successMessage}</p>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-foreground" />
            Evaluating closure conditions...
          </div>
        ) : validation ? (
          <div className="space-y-4">
            {/* Production summary matching Screenshot 0 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2.5">
                Production summary
              </h3>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-muted-foreground">Planned quantity</span>{' '}
                  <span className="font-semibold text-foreground font-mono ml-2">
                    {formatQuantity(validation.plannedQuantity)} {validation.unitOfMeasure}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Received quantity</span>{' '}
                  <span className="font-semibold text-foreground font-mono ml-2">
                    {formatQuantity(validation.receivedQuantity)} {validation.unitOfMeasure}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-border/80 pt-1" />

            {/* Material reconciliation table matching Screenshot 0 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2.5">
                Material reconciliation
              </h3>

              <div className="overflow-x-auto rounded-[10px] border border-border/80 bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                      <th className="py-2.5 px-3.5">Material</th>
                      <th className="py-2.5 px-3 text-right">Issued</th>
                      <th className="py-2.5 px-3 text-right">Consumed</th>
                      <th className="py-2.5 px-3 text-right">Returned</th>
                      <th className="py-2.5 px-3.5 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {validation.materials.map((mat) => (
                      <tr key={mat.materialId} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-3.5 font-medium text-foreground">
                          {mat.materialName}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {formatQuantity(mat.issuedQuantity)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {formatQuantity(mat.consumedQuantity)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {formatQuantity(mat.returnedQuantity)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold">
                          <span className={mat.remainingQuantity > 0 ? 'text-red-500' : 'text-foreground'}>
                            {formatQuantity(mat.remainingQuantity)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-border/80 pt-1" />

            {/* Closure validation checklist matching Screenshot 0 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2.5">
                Closure validation
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5">
                  {validation.productionCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className={validation.productionCompleted ? 'text-foreground' : 'text-muted-foreground'}>
                    Production completed
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {validation.allPlannedQuantitiesReceived ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className={validation.allPlannedQuantitiesReceived ? 'text-foreground' : 'text-muted-foreground'}>
                    All planned quantities received
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {validation.allMaterialsReconciled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className={validation.allMaterialsReconciled ? 'text-foreground' : 'text-muted-foreground'}>
                    All issued materials reconciled
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {validation.noPendingDraftTransactions ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className={validation.noPendingDraftTransactions ? 'text-foreground' : 'text-muted-foreground'}>
                    No pending draft transactions
                  </span>
                </div>
              </div>

              {!validation.canClose && (
                <p className="mt-3 text-xs text-red-400 font-medium">
                  Resolve outstanding transactions before closing.
                </p>
              )}
            </div>

            {/* Closure Notes */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Closure Notes
              </label>
              <textarea
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="Optional closure notes..."
                rows={3}
                className="flex w-full rounded-[10px] border border-border/80 bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
              />
            </div>
          </div>
        ) : null}

        {/* Footer Actions matching Screenshot 0 */}
        <div className="flex items-center justify-end pt-3 border-t border-border/80 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCloseOrder}
            disabled={!validation?.canClose || isSubmitting}
            className={
              validation?.canClose
                ? 'bg-[#107048] hover:bg-[#0d603e] text-white font-semibold text-xs px-4 h-9 rounded-[8px] cursor-pointer shadow-xs'
                : 'bg-secondary/60 text-muted-foreground opacity-60 cursor-not-allowed text-xs px-4 h-9 rounded-[8px]'
            }
          >
            {isSubmitting ? 'Closing Order...' : 'Close Order'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
