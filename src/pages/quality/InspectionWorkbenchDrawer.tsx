import { useEffect, useMemo, useState } from 'react'
import { CheckCheck } from 'lucide-react'
import { Drawer, DrawerCloseButton } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { DateField } from '../../components/ui/DateField'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { cn } from '../../lib/cn'
import { toast } from '../../lib/feedback'
import { formatQuantity, formatShortDate } from '../../lib/format'
import type {
  InspectionParameterResult,
  IncomingInspectionParameterResultPayload,
} from '../../types/quality'

export type InspectionWorkbenchStatus = 'PENDING' | 'DRAFT' | 'COMPLETED'

export interface InspectionWorkbenchParameter {
  id: number
  parameterName: string
  acceptanceCriteria: string
  result: InspectionParameterResult | null
}

export interface InspectionWorkbenchRecord {
  id: number
  inspectionNumber: string
  status: InspectionWorkbenchStatus
  receivedQuantity: number
  unitOfMeasure: string
  inspectionDate: string | null
  acceptedQuantity: number | null
  remarks: string | null
  inspectedByName: string | null
  parameters: InspectionWorkbenchParameter[]
}

export interface InspectionMetaItem {
  label: string
  value: string
  mono?: boolean
}

export interface InspectionSavePayload {
  inspectionDate: string | null
  acceptedQuantity: number | null
  remarks: string | null
  complete: boolean
  parameterResults: IncomingInspectionParameterResultPayload[]
}

