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
  StockTransfer,
  StockTransferItemPayload,
  ItemOnHandStock,
} from '../../types/inventory'

export interface CreateStockTransferModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialDraft?: StockTransfer | null
}

interface TransferItemRowState {
  id: string
  itemId: number | null
  onHand: number | ''
  transferQuantity: number | ''
  unitOfMeasure: string
  isDropdownOpen: boolean
  searchQuery: string
}

export function CreateStockTransferModal({
  isOpen,
  onClose,
  onSuccess,
  initialDraft,
}: CreateStockTransferModalProps) {
  // Form states
  const [transferNumber, setTransferNumber] = useState('ST-...')
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0])
  const [fromWarehouseId, setFromWarehouseId] = useState<number | null>(null)
  const [toWarehouseId, setToWarehouseId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<TransferItemRowState[]>([
    {
      id: 'row-1',
      itemId: null,
      onHand: '',
      transferQuantity: '',
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
  const [isFromWhOpen, setIsFromWhOpen] = useState(false)
  const [fromWhSearch, setFromWhSearch] = useState('')
  const fromWhRef = useRef<HTMLDivElement>(null)

  const [isToWhOpen, setIsToWhOpen] = useState(false)
  const [toWhSearch, setToWhSearch] = useState('')
  const toWhRef = useRef<HTMLDivElement>(null)

  const itemsContainerRef = useRef<HTMLDivElement>(null)

  // Status & errors
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fromWhRef.current && !fromWhRef.current.contains(event.target as Node)) {
        setIsFromWhOpen(false)
      }
      if (toWhRef.current && !toWhRef.current.contains(event.target as Node)) {
        setIsToWhOpen(false)
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
        .getNextTransferNumber()
        .then((res) => setTransferNumber(res.nextCode))
        .catch(console.error)
    } else {
      Promise.resolve().then(() => {
        setTransferNumber(initialDraft.transferNumber)
        setTransferDate(initialDraft.transferDate)
        setFromWarehouseId(initialDraft.fromWarehouseId)
        setToWarehouseId(initialDraft.toWarehouseId)
        setNotes(initialDraft.notes || '')
        setRows(
          initialDraft.items.map((it) => ({
            id: `item-${it.id}`,
            itemId: it.itemId,
            onHand: it.onHandInSource ?? '',
            transferQuantity: it.transferQuantity,
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

  // Load on-hand stock map whenever fromWarehouseId changes
  useEffect(() => {
    if (!fromWarehouseId) {
      Promise.resolve().then(() => setWarehouseStockMap(new Map()))
      return
    }

    inventoryService
      .getWarehouseStock(fromWarehouseId)
      .then((stockList: ItemOnHandStock[]) => {
        const map = new Map<number, number>()
        stockList.forEach((s) => map.set(s.itemId, s.onHandQuantity))
        setWarehouseStockMap(map)

        // Update on-hand values for current rows
        setRows((prev) =>
          prev.map((r) => {
            if (r.itemId !== null) {
              return {
                ...r,
                onHand: map.get(r.itemId) ?? 0,
              }
            }
            return r
          })
        )
      })
      .catch((err) => console.error('Failed to load warehouse stock', err))
  }, [fromWarehouseId])

  // Filtered warehouses
  const filteredFromWarehouses = useMemo(() => {
    if (!fromWhSearch.trim()) return warehouses
    const q = fromWhSearch.trim().toLowerCase()
    return warehouses.filter(
      (w) => w.name.toLowerCase().includes(q) || w.warehouseCode.toLowerCase().includes(q)
    )
  }, [warehouses, fromWhSearch])

  const filteredToWarehouses = useMemo(() => {
    if (!toWhSearch.trim()) return warehouses
    const q = toWhSearch.trim().toLowerCase()
    return warehouses.filter(
      (w) => w.name.toLowerCase().includes(q) || w.warehouseCode.toLowerCase().includes(q)
    )
  }, [warehouses, toWhSearch])

  const selectedFromWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === fromWarehouseId) || null
  }, [warehouses, fromWarehouseId])

  const selectedToWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === toWarehouseId) || null
  }, [warehouses, toWarehouseId])

  const selectedItemIds = useMemo(() => {
    return new Set(rows.map((r) => r.itemId).filter((id): id is number => id !== null))
  }, [rows])

  // Add Item Row
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random()}`,
        itemId: null,
        onHand: '',
        transferQuantity: '',
        unitOfMeasure: '',
        isDropdownOpen: false,
        searchQuery: '',
      },
    ])
  }

  // Remove Item Row
  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) {
      setRows([
        {
          id: `row-${Date.now()}`,
          itemId: null,
          onHand: '',
          transferQuantity: '',
          unitOfMeasure: '',
          isDropdownOpen: false,
          searchQuery: '',
        },
      ])
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId))
  }

  // Select Item in Row
  const handleSelectItem = (rowId: string, item: Item) => {
    const onHand = fromWarehouseId ? warehouseStockMap.get(item.id) ?? 0 : ''
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              itemId: item.id,
              onHand,
              unitOfMeasure: item.unitOfMeasure,
              isDropdownOpen: false,
              searchQuery: '',
            }
          : r
      )
    )
  }

  // Update Transfer Qty in Row
  const handleQuantityChange = (rowId: string, val: string) => {
    const num = val === '' ? '' : parseFloat(val)
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, transferQuantity: isNaN(num as number) ? '' : num } : r))
    )
  }

  // Toggle dropdown
  const handleToggleRowDropdown = (rowId: string, open: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, isDropdownOpen: open } : { ...r, isDropdownOpen: false }))
    )
  }

  const handleRowSearchChange = (rowId: string, query: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, searchQuery: query } : r)))
  }

  // Validation
  const validate = (): string | null => {
    if (!fromWarehouseId) {
      return 'Please select a source warehouse (From Warehouse).'
    }
    if (!toWarehouseId) {
      return 'Please select a destination warehouse (To Warehouse).'
    }
    if (fromWarehouseId === toWarehouseId) {
      return 'Source and destination warehouses must be different.'
    }
    if (!transferDate) {
      return 'Please specify the transfer date.'
    }

    const validRows = rows.filter((r) => r.itemId !== null)
    if (validRows.length === 0) {
      return 'Please select at least one item to transfer.'
    }

    for (const r of validRows) {
      const itemObj = items.find((i) => i.id === r.itemId)
      if (r.transferQuantity === '' || Number(r.transferQuantity) <= 0) {
        return `Transfer quantity for ${itemObj?.name || 'item'} must be greater than zero.`
      }

      const available = typeof r.onHand === 'number' ? r.onHand : 0
      if (Number(r.transferQuantity) > available) {
        return `Transfer quantity (${r.transferQuantity}) for ${itemObj?.name || 'item'} exceeds on-hand stock (${available} ${r.unitOfMeasure}) in ${selectedFromWarehouse?.name}.`
      }
    }

    return null
  }

  // Submit
  const handleSubmit = async (postImmediately: boolean) => {
    setError(null)
    setSuccessMessage(null)

    const valError = validate()
    if (valError) {
      setError(valError)
      return
    }

    const payloadItems: StockTransferItemPayload[] = rows
      .filter((r) => r.itemId !== null && Number(r.transferQuantity) > 0)
      .map((r) => ({
        itemId: r.itemId as number,
        transferQuantity: Number(r.transferQuantity),
      }))

    setIsSubmitting(true)
    try {
      if (initialDraft) {
        await inventoryService.updateStockTransfer(initialDraft.id, {
          fromWarehouseId: fromWarehouseId!,
          toWarehouseId: toWarehouseId!,
          transferDate,
          notes: notes.trim() || undefined,
          items: payloadItems,
        })

        if (postImmediately) {
          await inventoryService.postStockTransfer(initialDraft.id)
        }
      } else {
        await inventoryService.createStockTransfer({
          fromWarehouseId: fromWarehouseId!,
          toWarehouseId: toWarehouseId!,
          transferDate,
          notes: notes.trim() || undefined,
          postImmediately,
          items: payloadItems,
        })
      }

      setSuccessMessage(
        postImmediately
          ? 'Stock transfer posted successfully! Inventory moved between warehouses.'
          : 'Draft stock transfer saved successfully.'
      )
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving stock transfer.')
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
        {/* Header matching screenshot: Inventory / Stock Transfers / New -> Create Stock Transfer */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Inventory / Stock Transfers / {initialDraft ? 'Edit Draft' : 'New'}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              {initialDraft ? `Edit Stock Transfer (${transferNumber})` : 'Create Stock Transfer'}
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
          {/* Row 1: Transfer Number (left 50%) and Transfer Date * (right 50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Transfer Number */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Transfer Number
              </label>
              <input
                type="text"
                disabled
                value={transferNumber}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/50 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Auto-generated</p>
            </div>

            {/* Transfer Date * */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Transfer Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer"
              />
            </div>
          </div>

          {/* Row 2: From Warehouse * (50%) and To Warehouse * (50%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* From Warehouse * */}
            <div className="relative" ref={fromWhRef}>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                From Warehouse <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsFromWhOpen(!isFromWhOpen)}
                className="flex h-10 w-full items-center justify-between rounded-[10px] border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground hover:border-foreground transition-colors cursor-pointer"
              >
                <span className={selectedFromWarehouse ? 'font-medium truncate' : 'text-muted-foreground'}>
                  {selectedFromWarehouse ? `${selectedFromWarehouse.name} (${selectedFromWarehouse.warehouseCode})` : 'Select source warehouse...'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              {isFromWhOpen && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-[12px] border border-border bg-white dark:bg-[#18181b] p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="relative mb-1.5">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search warehouse..."
                      value={fromWhSearch}
                      onChange={(e) => setFromWhSearch(e.target.value)}
                      className="flex h-8 w-full rounded-[6px] border border-border/60 bg-secondary/50 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {filteredFromWarehouses.length === 0 ? (
                      <p className="p-2.5 text-center text-xs text-muted-foreground">
                        No warehouses found
                      </p>
                    ) : (
                      filteredFromWarehouses.map((w) => {
                        const isSelected = fromWarehouseId === w.id
                        return (
                          <div
                            key={w.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setFromWarehouseId(w.id)
                              setIsFromWhOpen(false)
                              setFromWhSearch('')
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

            {/* To Warehouse * */}
            <div className="relative" ref={toWhRef}>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                To Warehouse <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsToWhOpen(!isToWhOpen)}
                className="flex h-10 w-full items-center justify-between rounded-[10px] border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground hover:border-foreground transition-colors cursor-pointer"
              >
                <span className={selectedToWarehouse ? 'font-medium truncate' : 'text-muted-foreground'}>
                  {selectedToWarehouse ? `${selectedToWarehouse.name} (${selectedToWarehouse.warehouseCode})` : 'Select destination warehouse...'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              {isToWhOpen && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-[12px] border border-border bg-white dark:bg-[#18181b] p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="relative mb-1.5">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search warehouse..."
                      value={toWhSearch}
                      onChange={(e) => setToWhSearch(e.target.value)}
                      className="flex h-8 w-full rounded-[6px] border border-border/60 bg-secondary/50 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {filteredToWarehouses.length === 0 ? (
                      <p className="p-2.5 text-center text-xs text-muted-foreground">
                        No warehouses found
                      </p>
                    ) : (
                      filteredToWarehouses.map((w) => {
                        const isSelected = toWarehouseId === w.id
                        const isSameAsFrom = fromWarehouseId === w.id
                        return (
                          <div
                            key={w.id}
                            onMouseDown={(e) => {
                              if (isSameAsFrom) return
                              e.preventDefault()
                              e.stopPropagation()
                              setToWarehouseId(w.id)
                              setIsToWhOpen(false)
                              setToWhSearch('')
                            }}
                            className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-xs transition-colors ${
                              isSameAsFrom
                                ? 'opacity-40 cursor-not-allowed bg-muted/20'
                                : isSelected
                                ? 'bg-secondary text-foreground font-semibold cursor-pointer'
                                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground cursor-pointer'
                            }`}
                          >
                            <div className="text-left">
                              <p className="font-medium text-foreground">
                                {w.name} {isSameAsFrom && '(Source Warehouse)'}
                              </p>
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
          </div>

          {/* Transfer items Section */}
          <div className="space-y-2 pt-2 border-t border-border/70" ref={itemsContainerRef}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Transfer items
              </h3>
              {!fromWarehouseId && (
                <span className="text-[11px] text-amber-500 font-medium">
                  Select a source warehouse to see on-hand stock
                </span>
              )}
            </div>

            {/* Column Headers matching screenshot: Item | On Hand | Transfer Qty | UOM */}
            <div className="flex items-center gap-3 px-1 text-xs font-medium text-muted-foreground">
              <div className="flex-1">Item</div>
              <div className="w-20 text-center">On Hand</div>
              <div className="w-36 sm:w-44">Transfer Qty</div>
              <div className="w-14 sm:w-16">UOM</div>
              <div className="w-9 text-center"></div>
            </div>

            {/* Rows (Clean flex layout without table clipping) */}
            <div className="space-y-2.5">
              {rows.map((row, index) => {
                const itemObj = items.find((i) => i.id === row.itemId)
                const filteredRowItems = items.filter((it) => {
                  if (row.itemId !== it.id && selectedItemIds.has(it.id)) return false
                  if (!row.searchQuery.trim()) return true
                  const q = row.searchQuery.trim().toLowerCase()
                  return it.name.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q)
                })

                const onHandVal = typeof row.onHand === 'number' ? row.onHand : 0
                const isOverStock =
                  row.transferQuantity !== '' &&
                  typeof row.onHand === 'number' &&
                  Number(row.transferQuantity) > onHandVal

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
                                const itemStock = fromWarehouseId ? warehouseStockMap.get(it.id) ?? 0 : null
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
                                            · Available: {itemStock} {it.unitOfMeasure}
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

                    {/* On Hand Column */}
                    <div className="w-20 shrink-0 text-center">
                      <span className="text-xs font-mono font-medium text-foreground">
                        {typeof row.onHand === 'number' ? row.onHand : '—'}
                      </span>
                    </div>

                    {/* Transfer Qty Input */}
                    <div className="w-36 sm:w-44 shrink-0">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        placeholder="e.g. 150"
                        value={row.transferQuantity}
                        onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                        className={`flex h-10 w-full rounded-[10px] border px-3 text-xs font-mono text-foreground focus:outline-none focus:ring-1 ${
                          isOverStock
                            ? 'border-destructive bg-destructive/10 text-destructive focus:border-destructive focus:ring-destructive'
                            : 'border-border/80 bg-secondary/30 focus:border-foreground focus:ring-foreground'
                        }`}
                      />
                    </div>

                    {/* UOM */}
                    <div className="w-14 sm:w-16 shrink-0">
                      <span className="text-xs font-medium text-muted-foreground truncate block">
                        {row.unitOfMeasure || '—'}
                      </span>
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
              Notes <span className="text-[11px] text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Reason for transferring materials..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full rounded-[10px] border border-border/80 bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>

          {/* Bottom Actions matching screenshot: Save Draft | Post Transfer */}
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
              <span>{isSubmitting ? 'Posting...' : 'Post Transfer'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
