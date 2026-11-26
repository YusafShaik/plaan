import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { DateField } from '../../components/ui/DateField'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { cn } from '../../lib/cn'
import { qualityService } from '../../services/qualityService'
import type {
  FinishedGoodsInspection,
  InspectionParameterResult,
} from '../../types/quality'

export interface FinishedGoodsInspectionFormProps {
  isOpen: boolean
  inspectionId: number | null
  onClose: () => void
  onCompleted: () => void
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatQty(qty: number) {
  if (qty % 1 === 0) return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
}

function statusBadge(status: FinishedGoodsInspection['status']) {
  if (status === 'COMPLETED') return <Badge variant="success">Completed</Badge>
  if (status === 'DRAFT') return <Badge variant="info">Draft</Badge>
  return <Badge variant="warning">Pending</Badge>
}

export function FinishedGoodsInspectionForm({
  isOpen,
  inspectionId,
  onClose,
  onCompleted,
}: FinishedGoodsInspectionFormProps) {
  const [inspection, setInspection] = useState<FinishedGoodsInspection | null>(null)
  const [inspectionDate, setInspectionDate] = useState(todayIso())
  const [acceptedQty, setAcceptedQty] = useState('')
  const [remarks, setRemarks] = useState('')
  const [results, setResults] = useState<Record<number, InspectionParameterResult | null>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || inspectionId == null) {
      setInspection(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    qualityService
      .getFinishedGoodsInspectionById(inspectionId)
      .then((data) => {
        setInspection(data)
        setInspectionDate(data.inspectionDate ?? todayIso())
        const accepted =
          data.acceptedQuantity != null ? data.acceptedQuantity : data.receivedQuantity
        setAcceptedQty(String(accepted))
        setRemarks(data.remarks ?? '')
        const map: Record<number, InspectionParameterResult | null> = {}
        data.parameters.forEach((p) => {
          map[p.id] = p.result
        })
        setResults(map)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load inspection.')
        setIsLoading(false)
      })
  }, [isOpen, inspectionId])

  const received = inspection?.receivedQuantity ?? 0
  const acceptedNum = Number(acceptedQty)
  const rejectedNum = useMemo(() => {
    if (!Number.isFinite(acceptedNum)) return 0
    return Math.max(0, received - acceptedNum)
  }, [acceptedNum, received])

  const readOnly = inspection?.status === 'COMPLETED'

  const buildPayload = (complete: boolean) => ({
    inspectionDate: inspectionDate || null,
    acceptedQuantity: Number.isFinite(acceptedNum) ? acceptedNum : null,
    remarks: remarks.trim() || null,
    complete,
    parameterResults: Object.entries(results).map(([parameterId, result]) => ({
      parameterId: Number(parameterId),
      result,
    })),
  })

  const handleSaveDraft = async () => {
    if (!inspection || readOnly) return
    setIsSaving(true)
    setError(null)
    try {
      const updated = await qualityService.updateFinishedGoodsInspection(
        inspection.id,
        buildPayload(false)
      )
      setInspection(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save draft.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!inspection || readOnly) return
    setIsSaving(true)
    setError(null)
    try {
      await qualityService.completeFinishedGoodsInspection(inspection.id, buildPayload(true))
      onCompleted()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete inspection.')
      setIsSaving(false)
    }
  }

  const acceptedPct =
    received > 0 && Number.isFinite(acceptedNum)
      ? Math.min(100, Math.max(0, (acceptedNum / received) * 100))
      : 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[720px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <p className="mt-3 text-xs text-muted-foreground">Loading inspection...</p>
        </div>
      ) : !inspection ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-foreground">Finished Goods Inspection</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-3.5">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                Quality / Finished Goods Inspections / {inspection.inspectionNumber}
              </p>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Finished Goods Inspection
                </h2>
                {statusBadge(inspection.status)}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <MetaRow label="Inspection Number" value={inspection.inspectionNumber} mono />
            <MetaRow label="Production Order" value={inspection.productionOrderNumber} mono />
            <MetaRow label="Production Receipt" value={inspection.productionReceiptNumber} mono />
            <MetaRow label="Item" value={inspection.itemName} />
            <MetaRow label="Warehouse" value={inspection.warehouseName} />
            <MetaRow
              label="Received Quantity"
              value={`${formatQty(inspection.receivedQuantity)} ${inspection.unitOfMeasure}`}
            />
          </div>

          <DateField
            label="Inspection Date"
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
            disabled={readOnly || isSaving}
          />

          <section className="space-y-3 border-t border-border/80 pt-4">
            <h3 className="text-sm font-semibold text-foreground">Inspection Parameters</h3>
            <div className="space-y-3">
              {inspection.parameters.map((param) => (
                <div
                  key={param.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-border/80 bg-card px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{param.parameterName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{param.acceptanceCriteria}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(['PASS', 'FAIL'] as const).map((opt) => {
                      const selected = results[param.id] === opt
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={readOnly || isSaving}
                          onClick={() =>
                            setResults((prev) => ({ ...prev, [param.id]: opt }))
                          }
                          className={cn(
                            'px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
                            selected
                              ? opt === 'PASS'
                                ? 'bg-success-soft text-success border-success/30'
                                : 'bg-destructive-soft text-destructive border-destructive/30'
                              : 'bg-secondary text-muted-foreground border-border/80 hover:text-foreground'
                          )}
                        >
                          {opt === 'PASS' ? 'Pass' : 'Fail'}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 border-t border-border/80 pt-4">
            <h3 className="text-sm font-semibold text-foreground">Inspection Result</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Accepted Quantity *"
                type="number"
                min={0}
                max={received}
                step="any"
                value={acceptedQty}
                onChange={(e) => setAcceptedQty(e.target.value)}
                disabled={readOnly || isSaving}
              />
              <Input label="Rejected Quantity" value={formatQty(rejectedNum)} disabled />
            </div>
            <div className="w-full">
              <div className="group relative flex min-h-[5.5rem] w-full flex-col justify-start px-3.5 py-2 rounded-md border bg-secondary border-border/80">
                <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
                  Remarks
                </span>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={readOnly || isSaving}
                  placeholder="Required when quantity is rejected or a parameter fails"
                  className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="rounded-md border border-border/80 bg-card px-4 py-4 space-y-3">
              <div className="flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Accepted</p>
                  <p className="text-lg font-semibold text-success tabular-nums">
                    {formatQty(Number.isFinite(acceptedNum) ? Math.max(0, acceptedNum) : 0)}{' '}
                    {inspection.unitOfMeasure}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground font-medium">Rejected</p>
                  <p className="text-lg font-semibold text-destructive tabular-nums">
                    {formatQty(rejectedNum)} {inspection.unitOfMeasure}
                  </p>
                </div>
              </div>
              <div className="h-2 w-full rounded-md bg-destructive overflow-hidden flex">
                <div
                  className="h-full bg-success transition-all duration-200"
                  style={{ width: `${acceptedPct}%` }}
                />
              </div>
            </div>
          </section>

          {!readOnly && (
            <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button type="button" variant="primary" onClick={handleComplete} disabled={isSaving}>
                {isSaving ? 'Completing...' : 'Complete Inspection'}
              </Button>
            </div>
          )}

          {readOnly && inspection.inspectedByName && (
            <p className="text-xs text-muted-foreground border-t border-border/80 pt-4">
              Inspected by {inspection.inspectedByName}
              {inspection.inspectionDate ? ` on ${inspection.inspectionDate}` : ''}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-sm font-medium text-foreground', mono && 'text-ref')}>
        {value}
      </p>
    </div>
  )
}
