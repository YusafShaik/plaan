import { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  Search,
  Check,
  ChevronDown,
  PackageCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { manufacturingService } from '../../services/manufacturingService'
import { masterDataService } from '../../services/masterDataService'
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
  // Form states
  const [orderNumber, setOrderNumber] = useState('MO-...')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [productId, setProductId] = useState<number | null>(null)
  const [productionQuantity, setProductionQuantity] = useState<number | ''>(10)
  const [plannedStartDate, setPlannedStartDate] = useState('')
  const [plannedEndDate, setPlannedEndDate] = useState('')
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number | null>(null)
  const [finishedGoodsWarehouseId, setFinishedGoodsWarehouseId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')

  // Active BOM & requirement preview
  const [activeBomCode, setActiveBomCode] = useState<string | null>(null)
  const [requiredItems, setRequiredItems] = useState<ProductionOrderItem[]>([])
  const [bomError, setBomError] = useState<string | null>(null)

  // Master collections
  const [items, setItems] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  // Dropdown states
  const [isProductOpen, setIsProductOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const productRef = useRef<HTMLDivElement>(null)

  const [isSourceWhOpen, setIsSourceWhOpen] = useState(false)
  const [sourceWhSearch, setSourceWhSearch] = useState('')
  const sourceWhRef = useRef<HTMLDivElement>(null)

  const [isFgWhOpen, setIsFgWhOpen] = useState(false)
  const [fgWhSearch, setFgWhSearch] = useState('')
  const fgWhRef = useRef<HTMLDivElement>(null)

  // Status & errors
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productRef.current && !productRef.current.contains(event.target as Node)) {
        setIsProductOpen(false)
      }
      if (sourceWhRef.current && !sourceWhRef.current.contains(event.target as Node)) {
        setIsSourceWhOpen(false)
      }
      if (fgWhRef.current && !fgWhRef.current.contains(event.target as Node)) {
        setIsFgWhOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load items, warehouses, and next code
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
            setFinishedGoodsWarehouseId(res.content.length > 1 ? res.content[1].id : res.content[0].id)
          })
        }
      })
      .catch(console.error)

    if (!initialDraft) {
      manufacturingService
        .getNextProductionOrderNumber()
        .then((res) => setOrderNumber(res.nextCode))
        .catch(console.error)

      Promise.resolve().then(() => {
        setOrderDate(new Date().toISOString().split('T')[0])
        setProductId(null)
        setProductionQuantity(10)
        setPlannedStartDate('')
        setPlannedEndDate('')
        setNotes('')
        setActiveBomCode(null)
        setRequiredItems([])
        setBomError(null)
      })
    } else {
      Promise.resolve().then(() => {
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

  // Fetch / calculate BOM requirements when productId or productionQuantity changes
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
            : 'No active Bill of Materials found for this product.'
        )
      })
  }, [productId, productionQuantity, initialDraft])

  const selectedProduct = useMemo(() => {
    return items.find((i) => i.id === productId) || null
  }, [items, productId])

  const selectedSourceWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === sourceWarehouseId) || null
  }, [warehouses, sourceWarehouseId])

  const selectedFgWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === finishedGoodsWarehouseId) || null
  }, [warehouses, finishedGoodsWarehouseId])

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return items
    const q = productSearch.trim().toLowerCase()
    return items.filter(
      (it) => it.name.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q)
    )
  }, [items, productSearch])

  const filteredSourceWarehouses = useMemo(() => {
    if (!sourceWhSearch.trim()) return warehouses
    const q = sourceWhSearch.trim().toLowerCase()
    return warehouses.filter(
      (w) => w.name.toLowerCase().includes(q) || w.warehouseCode.toLowerCase().includes(q)
    )
  }, [warehouses, sourceWhSearch])

  const filteredFgWarehouses = useMemo(() => {
    if (!fgWhSearch.trim()) return warehouses
    const q = fgWhSearch.trim().toLowerCase()
    return warehouses.filter(
      (w) => w.name.toLowerCase().includes(q) || w.warehouseCode.toLowerCase().includes(q)
    )
  }, [warehouses, fgWhSearch])

  const formatQuantity = (qty: number) => {
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
  }

  const validate = (): string | null => {
    if (!productId) {
      return 'Please select a product to manufacture.'
    }
    if (bomError || !activeBomCode) {
      return bomError || 'The selected product does not have an active Bill of Materials.'
    }
    if (productionQuantity === '' || Number(productionQuantity) <= 0) {
      return 'Production quantity must be greater than zero.'
    }
    if (!sourceWarehouseId) {
      return 'Please select a source warehouse for material issuance.'
    }
    if (!finishedGoodsWarehouseId) {
      return 'Please select a finished goods warehouse for receiving completed products.'
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
      setSuccessMessage(null)

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
          orderNumber: orderNumber.startsWith('MO-') && !orderNumber.includes('...') ? orderNumber : undefined,
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

      setSuccessMessage(
        releaseImmediately
          ? 'Production order released successfully! Order is authorized for manufacturing.'
          : 'Draft production order saved successfully.'
      )
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving production order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[740px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <div className="space-y-4">
        {/* Header matching design standard */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Manufacturing / Production Orders / {initialDraft ? 'Edit Draft' : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              {initialDraft ? `Edit Production Order (${orderNumber})` : 'Create Production Order'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback banners */}
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

        {successMessage && (
          <div className="flex items-start gap-2.5 rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4">
          {/* Row 1: Production Order Number (50%) and Order Date * (50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Production Order Number
              </label>
              <input
                type="text"
                disabled
                value={orderNumber}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/50 px-3.5 text-xs tabular-nums text-muted-foreground cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-muted-foreground">Auto-generated</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Order Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer"
              />
            </div>
          </div>

          {/* Row 2: Product * (50%) and Bill of Materials (50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product * */}
            <div className="relative" ref={productRef}>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Product <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsProductOpen(!isProductOpen)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground hover:border-foreground transition-colors cursor-pointer"
              >
                <span className={selectedProduct ? 'font-medium truncate' : 'text-muted-foreground'}>
                  {selectedProduct ? `${selectedProduct.name} (${selectedProduct.itemCode})` : 'Select product...'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              {isProductOpen && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-card p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="relative mb-1.5">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search product code or name..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-border/60 bg-secondary/50 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {filteredProducts.length === 0 ? (
                      <p className="p-2.5 text-center text-xs text-muted-foreground">
                        No products found
                      </p>
                    ) : (
                      filteredProducts.map((it) => {
                        const isSelected = productId === it.id
                        return (
                          <div
                            key={it.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setProductId(it.id)
                              setIsProductOpen(false)
                              setProductSearch('')
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-secondary text-foreground font-semibold'
                                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                            }`}
                          >
                            <div className="text-left">
                              <p className="font-medium text-foreground">{it.name}</p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {it.itemCode} · {it.unitOfMeasure}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-foreground stroke-[2.5]" />
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bill of Materials (Auto-selected from active BOM) */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Bill of Materials
              </label>
              <input
                type="text"
                disabled
                value={activeBomCode || (selectedProduct ? 'No active BOM found' : '—')}
                className={`flex h-10 w-full rounded-md border px-3.5 text-xs tabular-nums cursor-not-allowed ${
                  activeBomCode
                    ? 'border-border/80 bg-secondary/50 text-foreground font-semibold'
                    : 'border-border/80 bg-secondary/30 text-muted-foreground'
                }`}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {activeBomCode ? 'Automatically linked active recipe' : 'Requires an active BOM for product'}
              </p>
            </div>
          </div>

          {/* Row 3: Production Quantity * (50%) and UOM (50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Production Quantity <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="0.0001"
                step="any"
                placeholder="10"
                value={productionQuantity}
                onChange={(e) => {
                  const val = e.target.value
                  setProductionQuantity(val === '' ? '' : Math.max(0, parseFloat(val) || 0))
                }}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs tabular-nums text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                UOM
              </label>
              <input
                type="text"
                disabled
                value={selectedProduct ? selectedProduct.unitOfMeasure : '—'}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/50 px-3.5 text-xs text-muted-foreground cursor-not-allowed font-medium"
              />
            </div>
          </div>

          {/* Row 4: Planned Start Date (50%) and Planned End Date (50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Planned Start Date <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Planned End Date <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer"
              />
            </div>
          </div>

          {/* Row 5: Source Warehouse * (50%) and Finished Goods Warehouse * (50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Source Warehouse * */}
            <div className="relative" ref={sourceWhRef}>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Source Warehouse <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsSourceWhOpen(!isSourceWhOpen)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground hover:border-foreground transition-colors cursor-pointer"
              >
                <span className={selectedSourceWarehouse ? 'font-medium truncate' : 'text-muted-foreground'}>
                  {selectedSourceWarehouse ? `${selectedSourceWarehouse.name} (${selectedSourceWarehouse.warehouseCode})` : 'Select raw material warehouse...'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              {isSourceWhOpen && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-card p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="relative mb-1.5">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search warehouse..."
                      value={sourceWhSearch}
                      onChange={(e) => setSourceWhSearch(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-border/60 bg-secondary/50 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {filteredSourceWarehouses.map((w) => {
                      const isSelected = sourceWarehouseId === w.id
                      return (
                        <div
                          key={w.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setSourceWarehouseId(w.id)
                            setIsSourceWhOpen(false)
                            setSourceWhSearch('')
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-secondary text-foreground font-semibold'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                          }`}
                        >
                          <div className="text-left">
                            <p className="font-medium text-foreground">{w.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {w.warehouseCode}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-foreground stroke-[2.5]" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Finished Goods Warehouse * */}
            <div className="relative" ref={fgWhRef}>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Finished Goods Warehouse <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsFgWhOpen(!isFgWhOpen)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground hover:border-foreground transition-colors cursor-pointer"
              >
                <span className={selectedFgWarehouse ? 'font-medium truncate' : 'text-muted-foreground'}>
                  {selectedFgWarehouse ? `${selectedFgWarehouse.name} (${selectedFgWarehouse.warehouseCode})` : 'Select finished goods warehouse...'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              {isFgWhOpen && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-card p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="relative mb-1.5">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search warehouse..."
                      value={fgWhSearch}
                      onChange={(e) => setFgWhSearch(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-border/60 bg-secondary/50 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {filteredFgWarehouses.map((w) => {
                      const isSelected = finishedGoodsWarehouseId === w.id
                      return (
                        <div
                          key={w.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setFinishedGoodsWarehouseId(w.id)
                            setIsFgWhOpen(false)
                            setFgWhSearch('')
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-secondary text-foreground font-semibold'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                          }`}
                        >
                          <div className="text-left">
                            <p className="font-medium text-foreground">{w.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {w.warehouseCode}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-foreground stroke-[2.5]" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Required materials Section (Automatically calculated from BOM) */}
          <div className="space-y-2 pt-2 border-t border-border/70">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Required materials
                </h3>
                {activeBomCode && (
                  <p className="text-xs text-muted-foreground">
                    Automatically calculated from <span className="tabular-nums font-medium text-foreground">{activeBomCode}</span>
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {requiredItems.length} components
              </span>
            </div>

            {/* Table */}
            <Table>
              <THead>
                <tr>
                  <TH className="py-2.5">Material</TH>
                    <TH className="py-2.5 text-right">BOM Qty</TH>
                    <TH className="py-2.5 text-right">Required Qty</TH>
                    <TH className="py-2.5">UOM</TH>
                  </tr>
                </THead>
                <TBody className="divide-y divide-border/60">
                  {requiredItems.length === 0 ? (
                    <TR>
                      <TD colSpan={4} className="py-6 text-center text-muted-foreground">
                        Select a product with an active BOM to see required materials
                      </TD>
                    </TR>
                  ) : (
                    requiredItems.map((it) => (
                      <TR key={it.materialId} className="hover:bg-secondary/30 transition-colors">
                        <TD className="py-2.5 px-3.5">
                          <p className="font-medium text-foreground">{it.materialName}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {it.materialCode}
                          </p>
                        </TD>
                        <TD className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {formatQuantity(it.bomQuantity)}
                        </TD>
                        <TD className="py-2.5 px-3 text-right tabular-nums font-medium text-foreground">
                          {formatQuantity(it.requiredQuantity)}
                        </TD>
                        <TD className="py-2.5 px-3.5 text-muted-foreground">
                          {it.unitOfMeasure}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
            </Table>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Notes <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Additional production instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full rounded-md border border-border/80 bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="text-xs font-medium cursor-pointer rounded-md px-3.5"
            >
              Save Draft
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="bg-success text-success-foreground hover:opacity-90 font-semibold text-xs cursor-pointer shadow-xs rounded-md px-4 flex items-center gap-1.5"
            >
              <PackageCheck className="h-4 w-4" />
              <span>{isSubmitting ? 'Releasing...' : 'Release Order'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
