import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ChevronDown,
  Download,
  Package,
  History,
  Search,
  X,
  Check,
  Warehouse as WarehouseIcon,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { inventoryService } from '../../services/inventoryService'
import { masterDataService } from '../../services/masterDataService'
import { procurementService } from '../../services/procurementService'
import { GoodsReceiptDetailsModal } from '../procurement/GoodsReceiptDetailsModal'
import { OpeningStockDetailsModal } from './OpeningStockDetailsModal'
import { StockTransferDetailsModal } from './StockTransferDetailsModal'
import { StockAdjustmentDetailsModal } from './StockAdjustmentDetailsModal'
import type { Item, Warehouse } from '../../types/masterData'
import type {
  StockLedgerData,
  StockLedgerEntry,
  OpeningStock,
  StockTransfer,
  StockAdjustment,
} from '../../types/inventory'
import type { GoodsReceipt } from '../../types/procurement'

export function StockLedgerPage() {
  const [items, setItems] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)

  // Searchable dropdown states
  const [isItemOpen, setIsItemOpen] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [isWarehouseOpen, setIsWarehouseOpen] = useState(false)
  const [warehouseSearch, setWarehouseSearch] = useState('')

  const itemDropdownRef = useRef<HTMLDivElement>(null)
  const warehouseDropdownRef = useRef<HTMLDivElement>(null)

  const [ledgerData, setLedgerData] = useState<StockLedgerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // GRN Modal states
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceipt | null>(null)
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false)
  const [loadingGrnId, setLoadingGrnId] = useState<number | null>(null)

  // Opening Stock Modal states
  const [selectedOpeningStock, setSelectedOpeningStock] = useState<OpeningStock | null>(null)
  const [isOpeningStockModalOpen, setIsOpeningStockModalOpen] = useState(false)
  const [loadingOpeningStockId, setLoadingOpeningStockId] = useState<number | null>(null)

  // Stock Transfer Modal states
  const [selectedStockTransfer, setSelectedStockTransfer] = useState<StockTransfer | null>(null)
  const [isStockTransferModalOpen, setIsStockTransferModalOpen] = useState(false)
  const [loadingStockTransferId, setLoadingStockTransferId] = useState<number | null>(null)

  // Stock Adjustment Modal states
  const [selectedStockAdjustment, setSelectedStockAdjustment] = useState<StockAdjustment | null>(null)
  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState(false)
  const [loadingStockAdjustmentId, setLoadingStockAdjustmentId] = useState<number | null>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
        setIsItemOpen(false)
      }
      if (
        warehouseDropdownRef.current &&
        !warehouseDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWarehouseOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load items and warehouses for dropdowns
  useEffect(() => {
    masterDataService
      .getItems({ size: 200 })
      .then((res) => setItems(res.content))
      .catch((err) => console.error('Failed to load items for stock ledger', err))

    masterDataService
      .getWarehouses({ size: 100 })
      .then((res) => setWarehouses(res.content))
      .catch((err) => console.error('Failed to load warehouses for stock ledger', err))
  }, [])

  // Load ledger data
  const loadLedger = useCallback(() => {
    inventoryService
      .getStockLedger({
        itemId: selectedItemId !== null ? selectedItemId : undefined,
        warehouseId: selectedWarehouseId !== null ? selectedWarehouseId : undefined,
      })
      .then((data) => {
        setLedgerData(data)
        // If no item was explicitly chosen, sync with the auto-selected item from backend
        if (selectedItemId === null && data.itemId) {
          setSelectedItemId(data.itemId)
        }
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load stock ledger.')
        setIsLoading(false)
      })
  }, [selectedItemId, selectedWarehouseId])

  useEffect(() => {
    loadLedger()
  }, [loadLedger])

  // Filtered items based on search input (name or item code)
  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items
    const query = itemSearch.trim().toLowerCase()
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(query) ||
        it.itemCode.toLowerCase().includes(query)
    )
  }, [items, itemSearch])

  // Filtered warehouses based on search input
  const filteredWarehouses = useMemo(() => {
    if (!warehouseSearch.trim()) return warehouses
    const query = warehouseSearch.trim().toLowerCase()
    return warehouses.filter(
      (wh) =>
        wh.name.toLowerCase().includes(query) ||
        wh.warehouseCode.toLowerCase().includes(query)
    )
  }, [warehouses, warehouseSearch])

  // Currently selected item and warehouse objects
  const selectedItem = useMemo(() => {
    return (
      items.find((it) => it.id === selectedItemId) ||
      (ledgerData?.itemId
        ? {
            id: ledgerData.itemId,
            name: ledgerData.itemName || 'Selected Item',
            itemCode: ledgerData.itemCode || '',
            unitOfMeasure: ledgerData.unitOfMeasure || '',
          }
        : null)
    )
  }, [items, selectedItemId, ledgerData])

  const selectedWarehouse = useMemo(() => {
    return warehouses.find((wh) => wh.id === selectedWarehouseId) || null
  }, [warehouses, selectedWarehouseId])

  // Handle clicking on GRN reference link
  const handleViewGrn = async (goodsReceiptId: number | null) => {
    if (!goodsReceiptId) return
    try {
      setLoadingGrnId(goodsReceiptId)
      const grn = await procurementService.getGoodsReceiptById(goodsReceiptId)
      setSelectedGrn(grn)
      setIsGrnModalOpen(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to load goods receipt details')
    } finally {
      setLoadingGrnId(null)
    }
  }

  // Handle clicking on Opening Stock reference link
  const handleViewOpeningStock = async (openingStockId: number | null) => {
    if (!openingStockId) return
    try {
      setLoadingOpeningStockId(openingStockId)
      const stock = await inventoryService.getOpeningStockById(openingStockId)
      setSelectedOpeningStock(stock)
      setIsOpeningStockModalOpen(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to load opening stock details')
    } finally {
      setLoadingOpeningStockId(null)
    }
  }

  // Handle clicking on Stock Transfer reference link
  const handleViewStockTransfer = async (stockTransferId: number | null) => {
    if (!stockTransferId) return
    try {
      setLoadingStockTransferId(stockTransferId)
      const transfer = await inventoryService.getStockTransferById(stockTransferId)
      setSelectedStockTransfer(transfer)
      setIsStockTransferModalOpen(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to load stock transfer details')
    } finally {
      setLoadingStockTransferId(null)
    }
  }

  // Handle clicking on Stock Adjustment reference link
  const handleViewStockAdjustment = async (stockAdjustmentId: number | null) => {
    if (!stockAdjustmentId) return
    try {
      setLoadingStockAdjustmentId(stockAdjustmentId)
      const adjustment = await inventoryService.getStockAdjustmentById(stockAdjustmentId)
      setSelectedStockAdjustment(adjustment)
      setIsStockAdjustmentModalOpen(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to load stock adjustment details')
    } finally {
      setLoadingStockAdjustmentId(null)
    }
  }

  const handleDownloadGrnPdf = async (receiptId: number, grnNumber: string) => {
    await procurementService.downloadGoodsReceiptPdf(receiptId, grnNumber)
  }

  const handleExportCsv = () => {
    if (!ledgerData || ledgerData.movements.length === 0) return
    const headers = [
      'Date',
      'Reference',
      'Transaction Type',
      'Item Code',
      'Item Name',
      'Warehouse Code',
      'Warehouse Name',
      'Quantity In',
      'Quantity Out',
      'Running Balance',
      'UOM',
    ]
    const rows = ledgerData.movements.map((m) => [
      m.movementDate,
      `"${m.referenceNumber.replace(/"/g, '""')}"`,
      `"${m.transactionType.replace(/"/g, '""')}"`,
      `"${m.itemCode.replace(/"/g, '""')}"`,
      `"${m.itemName.replace(/"/g, '""')}"`,
      `"${m.warehouseCode.replace(/"/g, '""')}"`,
      `"${m.warehouseName.replace(/"/g, '""')}"`,
      m.quantityIn ?? '',
      m.quantityOut ?? '',
      m.runningBalance,
      `"${m.unitOfMeasure.replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `stock_ledger_${ledgerData.itemCode || 'all'}_${new Date().toISOString().split('T')[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatQuantity = (qty: number | null | undefined) => {
    if (qty === null || qty === undefined) return '—'
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const currentUom = ledgerData?.unitOfMeasure || 'units'

  return (
    <div className="space-y-5">
      {/* 1. Styled Searchable Item & Warehouse Selectors */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Searchable Item Dropdown */}
        <div className="relative" ref={itemDropdownRef}>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Item
          </label>
          <button
            type="button"
            onClick={() => {
              setIsItemOpen(!isItemOpen)
              setIsWarehouseOpen(false)
            }}
            className={`flex h-11 w-full items-center justify-between rounded-[10px] border bg-secondary px-3.5 py-2 text-sm transition-all cursor-pointer ${
              isItemOpen
                ? 'border-foreground ring-1 ring-foreground text-foreground shadow-xs'
                : 'border-border/80 text-foreground hover:border-border'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">
                {selectedItem ? (
                  <>
                    <span className="text-foreground">{selectedItem.name}</span>
                    {selectedItem.itemCode && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground font-normal">
                        ({selectedItem.itemCode})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Select an item...</span>
                )}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150 ${
                isItemOpen ? 'rotate-180 text-foreground' : ''
              }`}
            />
          </button>

          {/* Searchable Item Popover */}
          {isItemOpen && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-[12px] border border-border bg-white p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
              {/* Search input header */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search item by name or code..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="flex h-9 w-full rounded-[8px] border border-border/80 bg-secondary pl-9 pr-8 text-xs font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                  autoFocus
                />
                {itemSearch && (
                  <button
                    type="button"
                    onClick={() => setItemSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {filteredItems.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No items found matching "{itemSearch}"
                  </div>
                ) : (
                  filteredItems.map((it) => {
                    const isSelected = selectedItemId === it.id
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => {
                          setSelectedItemId(it.id)
                          setIsItemOpen(false)
                          setItemSearch('')
                        }}
                        className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-secondary text-foreground font-semibold'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-medium text-foreground">{it.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {it.itemCode} {it.unitOfMeasure ? `· ${it.unitOfMeasure}` : ''}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-foreground stroke-[2.5]" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Searchable Warehouse Dropdown */}
        <div className="relative" ref={warehouseDropdownRef}>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Warehouse
          </label>
          <button
            type="button"
            onClick={() => {
              setIsWarehouseOpen(!isWarehouseOpen)
              setIsItemOpen(false)
            }}
            className={`flex h-11 w-full items-center justify-between rounded-[10px] border bg-secondary px-3.5 py-2 text-sm transition-all cursor-pointer ${
              isWarehouseOpen
                ? 'border-foreground ring-1 ring-foreground text-foreground shadow-xs'
                : 'border-border/80 text-foreground hover:border-border'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <WarehouseIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">
                {selectedWarehouse ? (
                  <>
                    <span className="text-foreground">{selectedWarehouse.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground font-normal">
                      ({selectedWarehouse.warehouseCode})
                    </span>
                  </>
                ) : (
                  <span className="text-foreground">All warehouses</span>
                )}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150 ${
                isWarehouseOpen ? 'rotate-180 text-foreground' : ''
              }`}
            />
          </button>

          {/* Searchable Warehouse Popover */}
          {isWarehouseOpen && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-[12px] border border-border bg-white p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
              {/* Search input header */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search warehouse..."
                  value={warehouseSearch}
                  onChange={(e) => setWarehouseSearch(e.target.value)}
                  className="flex h-9 w-full rounded-[8px] border border-border/80 bg-secondary pl-9 pr-8 text-xs font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                  autoFocus
                />
                {warehouseSearch && (
                  <button
                    type="button"
                    onClick={() => setWarehouseSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Warehouses List */}
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {/* Option 1: All warehouses */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWarehouseId(null)
                    setIsWarehouseOpen(false)
                    setWarehouseSearch('')
                  }}
                  className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    selectedWarehouseId === null
                      ? 'bg-secondary text-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  <span className="font-medium text-foreground">All warehouses</span>
                  {selectedWarehouseId === null && (
                    <Check className="h-3.5 w-3.5 text-foreground stroke-[2.5]" />
                  )}
                </button>

                {/* Filtered list of specific warehouses */}
                {filteredWarehouses.length === 0 && warehouseSearch.trim() ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No warehouses found matching "{warehouseSearch}"
                  </div>
                ) : (
                  filteredWarehouses.map((wh) => {
                    const isSelected = selectedWarehouseId === wh.id
                    return (
                      <button
                        key={wh.id}
                        type="button"
                        onClick={() => {
                          setSelectedWarehouseId(wh.id)
                          setIsWarehouseOpen(false)
                          setWarehouseSearch('')
                        }}
                        className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-secondary text-foreground font-semibold'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-medium text-foreground">{wh.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {wh.warehouseCode}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-foreground stroke-[2.5]" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Metric Cards Strip (Total In, Total Out, Closing balance) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total In */}
        <div className="rounded-[12px] border border-border/80 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Total In</span>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-500 font-mono">
            {formatQuantity(ledgerData?.totalIn ?? 0)} {currentUom}
          </p>
        </div>

        {/* Total Out */}
        <div className="rounded-[12px] border border-border/80 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Total Out</span>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground font-mono">
            {formatQuantity(ledgerData?.totalOut ?? 0)} {currentUom}
          </p>
        </div>

        {/* Closing balance */}
        <div className="rounded-[12px] border border-border/80 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Closing balance</span>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground font-mono">
            {formatQuantity(ledgerData?.closingBalance ?? 0)} {currentUom}
          </p>
        </div>
      </div>

      {/* 3. Toolbar (Export CSV, Movement Count) */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Transaction history & running balances
          </span>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!ledgerData || ledgerData.movements.length === 0}
          className="flex h-9 items-center gap-1.5 rounded-[10px] border border-border/80 bg-secondary px-3 text-xs font-medium text-foreground hover:border-border hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Export stock ledger as CSV"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* 4. Movements Table */}
      <div className="w-full">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading stock ledger movements...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={loadLedger} className="mt-3">
              Retry
            </Button>
          </div>
        ) : !ledgerData || ledgerData.movements.length === 0 ? (
          <div className="py-16 text-center rounded-[12px] border border-border/80 bg-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <Package className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No stock movements found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              No inventory movements recorded for this item and warehouse yet. Posted Goods Receipts will automatically log inbound stock entries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">In</th>
                  <th className="py-3 px-4 text-right">Out</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {ledgerData.movements.map((entry: StockLedgerEntry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-secondary/50 transition-colors"
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs text-foreground font-normal whitespace-nowrap">
                      {formatDate(entry.movementDate)}
                    </td>

                    {/* Reference (Clickable GRN or Opening Stock link with subtext) */}
                    <td className="py-3.5 px-4">
                      <div>
                        {entry.goodsReceiptId ? (
                          <button
                            type="button"
                            onClick={() => handleViewGrn(entry.goodsReceiptId)}
                            disabled={loadingGrnId === entry.goodsReceiptId}
                            className="font-medium text-xs text-blue-500 hover:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1 transition-colors"
                            title="Click to view GRN Details"
                          >
                            <span>{entry.referenceNumber}</span>
                            {loadingGrnId === entry.goodsReceiptId && (
                              <span className="h-3 w-3 animate-spin rounded-full border border-blue-500 border-t-transparent inline-block" />
                            )}
                          </button>
                        ) : entry.openingStockId ? (
                          <button
                            type="button"
                            onClick={() => handleViewOpeningStock(entry.openingStockId)}
                            disabled={loadingOpeningStockId === entry.openingStockId}
                            className="font-medium text-xs text-blue-500 hover:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1 transition-colors font-mono"
                            title="Click to view Opening Stock Details"
                          >
                            <span>{entry.referenceNumber}</span>
                            {loadingOpeningStockId === entry.openingStockId && (
                              <span className="h-3 w-3 animate-spin rounded-full border border-blue-500 border-t-transparent inline-block" />
                            )}
                          </button>
                        ) : entry.stockTransferId ? (
                          <button
                            type="button"
                            onClick={() => handleViewStockTransfer(entry.stockTransferId)}
                            disabled={loadingStockTransferId === entry.stockTransferId}
                            className="font-medium text-xs text-blue-500 hover:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1 transition-colors font-mono"
                            title="Click to view Stock Transfer Details"
                          >
                            <span>{entry.referenceNumber}</span>
                            {loadingStockTransferId === entry.stockTransferId && (
                              <span className="h-3 w-3 animate-spin rounded-full border border-blue-500 border-t-transparent inline-block" />
                            )}
                          </button>
                        ) : entry.stockAdjustmentId ? (
                          <button
                            type="button"
                            onClick={() => handleViewStockAdjustment(entry.stockAdjustmentId)}
                            disabled={loadingStockAdjustmentId === entry.stockAdjustmentId}
                            className="font-medium text-xs text-blue-500 hover:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1 transition-colors font-mono"
                            title="Click to view Stock Adjustment Details"
                          >
                            <span>{entry.referenceNumber}</span>
                            {loadingStockAdjustmentId === entry.stockAdjustmentId && (
                              <span className="h-3 w-3 animate-spin rounded-full border border-blue-500 border-t-transparent inline-block" />
                            )}
                          </button>
                        ) : (
                          <span className="font-medium text-xs text-foreground font-mono">
                            {entry.referenceNumber}
                          </span>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {entry.transactionType}
                        </p>
                      </div>
                    </td>

                    {/* Quantity In */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-medium text-emerald-500">
                      {entry.quantityIn ? `+${formatQuantity(entry.quantityIn)}` : '—'}
                    </td>

                    {/* Quantity Out */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-medium text-rose-500">
                      {entry.quantityOut ? `-${formatQuantity(entry.quantityOut)}` : '—'}
                    </td>

                    {/* Running Balance */}
                    <td className="py-3.5 px-4 text-right font-mono text-sm font-semibold text-foreground">
                      {formatQuantity(entry.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom summary text matching screenshot: "3 movements · Unit: kg" */}
        {ledgerData && ledgerData.movements.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground">
            {ledgerData.movements.length}{' '}
            {ledgerData.movements.length === 1 ? 'movement' : 'movements'} · Unit:{' '}
            {currentUom}
          </div>
        )}
      </div>

      {/* 5. Goods Receipt Details Modal (Triggered by clicking reference link) */}
      <GoodsReceiptDetailsModal
        isOpen={isGrnModalOpen}
        receipt={selectedGrn}
        onClose={() => setIsGrnModalOpen(false)}
        onDownloadPdf={handleDownloadGrnPdf}
      />

      {/* 6. Opening Stock Details Modal (Triggered by clicking reference link) */}
      <OpeningStockDetailsModal
        isOpen={isOpeningStockModalOpen}
        openingStock={selectedOpeningStock}
        onClose={() => {
          setIsOpeningStockModalOpen(false)
          setSelectedOpeningStock(null)
        }}
      />

      {/* 7. Stock Transfer Details Modal (Triggered by clicking reference link) */}
      <StockTransferDetailsModal
        isOpen={isStockTransferModalOpen}
        transfer={selectedStockTransfer}
        onClose={() => {
          setIsStockTransferModalOpen(false)
          setSelectedStockTransfer(null)
        }}
      />

      {/* 8. Stock Adjustment Details Modal (Triggered by clicking reference link) */}
      <StockAdjustmentDetailsModal
        isOpen={isStockAdjustmentModalOpen}
        adjustment={selectedStockAdjustment}
        onClose={() => {
          setIsStockAdjustmentModalOpen(false)
          setSelectedStockAdjustment(null)
        }}
      />
    </div>
  )
}
