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
import { inventoryService } from '../../services/inventoryService'
import { masterDataService } from '../../services/masterDataService'
import type { Warehouse, Item } from '../../types/masterData'
import type {
  StockAdjustment,
  StockAdjustmentItemPayload,
  ItemOnHandStock,
} from '../../types/inventory'

export interface CreateStockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialDraft?: StockAdjustment | null
}

interface AdjustmentItemRowState {
  id: string
  itemId: number | null
  systemQuantity: number | ''
  physicalQuantity: number | ''
  difference: number | ''
  unitOfMeasure: string
  isDropdownOpen: boolean
  searchQuery: string
}

const COMMON_REASONS = [
  'Physical count',
  'Material damage',
  'Stock correction',
  'Material loss',
  'Theft',
  'Other',
]

export function CreateStockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  initialDraft,
}: CreateStockAdjustmentModalProps) {
  // Form states
  const [adjustmentNumber, setAdjustmentNumber] = useState('SA-...')
  const [adjustmentDate, setAdjustmentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [reason, setReason] = useState('Physical count')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<AdjustmentItemRowState[]>([
    {
      id: 'row-1',
      itemId: null,
      systemQuantity: '',
      physicalQuantity: '',
      difference: '',
      unitOfMeasure: '',
      isDropdownOpen: false,
      searchQuery: '',
    },
  ])

  // Master collections
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [warehouseStockMap, setWarehouseStockMap] = useState<Map<number, number>>(new Map())

  // Dropdown states
  const [isWarehouseOpen, setIsWarehouseOpen] = useState(false)
  const [warehouseSearch, setWarehouseSearch] = useState('')
  const warehouseRef = useRef<HTMLDivElement>(null)

  const itemsContainerRef = useRef<HTMLDivElement>(null)

  // Status & errors
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (warehouseRef.current && !warehouseRef.current.contains(event.target as Node)) {
        setIsWarehouseOpen(false)
      }
      if (itemsContainerRef.current && !itemsContainerRef.current.contains(event.target as Node)) {
        setRows((prev) => prev.map((r) => (r.isDropdownOpen ? { ...r, isDropdownOpen: false } : r)))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load next number, warehouses and items when modal opens
  useEffect(() => {
    if (!isOpen) return

    if (!initialDraft) {
      inventoryService
        .getNextAdjustmentNumber()
        .then((res) => setAdjustmentNumber(res.nextCode))
        .catch(console.error)
    } else {
      Promise.resolve().then(() => {
        setAdjustmentNumber(initialDraft.adjustmentNumber)
        setAdjustmentDate(initialDraft.adjustmentDate)
        setWarehouseId(initialDraft.warehouseId)
        setReason(initialDraft.reason)
        setNotes(initialDraft.notes || '')
        setRows(
          initialDraft.items.map((it) => ({
            id: `item-${it.id}`,
            itemId: it.itemId,
            systemQuantity: it.systemQuantity,
            physicalQuantity: it.physicalQuantity,
            difference: it.adjustmentQuantity,
            unitOfMeasure: it.unitOfMeasure,
            isDropdownOpen: false,
            searchQuery: '',
          }))
        )
      })
    }

    masterDataService
      .getWarehouses({ active: true, size: 100 })
      .then((res) => setWarehouses(res.content))
      .catch(console.error)

    masterDataService
      .getItems({ active: true, size: 200 })
      .then((res) => setItems(res.content))
      .catch(console.error)
  }, [isOpen, initialDraft])

  // Load on-hand stock map whenever warehouseId changes
  useEffect(() => {
    if (!warehouseId) {
      Promise.resolve().then(() => setWarehouseStockMap(new Map()))
      return
    }

    inventoryService
      .getWarehouseStock(warehouseId)
      .then((stockList: ItemOnHandStock[]) => {
        const map = new Map<number, number>()
        stockList.forEach((s) => map.set(s.itemId, s.onHandQuantity))
        setWarehouseStockMap(map)

        // Update system quantity values for current rows
        setRows((prev) =>
          prev.map((r) => {
            if (r.itemId !== null) {
              const currentStock = map.get(r.itemId) ?? 0
              const diff =
                typeof r.physicalQuantity === 'number'
                  ? r.physicalQuantity - currentStock
                  : ''
              return {
                ...r,
                systemQuantity: currentStock,
                difference: diff,
              }
            }
            return r
          })
        )
      })
      .catch(console.error)
  }, [warehouseId])

  const selectedWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === warehouseId) || null
  }, [warehouses, warehouseId])

  const filteredWarehouses = useMemo(() => {
    if (!warehouseSearch.trim()) return warehouses
    const q = warehouseSearch.trim().toLowerCase()
    return warehouses.filter(
      (w) => w.name.toLowerCase().includes(q) || w.warehouseCode.toLowerCase().includes(q)
    )
  }, [warehouses, warehouseSearch])

  const selectedItemIds = useMemo(() => {
    return new Set(rows.map((r) => r.itemId).filter((id): id is number => id !== null))
  }, [rows])

  const handleToggleRowDropdown = (rowId: string, open: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, isDropdownOpen: open } : { ...r, isDropdownOpen: false }))
    )
  }

  const handleRowSearchChange = (rowId: string, query: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, searchQuery: query } : r)))
  }

  const handleSelectItem = (rowId: string, item: Item) => {
    const currentOnHand = warehouseStockMap.get(item.id) ?? 0
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const diff =
            typeof r.physicalQuantity === 'number'
              ? r.physicalQuantity - currentOnHand
              : ''
          return {
            ...r,
            itemId: item.id,
            systemQuantity: currentOnHand,
            difference: diff,
            unitOfMeasure: item.unitOfMeasure,
            isDropdownOpen: false,
            searchQuery: '',
          }
        }
        return r
      })
    )
  }

  const handlePhysicalQtyChange = (rowId: string, value: string) => {
    const qty = value === '' ? '' : Math.max(0, parseFloat(value) || 0)
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const sys = typeof r.systemQuantity === 'number' ? r.systemQuantity : 0
          const diff = qty === '' ? '' : Number(qty) - sys
          return {
            ...r,
            physicalQuantity: qty,
            difference: diff,
          }
        }
        return r
      })
    )
  }

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        itemId: null,
        systemQuantity: '',
        physicalQuantity: '',
        difference: '',
        unitOfMeasure: '',
        isDropdownOpen: false,
        searchQuery: '',
      },
    ])
  }

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) {
      setRows([
        {
          id: `row-${Date.now()}`,
          itemId: null,
          systemQuantity: '',
          physicalQuantity: '',
          difference: '',
          unitOfMeasure: '',
          isDropdownOpen: false,
          searchQuery: '',
        },
      ])
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const validate = (): string | null => {
    if (!warehouseId) {
      return 'Please select a warehouse.'
    }
    if (!reason.trim()) {
      return 'Adjustment reason is required.'
    }
    if (reason === 'Other' && !notes.trim()) {
      return 'Notes are required when Reason is "Other".'
    }

    const validRows = rows.filter((r) => r.itemId !== null)
    if (validRows.length === 0) {
      return 'Please select at least one item to adjust.'
    }

    // Check duplicate items
    const seen = new Set<number>()
    for (const r of validRows) {
      if (seen.has(r.itemId!)) {
        const itemObj = items.find((i) => i.id === r.itemId)
        return `Duplicate item: ${itemObj?.name || 'Item'}. Each item can only be adjusted once per document.`
      }
      seen.add(r.itemId!)
    }

    // Check physical quantity entered
    for (const r of validRows) {
      if (r.physicalQuantity === '') {
        const itemObj = items.find((i) => i.id === r.itemId)
        return `Please enter a physical quantity for ${itemObj?.name || 'all items'}.`
      }
      if (typeof r.physicalQuantity === 'number' && r.physicalQuantity < 0) {
        const itemObj = items.find((i) => i.id === r.itemId)
        return `Physical quantity cannot be negative for ${itemObj?.name || 'item'}.`
      }
    }

    return null
  }

  const handleSubmit = async (postImmediately: boolean) => {
    const valError = validate()
    if (valError) {
      setError(valError)
      return
    }

    const validRows = rows.filter((r) => r.itemId !== null)

    if (postImmediately) {
      const hasNonZeroDiff = validRows.some((r) => {
        const sys = typeof r.systemQuantity === 'number' ? r.systemQuantity : 0
        const phy = typeof r.physicalQuantity === 'number' ? r.physicalQuantity : 0
        return phy - sys !== 0
      })
      if (!hasNonZeroDiff) {
        setError('At least one item must have a non-zero adjustment difference before posting.')
        return
      }
    }

    try {
      setIsSubmitting(true)
      setError(null)
      setSuccessMessage(null)

      const payloadItems: StockAdjustmentItemPayload[] = validRows.map((r) => ({
        itemId: r.itemId!,
        physicalQuantity: Number(r.physicalQuantity),
        systemQuantity: typeof r.systemQuantity === 'number' ? r.systemQuantity : 0,
      }))

      if (initialDraft) {
        await inventoryService.updateStockAdjustment(initialDraft.id, {
          warehouseId: warehouseId!,
          adjustmentDate,
          reason,
          notes: notes.trim() || undefined,
          items: payloadItems,
        })
        if (postImmediately) {
          await inventoryService.postStockAdjustment(initialDraft.id)
        }
      } else {
        await inventoryService.createStockAdjustment({
          adjustmentNumber: adjustmentNumber.startsWith('SA-') ? adjustmentNumber : undefined,
          warehouseId: warehouseId!,
          adjustmentDate,
          reason,
          notes: notes.trim() || undefined,
          postImmediately,
          items: payloadItems,
        })
      }

      setSuccessMessage(
        postImmediately
          ? 'Stock adjustment posted successfully! Inventory has been updated.'
          : 'Draft stock adjustment saved successfully.'
      )
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving stock adjustment.')
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
        {/* Header matching Stock Transfer */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Inventory / Stock Adjustments / {initialDraft ? 'Edit Draft' : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              {initialDraft ? `Edit Stock Adjustment (${adjustmentNumber})` : 'Create Stock Adjustment'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
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

        {/* Form Body */}
        <div className="space-y-4">
          {/* Row 1: Adjustment Number (left 50%) and Adjustment Date * (right 50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Adjustment Number */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Adjustment Number
              </label>
              <input
                type="text"
                disabled
                value={adjustmentNumber}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Auto-generated</p>
            </div>

            {/* Adjustment Date * */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Adjustment Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={adjustmentDate}
                onChange={(e) => setAdjustmentDate(e.target.value)}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer"
              />
            </div>
          </div>

          {/* Row 2: Warehouse * (50%) and Reason * (50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Warehouse * */}
            <div className="relative" ref={warehouseRef}>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Warehouse <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsWarehouseOpen(!isWarehouseOpen)}
                className="flex h-10 w-full items-center justify-between rounded-[10px] border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground hover:border-foreground transition-colors cursor-pointer"
              >
                <span className={selectedWarehouse ? 'font-medium truncate' : 'text-muted-foreground'}>
                  {selectedWarehouse ? `${selectedWarehouse.name} (${selectedWarehouse.warehouseCode})` : 'Select warehouse...'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              {isWarehouseOpen && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-[12px] border border-border bg-white dark:bg-[#18181b] p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="relative mb-1.5">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search warehouse..."
                      value={warehouseSearch}
                      onChange={(e) => setWarehouseSearch(e.target.value)}
                      className="flex h-8 w-full rounded-[6px] border border-border/60 bg-secondary/50 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {filteredWarehouses.length === 0 ? (
                      <p className="p-2.5 text-center text-xs text-muted-foreground">
                        No warehouses found
                      </p>
                    ) : (
                      filteredWarehouses.map((w) => {
                        const isSelected = warehouseId === w.id
                        return (
                          <div
                            key={w.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setWarehouseId(w.id)
                              setIsWarehouseOpen(false)
                              setWarehouseSearch('')
                            }}
                            className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-secondary text-foreground font-semibold'
                                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                            }`}
                          >
                            <div className="text-left">
                              <p className="font-medium text-foreground">{w.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {w.warehouseCode}
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

            {/* Reason * */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Reason <span className="text-destructive">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer"
              >
                {COMMON_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Adjustment items Section */}
          <div className="space-y-2 pt-2 border-t border-border/70" ref={itemsContainerRef}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Adjustment items
              </h3>
              {!warehouseId && (
                <span className="text-[11px] text-amber-500 font-medium">
                  Select a warehouse to see system stock
                </span>
              )}
            </div>

            {/* Column Headers matching screenshot: Item | System qty | Physical qty | Difference */}
            <div className="flex items-center gap-3 px-1 text-xs font-medium text-muted-foreground">
              <div className="flex-1">Item</div>
              <div className="w-20 text-center">System qty</div>
              <div className="w-32 sm:w-36 text-center">Physical qty</div>
              <div className="w-20 text-center">Difference</div>
              <div className="w-9 text-center"></div>
            </div>

            {/* Rows (Clean flex layout matching Stock Transfer without table clipping) */}
            <div className="space-y-2.5">
              {rows.map((row, index) => {
                const itemObj = items.find((i) => i.id === row.itemId)
                const filteredRowItems = items.filter((it) => {
                  if (row.itemId !== it.id && selectedItemIds.has(it.id)) return false
                  if (!row.searchQuery.trim()) return true
                  const q = row.searchQuery.trim().toLowerCase()
                  return it.name.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q)
                })

                const sysQty = typeof row.systemQuantity === 'number' ? row.systemQuantity : null
                const diff = typeof row.difference === 'number' ? row.difference : null

                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 relative"
                    style={{ zIndex: 40 - index }}
                  >
                    {/* Item Selector Dropdown */}
                    <div className="flex-1 min-w-0 relative">
                      <button
                        type="button"
                        onClick={() => handleToggleRowDropdown(row.id, !row.isDropdownOpen)}
                        className="flex h-10 w-full items-center justify-between rounded-[10px] border border-border/80 bg-secondary/30 px-3 text-xs text-foreground hover:border-foreground transition-colors cursor-pointer"
                      >
                        <span className={itemObj ? 'font-medium truncate' : 'text-muted-foreground'}>
                          {itemObj ? `${itemObj.name} (${itemObj.itemCode})` : 'Select item...'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                      </button>

                      {row.isDropdownOpen && (
                        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[280px] rounded-[12px] border border-border bg-white dark:bg-[#18181b] p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                          <div className="relative mb-1.5">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search item code or name..."
                              value={row.searchQuery}
                              onChange={(e) => handleRowSearchChange(row.id, e.target.value)}
                              className="flex h-8 w-full rounded-[6px] border border-border/60 bg-secondary/50 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-0.5">
                            {filteredRowItems.length === 0 ? (
                              <p className="p-3 text-center text-xs text-muted-foreground">
                                No matching items
                              </p>
                            ) : (
                              filteredRowItems.map((it) => {
                                const isSelected = row.itemId === it.id
                                const itemStock = warehouseId ? warehouseStockMap.get(it.id) ?? 0 : null
                                return (
                                  <div
                                    key={it.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleSelectItem(row.id, it)
                                    }}
                                    className={`flex w-full items-center justify-between rounded-[8px] p-2 text-xs cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-secondary text-foreground font-semibold'
                                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                                    }`}
                                  >
                                    <div className="text-left">
                                      <p className="font-medium text-foreground">{it.name}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">
                                        {it.itemCode}
                                        {itemStock !== null && (
                                          <span className="ml-1 text-emerald-500 font-medium">
                                            · Stock: {itemStock} {it.unitOfMeasure}
                                          </span>
                                        )}
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

                    {/* System Qty Column */}
                    <div className="w-20 shrink-0 text-center">
                      <span className="text-xs font-mono font-medium text-foreground">
                        {sysQty !== null ? sysQty : '—'}
                      </span>
                    </div>

                    {/* Physical Qty Input */}
                    <div className="w-32 sm:w-36 shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={row.physicalQuantity}
                        onChange={(e) => handlePhysicalQtyChange(row.id, e.target.value)}
                        className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/30 px-3 text-center text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:border-foreground focus:ring-foreground"
                      />
                    </div>

                    {/* Difference Column */}
                    <div className="w-20 shrink-0 text-center font-mono text-xs font-bold">
                      {diff === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : diff > 0 ? (
                        <span className="text-emerald-500">+{diff}</span>
                      ) : diff < 0 ? (
                        <span className="text-rose-500">{diff}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </div>

                    {/* Delete Row Button */}
                    <div className="w-9 shrink-0 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="rounded-[8px] p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Remove line item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* + Add Item Button */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-border/80 bg-secondary/40 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Notes {reason === 'Other' ? <span className="text-destructive">*</span> : <span className="text-[11px] text-muted-foreground font-normal">(Optional)</span>}
            </label>
            <textarea
              rows={2}
              placeholder="Explain the reason for the stock difference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full rounded-[10px] border border-border/80 bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>

          {/* Bottom Actions matching Stock Transfer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="text-xs font-medium cursor-pointer rounded-[8px] px-3.5"
            >
              Save Draft
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-xs rounded-[8px] px-4 flex items-center gap-1.5"
            >
              <PackageCheck className="h-4 w-4" />
              <span>{isSubmitting ? 'Posting...' : 'Post Adjustment'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
