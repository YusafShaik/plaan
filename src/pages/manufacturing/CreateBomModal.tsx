import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, PackageCheck, AlertCircle } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { manufacturingService } from '../../services/manufacturingService'
import { masterDataService } from '../../services/masterDataService'
import { toast } from '../../lib/feedback'
import type { Item } from '../../types/masterData'
import type { Bom, BomItemPayload } from '../../types/manufacturing'

export interface CreateBomModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialDraft?: Bom | null
}

interface ComponentRowState {
  id: string
  materialId: number | null
  quantity: string | number
  unitOfMeasure: string
}

export function CreateBomModal({
  isOpen,
  onClose,
  onSuccess,
  initialDraft,
}: CreateBomModalProps) {
  const [bomCode, setBomCode] = useState('BOM-...')
  const [productId, setProductId] = useState<number | null>(null)
  const [outputQuantity, setOutputQuantity] = useState<string | number>(1)
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ComponentRowState[]>([
    { id: 'row-1', materialId: null, quantity: '', unitOfMeasure: '' },
  ])

  const [items, setItems] = useState<Item[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setProductId(null)
    setOutputQuantity(1)
    setNotes('')
    setError(null)
    setRows([{ id: `row-${Date.now()}`, materialId: null, quantity: '', unitOfMeasure: '' }])
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return

    if (!initialDraft) {
      manufacturingService
        .getNextBomCode()
        .then((res) => setBomCode(res.nextCode))
        .catch(console.error)

      Promise.resolve().then(resetForm)
    } else {
      Promise.resolve().then(() => {
        setError(null)
        setBomCode(initialDraft.bomCode)
        setProductId(initialDraft.productId)
        setOutputQuantity(initialDraft.outputQuantity)
        setNotes(initialDraft.notes || '')
        setRows(
          initialDraft.items.map((it) => ({
            id: `item-${it.id}`,
            materialId: it.materialId,
            quantity: it.quantity,
            unitOfMeasure: it.unitOfMeasure,
          }))
        )
      })
    }

    masterDataService
      .getItems({ active: true, size: 200 })
      .then((res) => setItems(res.content))
      .catch(console.error)
  }, [isOpen, initialDraft])

  const selectedProduct = useMemo(
    () => items.find((i) => i.id === productId) || null,
    [items, productId]
  )

  const selectedMaterialIds = useMemo(
    () => new Set(rows.map((r) => r.materialId).filter((id): id is number => id !== null)),
    [rows]
  )

  const handleSelectMaterial = (rowId: string, materialIdStr: string) => {
    const id = materialIdStr ? Number(materialIdStr) : null
    const item = id !== null ? items.find((i) => i.id === id) : undefined
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              materialId: id,
              unitOfMeasure: item?.unitOfMeasure ?? '',
            }
          : r
      )
    )
  }

  const handleQuantityChange = (rowId: string, val: string) => {
    if (val !== '' && Number(val) < 0) return
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, quantity: val } : r)))
  }

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        materialId: null,
        quantity: '',
        unitOfMeasure: '',
      },
    ])
  }

  const handleRemoveRow = (rowId: string) => {
    if (rows.length === 1) {
      setRows([{ id: `row-${Date.now()}`, materialId: null, quantity: '', unitOfMeasure: '' }])
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId))
  }

  const validate = (saveAndActivate: boolean): string | null => {
    if (!productId) return 'Please select a product.'
    if (outputQuantity === '' || Number(outputQuantity) <= 0) {
      return 'Output quantity must be greater than zero.'
    }

    const validRows = rows.filter((r) => r.materialId !== null)
    if (saveAndActivate && validRows.length === 0) {
      return 'At least one component material is required to activate a BOM.'
    }

    for (const r of validRows) {
      if (r.materialId === productId) {
        return `The output product (${selectedProduct?.name}) cannot be its own component material.`
      }
    }

    const seen = new Set<number>()
    for (const r of validRows) {
      if (seen.has(r.materialId!)) {
        const mat = items.find((i) => i.id === r.materialId)
        return `Duplicate component material: ${mat?.name || 'Material'}.`
      }
      seen.add(r.materialId!)
    }

    for (const r of validRows) {
      if (r.quantity === '' || Number(r.quantity) <= 0) {
        const mat = items.find((i) => i.id === r.materialId)
        return `Quantity for "${mat?.name || 'component'}" must be greater than zero.`
      }
    }

    return null
  }

  const handleSubmit = async (saveAndActivate: boolean) => {
    const valError = validate(saveAndActivate)
    if (valError) {
      setError(valError)
      return
    }

    const validRows = rows.filter((r) => r.materialId !== null && Number(r.quantity) > 0)

    try {
      setIsSubmitting(true)
      setError(null)

      const payloadItems: BomItemPayload[] = validRows.map((r) => ({
        materialId: r.materialId!,
        quantity: Number(r.quantity),
      }))

      if (initialDraft) {
        await manufacturingService.updateBom(initialDraft.id, {
          productId: productId!,
          outputQuantity: Number(outputQuantity),
          notes: notes.trim() || undefined,
          saveAndActivate,
          items: payloadItems,
        })
      } else {
        await manufacturingService.createBom({
          bomCode:
            bomCode.startsWith('BOM-') && !bomCode.includes('...') ? bomCode : undefined,
          productId: productId!,
          outputQuantity: Number(outputQuantity),
          notes: notes.trim() || undefined,
          saveAndActivate,
          items: payloadItems,
        })
      }

      toast.success(
        saveAndActivate
          ? 'Bill of materials saved and activated.'
          : 'Draft bill of materials saved.'
      )
      onSuccess()
      resetForm()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving BOM.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCount = rows.filter((r) => r.materialId !== null).length

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="!max-w-[760px] max-h-[90vh] overflow-y-auto p-5 sm:p-6"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {initialDraft
                ? `Edit bill of materials (${bomCode})`
                : 'Create bill of materials'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Define finished product batch output and required component materials.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            title="Close"
          >
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
              <span className="text-xs font-medium text-muted-foreground leading-none">
                BOM code
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {bomCode}
                </span>
                <span className="text-xs text-muted-foreground">Auto</span>
              </div>
            </div>

            <Select
              label="Product *"
              value={productId ?? ''}
              onChange={(val) => setProductId(val ? Number(val) : null)}
              disabled={isSubmitting}
              placeholder="Select product..."
              options={items.map((it) => ({
                value: it.id,
                label: `${it.name} (${it.itemCode})`,
              }))}
            />

            <Input
              label="Output quantity *"
              type="number"
              min="0.0001"
              step="any"
              placeholder="1"
              value={outputQuantity}
              onChange={(e) => {
                const val = e.target.value
                if (val !== '' && Number(val) < 0) return
                setOutputQuantity(val)
              }}
              disabled={isSubmitting}
            />

            <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
              <span className="text-xs font-medium text-muted-foreground leading-none">
                UOM
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-medium uppercase text-foreground">
                  {selectedProduct ? selectedProduct.unitOfMeasure : '—'}
                </span>
                <span className="text-xs text-muted-foreground">From product</span>
              </div>
            </div>
          </div>
        </div>

        {/* Component Materials Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Component materials
            </span>
            {!productId && (
              <span className="text-xs text-muted-foreground">
                Select an output product above
              </span>
            )}
          </div>

          <div className="rounded-md border border-border/80 overflow-hidden bg-card">
            <Table className="border-0 rounded-none" tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="py-2.5 w-[56%]">Material</TH>
                  <TH className="py-2.5 w-[20%] text-right">Quantity</TH>
                  <TH className="py-2.5 w-[16%] pl-4">UOM</TH>
                  <TH className="py-2.5 w-[8%]" />
                </tr>
              </THead>
              <TBody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <TR key={row.id}>
                    <TD className="py-2.5 px-3">
                      <NativeSelect
                        dense
                        value={row.materialId !== null ? String(row.materialId) : ''}
                        onChange={(e) => handleSelectMaterial(row.id, e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">Select material...</option>
                        {items
                          .filter((it) => it.id !== productId)
                          .map((it) => {
                            const usedElsewhere =
                              selectedMaterialIds.has(it.id) && row.materialId !== it.id
                            return (
                              <option
                                key={it.id}
                                value={it.id}
                                disabled={usedElsewhere}
                              >
                                {it.name} ({it.itemCode})
                                {usedElsewhere ? ' — (Added)' : ''}
                              </option>
                            )
                          })}
                      </NativeSelect>
                    </TD>

                    <TD className="py-2.5 px-2.5">
                      <input
                        type="number"
                        min="0.0001"
                        step="any"
                        placeholder="0"
                        value={row.quantity}
                        onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                        disabled={isSubmitting}
                        className="h-9 w-full rounded-md border border-border bg-card px-2.5 py-1 text-right text-xs tabular-nums font-medium text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                      />
                    </TD>

                    <TD className="py-2.5 pl-4 text-xs text-muted-foreground uppercase">
                      {row.unitOfMeasure || '—'}
                    </TD>

                    <TD className="py-2.5 px-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length <= 1 && !row.materialId}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                        title="Remove material"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <div className="p-2.5 border-t border-border/60 bg-surface-subtle dark:bg-secondary/20 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                disabled={isSubmitting}
              >
                <Plus className="h-3.5 w-3.5" />
                Add material
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {selectedCount} {selectedCount === 1 ? 'material' : 'materials'} selected
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="flex min-h-14 w-full flex-col rounded-md border border-border bg-card px-3.5 py-2 focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
          <span className="text-xs font-medium text-muted-foreground leading-none">
            Notes &amp; manufacturing instructions
          </span>
          <textarea
            rows={2}
            placeholder="Optional assembly steps or process notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            className="mt-1 w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
          >
            Save draft
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
          >
            <PackageCheck className="h-3.5 w-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Save & activate'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
