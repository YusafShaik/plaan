import { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronDown,
  PackageCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { manufacturingService } from '../../services/manufacturingService'
import { masterDataService } from '../../services/masterDataService'
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
  quantity: number | ''
  unitOfMeasure: string
  isDropdownOpen: boolean
  searchQuery: string
}

export function CreateBomModal({
  isOpen,
  onClose,
  onSuccess,
  initialDraft,
}: CreateBomModalProps) {
  // Form states
  const [bomCode, setBomCode] = useState('BOM-...')
  const [productId, setProductId] = useState<number | null>(null)
  const [outputQuantity, setOutputQuantity] = useState<number | ''>(1)
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ComponentRowState[]>([
    {
      id: 'row-1',
      materialId: null,
      quantity: '',
      unitOfMeasure: '',
      isDropdownOpen: false,
      searchQuery: '',
    },
  ])

  // Master collections
  const [items, setItems] = useState<Item[]>([])

  // Product dropdown
  const [isProductOpen, setIsProductOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const productRef = useRef<HTMLDivElement>(null)

  const itemsContainerRef = useRef<HTMLDivElement>(null)

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
      if (itemsContainerRef.current && !itemsContainerRef.current.contains(event.target as Node)) {
        setRows((prev) => prev.map((r) => (r.isDropdownOpen ? { ...r, isDropdownOpen: false } : r)))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load next code and items when modal opens
  useEffect(() => {
    if (!isOpen) return

    if (!initialDraft) {
      manufacturingService
        .getNextBomCode()
        .then((res) => setBomCode(res.nextCode))
        .catch(console.error)

      Promise.resolve().then(() => {
        setProductId(null)
        setOutputQuantity(1)
        setNotes('')
        setRows([
          {
            id: 'row-1',
            materialId: null,
            quantity: '',
            unitOfMeasure: '',
            isDropdownOpen: false,
            searchQuery: '',
          },
        ])
      })
    } else {
      Promise.resolve().then(() => {
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
            isDropdownOpen: false,
            searchQuery: '',
          }))
        )
      })
    }

    masterDataService
      .getItems({ active: true, size: 200 })
      .then((res) => setItems(res.content))
      .catch(console.error)
  }, [isOpen, initialDraft])

  const selectedProduct = useMemo(() => {
    return items.find((i) => i.id === productId) || null
  }, [items, productId])

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return items
    const q = productSearch.trim().toLowerCase()
    return items.filter(
      (it) => it.name.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q)
    )
  }, [items, productSearch])

  const selectedMaterialIds = useMemo(() => {
    return new Set(rows.map((r) => r.materialId).filter((id): id is number => id !== null))
  }, [rows])

  const handleToggleRowDropdown = (rowId: string, open: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, isDropdownOpen: open } : { ...r, isDropdownOpen: false }))
    )
  }

  const handleRowSearchChange = (rowId: string, query: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, searchQuery: query } : r)))
  }

  const handleSelectMaterial = (rowId: string, item: Item) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            materialId: item.id,
            unitOfMeasure: item.unitOfMeasure,
            isDropdownOpen: false,
            searchQuery: '',
          }
        }
        return r
      })
    )
  }

  const handleQuantityChange = (rowId: string, val: string) => {
    const qty = val === '' ? '' : Math.max(0, parseFloat(val) || 0)
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, quantity: qty } : r))
    )
  }

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        materialId: null,
        quantity: '',
        unitOfMeasure: '',
        isDropdownOpen: false,
        searchQuery: '',
      },
    ])
  }

  const handleRemoveRow = (rowId: string) => {
    if (rows.length === 1) {
      setRows([
        {
          id: `row-${Date.now()}`,
          materialId: null,
          quantity: '',
          unitOfMeasure: '',
          isDropdownOpen: false,
          searchQuery: '',
        },
      ])
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId))
  }

  const validate = (saveAndActivate: boolean): string | null => {
    if (!productId) {
      return 'Please select a product.'
    }
    if (outputQuantity === '' || Number(outputQuantity) <= 0) {
      return 'Output quantity must be greater than zero.'
    }

    const validRows = rows.filter((r) => r.materialId !== null)

    if (saveAndActivate && validRows.length === 0) {
      return 'At least one component material is required to activate a BOM.'
    }

    // Check if product is used as component
    for (const r of validRows) {
      if (r.materialId === productId) {
        return `The output product (${selectedProduct?.name}) cannot be its own component material.`
      }
    }

    // Check duplicate components
    const seen = new Set<number>()
    for (const r of validRows) {
      if (seen.has(r.materialId!)) {
        const mat = items.find((i) => i.id === r.materialId)
        return `Duplicate component material: ${mat?.name || 'Material'}. Each material can only appear once in a BOM.`
      }
      seen.add(r.materialId!)
    }

    // Check quantities
    for (const r of validRows) {
      if (r.quantity === '' || Number(r.quantity) <= 0) {
        const mat = items.find((i) => i.id === r.materialId)
        return `Quantity for component material "${mat?.name || 'Item'}" must be greater than zero.`
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
      setSuccessMessage(null)

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
          bomCode: bomCode.startsWith('BOM-') && !bomCode.includes('...') ? bomCode : undefined,
          productId: productId!,
          outputQuantity: Number(outputQuantity),
          notes: notes.trim() || undefined,
          saveAndActivate,
          items: payloadItems,
        })
      }

      setSuccessMessage(
        saveAndActivate
          ? 'Bill of Materials saved and activated successfully!'
          : 'Draft Bill of Materials saved successfully.'
      )
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving BOM.')
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
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Manufacturing / Bill of Materials / {initialDraft ? 'Edit Draft' : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              {initialDraft ? `Edit Bill of Materials (${bomCode})` : 'Create Bill of Materials'}
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

        {successMessage && (
          <div className="flex items-start gap-2.5 rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4">
          {/* Row 1: BOM Code (left 50%) and Product * (right 50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* BOM Code */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                BOM Code
              </label>
              <input
                type="text"
                disabled
                value={bomCode}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Auto-generated</p>
            </div>

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
                              <p className="text-[10px] text-muted-foreground font-mono">
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
          </div>

          {/* Row 2: Output Quantity * (left 50%) and UOM (right 50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Output Quantity * */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Output Quantity <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="0.0001"
                step="any"
                placeholder="1"
                value={outputQuantity}
                onChange={(e) => {
                  const val = e.target.value
                  setOutputQuantity(val === '' ? '' : Math.max(0, parseFloat(val) || 0))
                }}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs font-mono text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Batch size / finished units per recipe
              </p>
            </div>

            {/* UOM (Auto-populated from Product) */}
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
              <p className="mt-1 text-[11px] text-muted-foreground">From Product Master</p>
            </div>
          </div>

          {/* Component materials Section */}
          <div className="space-y-2 pt-2 border-t border-border/70" ref={itemsContainerRef}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Component materials
              </h3>
              {!productId && (
                <span className="text-[11px] text-warning font-medium">
                  Select a product to begin building the BOM recipe
                </span>
              )}
            </div>

            {/* Column Headers */}
            <div className="flex items-center gap-3 px-1 text-xs font-medium text-muted-foreground">
              <div className="flex-1">Material</div>
              <div className="w-32 sm:w-36">Quantity</div>
              <div className="w-16 sm:w-20">UOM</div>
              <div className="w-9 text-center"></div>
            </div>

            {/* Component Rows */}
            <div className="space-y-2.5">
              {rows.map((row, index) => {
                const itemObj = items.find((i) => i.id === row.materialId)
                const filteredRowItems = items.filter((it) => {
                  // Cannot be the output product
                  if (it.id === productId) return false
                  // Cannot be duplicate in other rows
                  if (row.materialId !== it.id && selectedMaterialIds.has(it.id)) return false
                  if (!row.searchQuery.trim()) return true
                  const q = row.searchQuery.trim().toLowerCase()
                  return it.name.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q)
                })

                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 relative"
                    style={{ zIndex: 40 - index }}
                  >
                    {/* Material Selector Dropdown */}
                    <div className="flex-1 min-w-0 relative">
                      <button
                        type="button"
                        onClick={() => handleToggleRowDropdown(row.id, !row.isDropdownOpen)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-border/80 bg-secondary/30 px-3 text-xs text-foreground hover:border-foreground transition-colors cursor-pointer"
                      >
                        <span className={itemObj ? 'font-medium truncate' : 'text-muted-foreground'}>
                          {itemObj ? `${itemObj.name} (${itemObj.itemCode})` : 'Select material...'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                      </button>

                      {row.isDropdownOpen && (
                        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[280px] rounded-md border border-border bg-card p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                          <div className="relative mb-1.5">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search material code or name..."
                              value={row.searchQuery}
                              onChange={(e) => handleRowSearchChange(row.id, e.target.value)}
                              className="flex h-8 w-full rounded-md border border-border/60 bg-secondary/50 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-0.5">
                            {filteredRowItems.length === 0 ? (
                              <p className="p-3 text-center text-xs text-muted-foreground">
                                No matching materials
                              </p>
                            ) : (
                              filteredRowItems.map((it) => {
                                const isSelected = row.materialId === it.id
                                return (
                                  <div
                                    key={it.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleSelectMaterial(row.id, it)
                                    }}
                                    className={`flex w-full items-center justify-between rounded-md p-2 text-xs cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-secondary text-foreground font-semibold'
                                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                                    }`}
                                  >
                                    <div className="text-left">
                                      <p className="font-medium text-foreground">{it.name}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">
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

                    {/* Quantity Input */}
                    <div className="w-32 sm:w-36 shrink-0">
                      <input
                        type="number"
                        min="0.0001"
                        step="any"
                        placeholder="e.g. 1"
                        value={row.quantity}
                        onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                        className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3 text-center text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:border-foreground focus:ring-foreground"
                      />
                    </div>

                    {/* UOM Display */}
                    <div className="w-16 sm:w-20 shrink-0">
                      <span className="text-xs font-medium text-muted-foreground truncate block">
                        {row.unitOfMeasure || '—'}
                      </span>
                    </div>

                    {/* Delete Row Button */}
                    <div className="w-9 shrink-0 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="rounded-md p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Remove component"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* + Add Material Button */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-secondary/40 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Material</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Notes <span className="text-[11px] text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Additional manufacturing information..."
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
              <span>{isSubmitting ? 'Saving...' : 'Save & Activate'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
