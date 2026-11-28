import { useState, useEffect, useMemo } from 'react'
import { X, PackageCheck, AlertCircle } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateField } from '../../components/ui/DateField'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { manufacturingService } from '../../services/manufacturingService'
import { masterDataService } from '../../services/masterDataService'
import { formatQuantity } from '../../lib/format'
import { toast } from '../../lib/feedback'
import type { Item, Warehouse } from '../../types/masterData'
import type {
  ProductionOrder,
  ProductionOrderItem,
} from '../../types/manufacturing'

export interface CreateProductionOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialDraft?: ProductionOrder | null
}

export function CreateProductionOrderModal({
  isOpen,
  onClose,
  onSuccess,
  initialDraft,
}: CreateProductionOrderModalProps) {
  const [orderNumber, setOrderNumber] = useState('MO-...')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [productId, setProductId] = useState<number | null>(null)
  const [productionQuantity, setProductionQuantity] = useState<string | number>(10)
  const [plannedStartDate, setPlannedStartDate] = useState('')
  const [plannedEndDate, setPlannedEndDate] = useState('')
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number | null>(null)
  const [finishedGoodsWarehouseId, setFinishedGoodsWarehouseId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')

  const [activeBomCode, setActiveBomCode] = useState<string | null>(null)
  const [requiredItems, setRequiredItems] = useState<ProductionOrderItem[]>([])
  const [bomError, setBomError] = useState<string | null>(null)

  const [items, setItems] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setOrderDate(new Date().toISOString().split('T')[0])
    setProductId(null)
    setProductionQuantity(10)
    setPlannedStartDate('')
    setPlannedEndDate('')
    setNotes('')
    setActiveBomCode(null)
    setRequiredItems([])
    setBomError(null)
    setError(null)
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return

    masterDataService
      .getItems({ active: true, size: 200 })
      .then((res) => setItems(res.content))
      .catch(console.error)

    masterDataService
      .getWarehouses({ active: true, size: 100 })
      .then((res) => {
        setWarehouses(res.content)
        if (!initialDraft && res.content.length > 0) {
          Promise.resolve().then(() => {
            setSourceWarehouseId(res.content[0].id)
            setFinishedGoodsWarehouseId(
              res.content.length > 1 ? res.content[1].id : res.content[0].id
            )
          })
        }
      })
      .catch(console.error)

    if (!initialDraft) {
      manufacturingService
        .getNextProductionOrderNumber()
        .then((res) => setOrderNumber(res.nextCode))
        .catch(console.error)

      Promise.resolve().then(resetForm)
    } else {
      Promise.resolve().then(() => {
        setError(null)
        setOrderNumber(initialDraft.orderNumber)
        setOrderDate(initialDraft.orderDate)
        setProductId(initialDraft.productId)
        setProductionQuantity(initialDraft.productionQuantity)
        setPlannedStartDate(initialDraft.plannedStartDate || '')
        setPlannedEndDate(initialDraft.plannedEndDate || '')
        setSourceWarehouseId(initialDraft.sourceWarehouseId)
        setFinishedGoodsWarehouseId(initialDraft.finishedGoodsWarehouseId)
        setNotes(initialDraft.notes || '')
        setActiveBomCode(initialDraft.bomCode)
        setRequiredItems(initialDraft.items)
        setBomError(null)
      })
    }
  }, [isOpen, initialDraft])

  useEffect(() => {
    if (!productId || productionQuantity === '' || Number(productionQuantity) <= 0) {
      if (!initialDraft) {
        Promise.resolve().then(() => {
          setActiveBomCode(null)
          setRequiredItems([])
          setBomError(null)
        })
      }
      return
    }

    manufacturingService
      .previewRequirements(productId, Number(productionQuantity))
      .then((res) => {
        setActiveBomCode(res.bomCode)
        setRequiredItems(res.items)
        setBomError(null)
      })
      .catch((err: unknown) => {
        setActiveBomCode(null)
        setRequiredItems([])
        setBomError(
          err instanceof Error
            ? err.message
            : 'No active bill of materials found for this product.'
        )
      })
  }, [productId, productionQuantity, initialDraft])

  const selectedProduct = useMemo(
    () => items.find((i) => i.id === productId) || null,
    [items, productId]
  )

  const validate = (): string | null => {
    if (!productId) return 'Please select a product to manufacture.'
    if (bomError || !activeBomCode) {
      return bomError || 'The selected product does not have an active bill of materials.'
    }
    if (productionQuantity === '' || Number(productionQuantity) <= 0) {
      return 'Production quantity must be greater than zero.'
    }
    if (!sourceWarehouseId) {
      return 'Please select a source warehouse for material issuance.'
    }
    if (!finishedGoodsWarehouseId) {
      return 'Please select a finished goods warehouse.'
    }
    if (plannedStartDate && plannedEndDate && plannedEndDate < plannedStartDate) {
      return 'Planned end date cannot precede planned start date.'
    }
    if (requiredItems.length === 0) {
      return 'The active BOM contains no component materials.'
    }
    return null
  }

  const handleSubmit = async (releaseImmediately: boolean) => {
    const valError = validate()
    if (valError) {
      setError(valError)
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      if (initialDraft) {
        await manufacturingService.updateProductionOrder(initialDraft.id, {
          orderDate,
          productId: productId!,
          productionQuantity: Number(productionQuantity),
          plannedStartDate: plannedStartDate || undefined,
          plannedEndDate: plannedEndDate || undefined,
          sourceWarehouseId: sourceWarehouseId!,
          finishedGoodsWarehouseId: finishedGoodsWarehouseId!,
          notes: notes.trim() || undefined,
          releaseImmediately,
        })
      } else {
        await manufacturingService.createProductionOrder({
          orderNumber:
            orderNumber.startsWith('MO-') && !orderNumber.includes('...')
              ? orderNumber
              : undefined,
          orderDate,
          productId: productId!,
          productionQuantity: Number(productionQuantity),
          plannedStartDate: plannedStartDate || undefined,
          plannedEndDate: plannedEndDate || undefined,
          sourceWarehouseId: sourceWarehouseId!,
          finishedGoodsWarehouseId: finishedGoodsWarehouseId!,
          notes: notes.trim() || undefined,
          releaseImmediately,
        })
      }

      toast.success(
        releaseImmediately
          ? 'Production order released for manufacturing.'
          : 'Draft production order saved.'
      )
      onSuccess()
      resetForm()
      onClose()
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An error occurred while saving production order.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

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
                ? `Edit production order (${orderNumber})`
                : 'Create production order'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Plan manufacturing output, material warehouses, and schedule.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        {bomError && (
          <div className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{bomError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
            <span className="text-xs font-medium text-muted-foreground leading-none">
              Production order number
            </span>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-medium tabular-nums text-foreground">
                {orderNumber}
              </span>
              <span className="text-xs text-muted-foreground">Auto</span>
            </div>
          </div>

          <DateField
            label="Order date *"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            disabled={isSubmitting}
          />

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

          <div className="flex min-h-14 w-full flex-col justify-center rounded-md border border-border/70 bg-secondary px-3.5 py-2 select-none">
            <span className="text-xs font-medium text-muted-foreground leading-none">
              Bill of materials
            </span>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-sm font-medium tabular-nums text-foreground truncate">
                {activeBomCode || (selectedProduct ? 'No active BOM' : '—')}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {activeBomCode ? 'Active recipe' : 'Requires BOM'}
              </span>
            </div>
          </div>

          <Input
            label="Production quantity *"
            type="number"
            min="0.0001"
            step="any"
            placeholder="10"
            value={productionQuantity}
            onChange={(e) => {
              const val = e.target.value
              if (val !== '' && Number(val) < 0) return
              setProductionQuantity(val)
            }}
            disabled={isSubmitting}
            rightElement={
              selectedProduct ? (
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {selectedProduct.unitOfMeasure}
                </span>
              ) : undefined
            }
          />

          <div className="grid grid-cols-2 gap-2.5">
            <DateField
              label="Planned start"
              value={plannedStartDate}
              onChange={(e) => setPlannedStartDate(e.target.value)}
              disabled={isSubmitting}
            />
            <DateField
              label="Planned end"
              value={plannedEndDate}
              onChange={(e) => setPlannedEndDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Select
            label="Source warehouse *"
            value={sourceWarehouseId ?? ''}
            onChange={(val) => setSourceWarehouseId(val ? Number(val) : null)}
            disabled={isSubmitting}
            placeholder="Select source warehouse..."
            options={warehouses.map((w) => ({
              value: w.id,
              label: `${w.name} (${w.warehouseCode})`,
            }))}
          />

          <Select
            label="Finished goods warehouse *"
            value={finishedGoodsWarehouseId ?? ''}
            onChange={(val) => setFinishedGoodsWarehouseId(val ? Number(val) : null)}
            disabled={isSubmitting}
            placeholder="Select finished goods warehouse..."
            options={warehouses.map((w) => ({
              value: w.id,
              label: `${w.name} (${w.warehouseCode})`,
            }))}
          />
        </div>

        {/* Required materials */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Required materials
              {activeBomCode ? (
                <span className="font-normal text-muted-foreground">
                  {' · From '}
                  <span className="tabular-nums font-medium text-foreground">
                    {activeBomCode}
                  </span>
                </span>
              ) : null}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {requiredItems.length}{' '}
              {requiredItems.length === 1 ? 'component' : 'components'}
            </span>
          </div>

          <Table tableClassName="table-fixed">
            <THead>
              <tr>
                <TH className="py-2 px-3 w-[46%]">Material</TH>
                <TH className="py-2 px-2.5 w-[18%] text-right">BOM qty</TH>
                <TH className="py-2 px-2.5 w-[20%] text-right">Required qty</TH>
                <TH className="py-2 px-3 w-[16%] pl-4">UOM</TH>
              </tr>
            </THead>
            <TBody>
              {requiredItems.length === 0 ? (
                <TR>
                  <TD colSpan={4} className="py-5 text-center text-xs text-muted-foreground">
                    Select a product with an active BOM to preview required materials
                  </TD>
                </TR>
              ) : (
                requiredItems.map((it) => (
                  <TR key={it.materialId}>
                    <TD className="py-2 px-3">
                      <p className="text-xs font-medium text-foreground truncate">
                        {it.materialName}
                      </p>
                      <p className="text-xs text-ref text-muted-foreground">
                        {it.materialCode}
                      </p>
                    </TD>
                    <TD className="py-2 px-2.5 text-right text-xs tabular-nums text-muted-foreground">
                      {formatQuantity(it.bomQuantity)}
                    </TD>
                    <TD className="py-2 px-2.5 text-right text-xs tabular-nums font-semibold text-foreground">
                      {formatQuantity(it.requiredQuantity)}
                    </TD>
                    <TD className="py-2 px-3 pl-4 text-xs text-muted-foreground uppercase">
                      {it.unitOfMeasure}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>

        {/* Notes */}
        <div className="flex min-h-14 w-full flex-col rounded-md border border-border bg-card px-3.5 py-2 focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
          <span className="text-xs font-medium text-muted-foreground leading-none">
            Notes &amp; production instructions
          </span>
          <textarea
            rows={2}
            placeholder="Optional production notes..."
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
            <span>{isSubmitting ? 'Releasing...' : 'Release order'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
