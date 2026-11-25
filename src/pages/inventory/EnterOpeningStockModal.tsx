import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  X,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronDown,
  History,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DateField } from '../../components/ui/DateField'
import {
  fieldChrome,
  fieldChromeFocus,
  fieldChromeIdle,
} from '../../components/ui/fieldStyles'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { inventoryService } from '../../services/inventoryService'
import { masterDataService } from '../../services/masterDataService'
import { OpeningStockDetailsModal } from './OpeningStockDetailsModal'
import type { Warehouse, Item } from '../../types/masterData'
import type { OpeningStock, OpeningStockItemPayload } from '../../types/inventory'

export interface EnterOpeningStockModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ItemRowState {
  id: string
  itemId: number | null
  quantity: number | ''
  unitOfMeasure: string
  isDropdownOpen: boolean
  searchQuery: string
}

export function EnterOpeningStockModal({
  isOpen,
  onClose,
  onSuccess,
}: EnterOpeningStockModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form')

  // Form states
  const [openingStockNumber, setOpeningStockNumber] = useState('OS-...')
  const [openingDate, setOpeningDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ItemRowState[]>([
    {
      id: 'row-1',
      itemId: null,
      quantity: '',
      unitOfMeasure: '',
      isDropdownOpen: false,
      searchQuery: '',
    },
  ])

  // Editing state
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null)

  // Master data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [items, setItems] = useState<Item[]>([])

  // Warehouse dropdown
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false)
  const [warehouseSearch, setWarehouseSearch] = useState('')
  const warehouseRef = useRef<HTMLDivElement>(null)

  // Items container ref for outside click
  const itemsContainerRef = useRef<HTMLDivElement>(null)

  // History list
  const [historyList, setHistoryList] = useState<OpeningStock[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // Details Modal
  const [detailsStock, setDetailsStock] = useState<OpeningStock | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Status and error
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (warehouseRef.current && !warehouseRef.current.contains(event.target as Node)) {
        setIsWarehouseDropdownOpen(false)
      }
      if (itemsContainerRef.current && !itemsContainerRef.current.contains(event.target as Node)) {
        setRows((prev) => prev.map((r) => (r.isDropdownOpen ? { ...r, isDropdownOpen: false } : r)))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadHistory = useCallback(() => {
    inventoryService
      .getOpeningStocks({ size: 50, sortBy: 'createdAt', direction: 'desc' })
      .then((res) => {
        setHistoryList(res.content)
        setIsHistoryLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load opening stock history', err)
        setIsHistoryLoading(false)
      })
  }, [])

  // Load next number, warehouses and items when modal opens
  useEffect(() => {
    if (!isOpen) return

    // Load next opening stock number
    inventoryService
      .getNextOpeningStockNumber()
      .then((res) => {
        if (!editingDraftId) {
          setOpeningStockNumber(res.nextCode)
        }
      })
      .catch((err) => console.error('Failed to get next opening stock number', err))

    // Load active warehouses
    masterDataService
      .getWarehouses({ active: true, size: 100 })
      .then((res) => setWarehouses(res.content))
      .catch((err) => console.error('Failed to load warehouses', err))

    // Load active items
    masterDataService
      .getItems({ active: true, size: 200 })
      .then((res) => setItems(res.content))
      .catch((err) => console.error('Failed to load items', err))

    loadHistory()
  }, [isOpen, editingDraftId, loadHistory])

  // Filtered warehouses
  const filteredWarehouses = useMemo(() => {
    if (!warehouseSearch.trim()) return warehouses
    const q = warehouseSearch.trim().toLowerCase()
    return warehouses.filter(
      (w) => w.name.toLowerCase().includes(q) || w.warehouseCode.toLowerCase().includes(q)
    )
  }, [warehouses, warehouseSearch])

  // Selected warehouse object
  const selectedWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === selectedWarehouseId) || null
  }, [warehouses, selectedWarehouseId])

  // Selected item IDs across all rows to prevent duplicate selection
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
        quantity: '',
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

  // Update Item in Row
  const handleSelectItem = (rowId: string, item: Item) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              itemId: item.id,
              unitOfMeasure: item.unitOfMeasure,
              isDropdownOpen: false,
              searchQuery: '',
            }
          : r
      )
    )
  }

  // Update Quantity in Row
  const handleQuantityChange = (rowId: string, val: string) => {
    const num = val === '' ? '' : parseFloat(val)
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, quantity: isNaN(num as number) ? '' : num } : r))
    )
  }

  // Toggle Row Dropdown
  const handleToggleRowDropdown = (rowId: string, open: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, isDropdownOpen: open } : { ...r, isDropdownOpen: false }))
    )
  }

  // Row Search Query Change
  const handleRowSearchChange = (rowId: string, query: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, searchQuery: query } : r)))
  }

  // Validate form
  const validate = (): string | null => {
    if (!selectedWarehouseId) {
      return 'Please select a warehouse.'
    }
    if (!openingDate) {
      return 'Please specify the opening date.'
    }
    const validRows = rows.filter((r) => r.itemId !== null)
    if (validRows.length === 0) {
      return 'Please select at least one item.'
    }
    for (const r of validRows) {
      if (r.quantity === '' || Number(r.quantity) <= 0) {
        const itemObj = items.find((i) => i.id === r.itemId)
        return `Quantity for ${itemObj?.name || 'item'} must be greater than zero.`
      }
    }
    return null
  }

  // Submit form (Save Draft or Post)
  const handleSubmit = async (postImmediately: boolean) => {
    setError(null)
    setSuccessMessage(null)

    const valError = validate()
    if (valError) {
      setError(valError)
      return
    }

    const payloadItems: OpeningStockItemPayload[] = rows
      .filter((r) => r.itemId !== null && Number(r.quantity) > 0)
      .map((r) => ({
        itemId: r.itemId as number,
        quantity: Number(r.quantity),
      }))

    setIsSubmitting(true)
    try {
      if (editingDraftId) {
        // Updating existing draft
        await inventoryService.updateOpeningStock(editingDraftId, {
          warehouseId: selectedWarehouseId!,
          openingDate,
          notes: notes.trim() || undefined,
          items: payloadItems,
        })

        if (postImmediately) {
          await inventoryService.postOpeningStock(editingDraftId)
        }
      } else {
        // Creating new opening stock
        await inventoryService.createOpeningStock({
          warehouseId: selectedWarehouseId!,
          openingDate,
          notes: notes.trim() || undefined,
          postImmediately,
          items: payloadItems,
        })
      }

      setSuccessMessage(
        postImmediately
          ? 'Opening stock posted successfully! Inventory has been updated.'
          : 'Draft opening stock saved successfully.'
      )
      loadHistory()
      onSuccess()

      setTimeout(() => {
        resetForm()
        if (postImmediately) {
          onClose()
        } else {
          setActiveTab('history')
        }
      }, 1000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving opening stock.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Resume editing a draft
  const handleEditDraft = (stock: OpeningStock) => {
    setEditingDraftId(stock.id)
    setOpeningStockNumber(stock.openingStockNumber)
    setSelectedWarehouseId(stock.warehouseId)
    setOpeningDate(stock.openingDate)
    setNotes(stock.notes || '')
    setRows(
      stock.items.map((it) => ({
        id: `item-${it.id}`,
        itemId: it.itemId,
        quantity: it.quantity,
        unitOfMeasure: it.unitOfMeasure,
        isDropdownOpen: false,
        searchQuery: '',
      }))
    )
    setError(null)
    setSuccessMessage(null)
    setActiveTab('form')
  }

  // Cancel a draft
  const handleCancelDraft = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this draft opening stock?')) return
    try {
      await inventoryService.cancelOpeningStock(id)
      loadHistory()
      onSuccess()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel draft')
    }
  }

  // Reset form to blank
  const resetForm = () => {
    setEditingDraftId(null)
    setOpeningDate(new Date().toISOString().split('T')[0])
    setSelectedWarehouseId(null)
    setNotes('')
    setError(null)
    setSuccessMessage(null)
    setRows([
      {
        id: 'row-1',
        itemId: null,
        quantity: '',
        unitOfMeasure: '',
        isDropdownOpen: false,
        searchQuery: '',
      },
    ])
    inventoryService
      .getNextOpeningStockNumber()
      .then((res) => setOpeningStockNumber(res.nextCode))
      .catch(console.error)
  }

  if (!isOpen) return null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className="!max-w-[720px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/80">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Inventory / Opening Stock / {editingDraftId ? 'Edit Draft' : 'New'}
              </p>
              <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                {editingDraftId ? `Edit Opening Stock (${openingStockNumber})` : 'Enter Opening Stock'}
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

          {/* Form Mode */}
          {activeTab === 'form' ? (
            <div className="space-y-4">
              {/* Top row: Reference Number (left 50%) and Opening Date (right 50%) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Reference Number"
                  value={openingStockNumber}
                  disabled
                  hint="Auto-generated"
                  className="[&_input]:font-mono [&_input]:text-muted-foreground"
                />

                <DateField
                  label="Opening Date *"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                />
              </div>

              {/* Warehouse * (Full width row) */}
              <div className="relative" ref={warehouseRef}>
                <button
                  type="button"
                  onClick={() => setIsWarehouseDropdownOpen(!isWarehouseDropdownOpen)}
                  className={cn(
                    'flex min-h-14 w-full flex-col justify-center px-3.5 py-2 text-left cursor-pointer transition-all duration-150',
                    fieldChrome,
                    isWarehouseDropdownOpen ? fieldChromeFocus : fieldChromeIdle
                  )}
                >
                  <span className="text-[11px] font-medium text-muted-foreground select-none leading-none">
                    Warehouse <span className="text-destructive">*</span>
                  </span>
                  <span className="mt-1 flex w-full items-center justify-between gap-2 text-sm font-medium min-w-0">
                    <span
                      className={cn(
                        'truncate',
                        selectedWarehouse ? 'text-foreground' : 'text-muted-foreground/60'
                      )}
                    >
                      {selectedWarehouse
                        ? `${selectedWarehouse.name} (${selectedWarehouse.warehouseCode})`
                        : 'Select warehouse...'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  </span>
                </button>

                {isWarehouseDropdownOpen && (
                  <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-card p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="relative mb-1.5">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search warehouse..."
                        value={warehouseSearch}
                        onChange={(e) => setWarehouseSearch(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-border/60 bg-secondary/50 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
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
                          const isSelected = selectedWarehouseId === w.id
                          return (
                            <div
                              key={w.id}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedWarehouseId(w.id)
                                setIsWarehouseDropdownOpen(false)
                                setWarehouseSearch('')
                              }}
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs cursor-pointer transition-colors ${
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

              {/* Items Section */}
              <div className="space-y-2 pt-2 border-t border-border/70" ref={itemsContainerRef}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Opening stock items
                  </h3>
                </div>

                {/* Column Headers */}
                <div className="flex items-center gap-3 px-1 text-xs font-medium text-muted-foreground">
                  <div className="flex-1">Item</div>
                  <div className="w-36 sm:w-44">Quantity</div>
                  <div className="w-14 sm:w-16">UOM</div>
                  <div className="w-9 text-center"></div>
                </div>

                {/* Rows (Clean flex layout with NO table clipping!) */}
                <div className="space-y-2.5">
                  {rows.map((row, index) => {
                    const itemObj = items.find((i) => i.id === row.itemId)
                    const filteredRowItems = items.filter((it) => {
                      if (row.itemId !== it.id && selectedItemIds.has(it.id)) return false
                      if (!row.searchQuery.trim()) return true
                      const q = row.searchQuery.trim().toLowerCase()
                      return (
                        it.name.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q)
                      )
                    })

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
                            className="flex h-10 w-full items-center justify-between rounded-md border border-border/80 bg-secondary/30 px-3 text-xs text-foreground hover:border-foreground transition-colors cursor-pointer"
                          >
                            <span className={itemObj ? 'font-medium truncate' : 'text-muted-foreground'}>
                              {itemObj ? `${itemObj.name} (${itemObj.itemCode})` : 'Select item...'}
                            </span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                          </button>

                          {row.isDropdownOpen && (
                            <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[300px] rounded-md border border-border bg-card p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                              <div className="relative mb-1.5">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                  type="text"
                                  placeholder="Search item code or name..."
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
                                    No items available
                                  </p>
                                ) : (
                                  filteredRowItems.map((it) => {
                                    const isSelected = row.itemId === it.id
                                    return (
                                      <div
                                        key={it.id}
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleSelectItem(row.id, it)
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
                                            {it.itemCode} · UOM: {it.unitOfMeasure}
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
                        <div className="w-36 sm:w-44 shrink-0">
                          <Input
                            dense
                            type="number"
                            min="0.001"
                            step="any"
                            placeholder="e.g. 500"
                            value={row.quantity}
                            onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                            className="[&_input]:font-mono"
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
                            className="rounded-md p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-secondary/40 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div
                className={cn(
                  'group relative flex min-h-14 w-full flex-col rounded-md px-3.5 py-2',
                  fieldChrome,
                  fieldChromeIdle
                )}
              >
                <span className="text-[11px] font-medium text-muted-foreground leading-none">
                  Notes <span className="font-normal">(Optional)</span>
                </span>
                <textarea
                  rows={2}
                  placeholder="Initial inventory migration..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border/80">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('history')
                      setIsHistoryLoading(true)
                      loadHistory()
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer underline underline-offset-4"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>View History & Drafts ({historyList.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
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
                    <span>{isSubmitting ? 'Posting...' : 'Post Opening Stock'}</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* History & Drafts Mode */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2">
                <p className="text-xs text-muted-foreground">
                  Previous opening stock initialization documents and drafts.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('form')}
                  className="text-xs cursor-pointer"
                >
                  ← Back to Enter Stock
                </Button>
              </div>

              {isHistoryLoading ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                  <p className="mt-2 text-xs text-muted-foreground">Loading history...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center rounded-md border border-border/60 bg-secondary/20">
                  <p className="text-xs font-medium text-foreground">No opening stock records found</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Use the 'Enter Stock' tab to initialize materials.
                  </p>
                </div>
              ) : (
                <Table className="border-0 rounded-none shadow-none">
              <THead>
                <tr>
                  <TH className="py-2.5">Reference</TH>
                        <TH className="py-2.5">Date</TH>
                        <TH className="py-2.5">Warehouse</TH>
                        <TH className="py-2.5 text-center">Items</TH>
                        <TH className="py-2.5">Status</TH>
                        <TH className="py-2.5 text-right">Actions</TH>
                      </tr>
                    </THead>
                    <TBody className="divide-y divide-border/60">
                      {historyList.map((stock) => (
                        <TR key={stock.id} className="hover:bg-secondary/20 transition-colors">
                          <TD className="py-2.5 px-3.5 font-mono font-medium text-foreground">
                            {stock.openingStockNumber}
                          </TD>
                          <TD className="py-2.5 px-3.5 text-muted-foreground">
                            {stock.openingDate}
                          </TD>
                          <TD className="py-2.5 px-3.5 text-foreground">
                            {stock.warehouseName}
                          </TD>
                          <TD className="py-2.5 px-3.5 text-center font-mono">
                            {stock.totalItems}
                          </TD>
                          <TD className="py-2.5 px-3.5">
                            {stock.status === 'POSTED' && (
                              <Badge variant="success">Posted</Badge>
                            )}
                            {stock.status === 'DRAFT' && (
                              <Badge variant="warning">Draft</Badge>
                            )}
                            {stock.status === 'CANCELLED' && (
                              <Badge variant="destructive">Cancelled</Badge>
                            )}
                          </TD>
                          <TD className="py-2.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {stock.status === 'DRAFT' ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditDraft(stock)}
                                  className="h-7 px-2.5 text-[11px] cursor-pointer"
                                >
                                  Edit / Post
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelDraft(stock.id)}
                                  className="text-[11px] text-destructive hover:underline cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDetailsStock(stock)
                                  setIsDetailsOpen(true)
                                }}
                                className="h-7 px-2.5 text-[11px] cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span>View</span>
                              </Button>
                            )}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
            </Table>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Details View Modal */}
      {isDetailsOpen && detailsStock && (
        <OpeningStockDetailsModal
          isOpen={isDetailsOpen}
          openingStock={detailsStock}
          onClose={() => {
            setIsDetailsOpen(false)
            setDetailsStock(null)
          }}
        />
      )}
    </>
  )
}