export interface InspectionWorkbenchDrawerProps<T extends InspectionWorkbenchRecord> {
  isOpen: boolean
  inspectionId: number | null
  title: string
  fetchById: (id: number) => Promise<T>
  saveDraft: (id: number, payload: InspectionSavePayload) => Promise<T>
  completeInspection: (id: number, payload: InspectionSavePayload) => Promise<T>
  getMetaItems: (record: T) => InspectionMetaItem[]
  onClose: () => void
  onCompleted: () => void
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function statusBadge(status: InspectionWorkbenchStatus) {
  if (status === 'COMPLETED') return <Badge variant="success">Completed</Badge>
  if (status === 'DRAFT') return <Badge variant="neutral">Draft</Badge>
  return <Badge variant="warning">Pending</Badge>
}

export function InspectionWorkbenchDrawer<T extends InspectionWorkbenchRecord>({
  isOpen,
  inspectionId,
  title,
  fetchById,
  saveDraft,
  completeInspection,
  getMetaItems,
  onClose,
  onCompleted,
}: InspectionWorkbenchDrawerProps<T>) {
  const [inspection, setInspection] = useState<T | null>(null)
  const [inspectionDate, setInspectionDate] = useState(todayIso())
  const [acceptedQty, setAcceptedQty] = useState('')
  const [remarks, setRemarks] = useState('')
  const [results, setResults] = useState<Record<number, InspectionParameterResult | null>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    Promise.resolve().then(() => {
      if (!mounted) return
      if (!isOpen || inspectionId == null) {
        setInspection(null)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)
      fetchById(inspectionId)
        .then((data) => {
          if (!mounted) return
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
          if (!mounted) return
          setError(err instanceof Error ? err.message : 'Failed to load inspection.')
          setIsLoading(false)
        })
    })

    return () => {
      mounted = false
    }
  }, [isOpen, inspectionId, fetchById])

  const received = inspection?.receivedQuantity ?? 0
  const acceptedNum = Number(acceptedQty)
  const rejectedNum = useMemo(() => {
    if (!Number.isFinite(acceptedNum)) return 0
    return Math.max(0, received - acceptedNum)
  }, [acceptedNum, received])

  const readOnly = inspection?.status === 'COMPLETED'

  const buildPayload = (complete: boolean): InspectionSavePayload => ({
    inspectionDate: inspectionDate || null,
    acceptedQuantity: Number.isFinite(acceptedNum) ? acceptedNum : null,
    remarks: remarks.trim() || null,
    complete,
    parameterResults: Object.entries(results).map(([parameterId, result]) => ({
      parameterId: Number(parameterId),
      result,
    })),
  })

  const handleMarkAllPass = () => {
    if (!inspection || readOnly || isSaving) return
    const next: Record<number, InspectionParameterResult | null> = {}
    inspection.parameters.forEach((p) => {
      next[p.id] = 'PASS'
    })
    setResults(next)
  }

  const handleSaveDraft = async () => {
    if (!inspection || readOnly) return
    setIsSaving(true)
    setError(null)
    try {
      const updated = await saveDraft(inspection.id, buildPayload(false))
      setInspection(updated)
      toast.success(`Inspection ${updated.inspectionNumber} saved as draft`)
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
      await completeInspection(inspection.id, buildPayload(true))
      toast.success(`Inspection ${inspection.inspectionNumber} completed`)
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
    <Drawer isOpen={isOpen} onClose={onClose} width="lg">
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <p className="mt-3 text-xs text-muted-foreground">Loading inspection...</p>
        </div>
      ) : !inspection ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <DrawerCloseButton onClick={onClose} />
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="tabular-nums text-xl font-semibold tracking-tight text-foreground">
                  {inspection.inspectionNumber}
                </h2>
                {statusBadge(inspection.status)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{title}</p>
            </div>
            <DrawerCloseButton onClick={onClose} />
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-3 rounded-md border border-border/80 bg-surface-subtle p-3.5">
            {getMetaItems(inspection).map((meta) => (
              <div key={meta.label} className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{meta.label}</p>
                <p
                  className={cn(
                    'mt-0.5 text-sm font-medium text-foreground truncate',
                    meta.mono && 'tabular-nums'
                  )}
                >
                  {meta.value}
                </p>
              </div>
            ))}
          </div>

          <DateField
            label="Inspection date"
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
            disabled={readOnly || isSaving}
          />

          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Inspection parameters</h3>
              {!readOnly && inspection.parameters.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllPass}
                  disabled={isSaving}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all pass
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {inspection.parameters.map((param) => (
                <div
                  key={param.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-border/80 bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{param.parameterName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {param.acceptanceCriteria}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
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
                            'h-8 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
                            selected
                              ? opt === 'PASS'
                                ? 'bg-success-soft text-success border-success/30'
                                : 'bg-destructive-soft text-destructive border-destructive/30'
                              : 'bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary/50'
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
            <h3 className="text-sm font-semibold text-foreground">Inspection result</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Accepted quantity *"
                type="number"
                min={0}
                max={received}
                step="any"
                value={acceptedQty}
                onChange={(e) => setAcceptedQty(e.target.value)}
                disabled={readOnly || isSaving}
              />
              <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/80 bg-secondary px-3.5 py-2">
                <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                  Rejected quantity
                </span>
                <span className="tabular-nums text-sm font-medium text-foreground">
                  {formatQuantity(rejectedNum)}
                </span>
              </div>
            </div>

            <div className="group flex min-h-[76px] w-full flex-col justify-start px-3.5 py-2 rounded-md border border-border/80 bg-card focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
              <span className="text-xs font-medium text-muted-foreground select-none leading-none mb-1.5">
                Remarks
              </span>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={readOnly || isSaving}
                placeholder="Required when quantity is rejected or a parameter fails"
                className="w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
              />
            </div>

            <div className="rounded-md border border-border/80 bg-surface-subtle px-4 py-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Accepted</p>
                  <p className="text-base font-semibold text-success tabular-nums">
                    {formatQuantity(Number.isFinite(acceptedNum) ? Math.max(0, acceptedNum) : 0)}{' '}
                    {inspection.unitOfMeasure}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground">Rejected</p>
                  <p
                    className={cn(
                      'text-base font-semibold tabular-nums',
                      rejectedNum > 0 ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {formatQuantity(rejectedNum)} {inspection.unitOfMeasure}
                  </p>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-md bg-destructive/20 overflow-hidden flex">
                <div
                  className="h-full bg-success transition-all duration-200"
                  style={{ width: `${acceptedPct}%` }}
                />
                {rejectedNum > 0 && (
                  <div
                    className="h-full bg-destructive transition-all duration-200"
                    style={{ width: `${100 - acceptedPct}%` }}
                  />
                )}
              </div>
            </div>
          </section>

          {!readOnly ? (
            <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save draft'}
              </Button>
              <Button type="button" variant="primary" onClick={handleComplete} disabled={isSaving}>
                {isSaving ? 'Completing...' : 'Complete inspection'}
              </Button>
            </div>
          ) : (
            inspection.inspectedByName && (
              <p className="text-xs text-muted-foreground border-t border-border/80 pt-4">
                Inspected by {inspection.inspectedByName}
                {inspection.inspectionDate
                  ? ` on ${formatShortDate(inspection.inspectionDate)}`
                  : ''}
              </p>
            )
          )}
        </div>
      )}
    </Drawer>
  )
}
