import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ChevronDown,
  Download,
  Package,
  Search,
  X,
  Check,
  RotateCcw,
  Warehouse as WarehouseIcon,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
import { Table, THead, TBody, TR, TH, TD, TableEmptyState } from '../../components/ui/Table'
import { inventoryService } from '../../services/inventoryService'
import { masterDataService } from '../../services/masterDataService'
import { procurementService } from '../../services/procurementService'
import { toast } from '../../lib/feedback'
import { formatQuantity, formatShortDate } from '../../lib/format'
import { cn } from '../../lib/cn'
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

const TX_TYPE_LABELS: Record<string, string> = {
  OPENING_STOCK: 'Opening stock',
  GOODS_RECEIPT: 'Goods receipt',
  GRN: 'Goods receipt',
  STOCK_TRANSFER_IN: 'Transfer in',
  STOCK_TRANSFER_OUT: 'Transfer out',
  TRANSFER_IN: 'Transfer in',
  TRANSFER_OUT: 'Transfer out',
  STOCK_ADJUSTMENT: 'Stock adjustment',
  ADJUSTMENT_IN: 'Adjustment in',
  ADJUSTMENT_OUT: 'Adjustment out',
  PRODUCTION_CONSUME: 'Production issue',
  PRODUCTION_OUTPUT: 'Production output',
  DISPATCH: 'Customer dispatch',
}

function formatTransactionType(raw: string) {
  if (!raw) return 'Movement'
  const mapped = TX_TYPE_LABELS[raw.toUpperCase()]
  if (mapped) return mapped
  const normalized = raw.toLowerCase().replace(/_/g, ' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export interface StockLedgerPageProps {
  initialItemId?: number | null
  initialWarehouseId?: number | null
}

export function StockLedgerPage({
  initialItemId = null,
  initialWarehouseId = null,
}: StockLedgerPageProps = {}) {
  const [items, setItems] = useState<Item[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  const [selectedItemId, setSelectedItemId] = useState<number | null>(initialItemId)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    initialWarehouseId
  )

  const [isItemOpen, setIsItemOpen] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [isWarehouseOpen, setIsWarehouseOpen] = useState(false)
  const [warehouseSearch, setWarehouseSearch] = useState('')

  const itemDropdownRef = useRef<HTMLDivElement>(null)
  const warehouseDropdownRef = useRef<HTMLDivElement>(null)

  const [ledgerData, setLedgerData] = useState<StockLedgerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedGrn, setSelectedGrn] = useState<GoodsReceipt | null>(null)
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false)
  const [loadingGrnId, setLoadingGrnId] = useState<number | null>(null)

  const [selectedOpeningStock, setSelectedOpeningStock] = useState<OpeningStock | null>(null)
  const [isOpeningStockModalOpen, setIsOpeningStockModalOpen] = useState(false)
  const [loadingOpeningStockId, setLoadingOpeningStockId] = useState<number | null>(null)

  const [selectedStockTransfer, setSelectedStockTransfer] = useState<StockTransfer | null>(
    null
  )
  const [isStockTransferModalOpen, setIsStockTransferModalOpen] = useState(false)
  const [loadingStockTransferId, setLoadingStockTransferId] = useState<number | null>(null)

  const [selectedStockAdjustment, setSelectedStockAdjustment] =
    useState<StockAdjustment | null>(null)
  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState(false)
  const [loadingStockAdjustmentId, setLoadingStockAdjustmentId] = useState<number | null>(
    null
  )

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

  const fetchLedger = useCallback(
    (itemId: number | null, warehouseId: number | null) => {
      inventoryService
        .getStockLedger({
          itemId: itemId !== null ? itemId : undefined,
          warehouseId: warehouseId !== null ? warehouseId : undefined,
        })
        .then((data) => {
          setError(null)
          setLedgerData(data)
          if (itemId === null && data.itemId) {
            setSelectedItemId(data.itemId)
          }
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load stock ledger.')
          setIsLoading(false)
        })
    },
    []
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLedger(selectedItemId, selectedWarehouseId)
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchLedger, selectedItemId, selectedWarehouseId])

  const selectItem = (id: number) => {
    setIsLoading(true)
    setSelectedItemId(id)
    setIsItemOpen(false)
    setItemSearch('')
  }

  const selectWarehouse = (id: number | null) => {
    setIsLoading(true)
    setSelectedWarehouseId(id)
    setIsWarehouseOpen(false)
    setWarehouseSearch('')
  }

  const resetFilters = () => {
    setIsLoading(true)
    setSelectedWarehouseId(null)
    if (initialItemId !== null) setSelectedItemId(initialItemId)
  }

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items
    const query = itemSearch.trim().toLowerCase()
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(query) ||
        it.itemCode.toLowerCase().includes(query)
    )
  }, [items, itemSearch])

  const filteredWarehouses = useMemo(() => {
    if (!warehouseSearch.trim()) return warehouses
    const query = warehouseSearch.trim().toLowerCase()
    return warehouses.filter(
      (wh) =>
        wh.name.toLowerCase().includes(query) ||
        wh.warehouseCode.toLowerCase().includes(query)
    )
  }, [warehouses, warehouseSearch])

  const selectedItem = useMemo(() => {
    return (
      items.find((it) => it.id === selectedItemId) ||
      (ledgerData?.itemId
        ? {
            id: ledgerData.itemId,
            name: ledgerData.itemName || 'Selected item',
            itemCode: ledgerData.itemCode || '',
            unitOfMeasure: ledgerData.unitOfMeasure || '',
          }
        : null)
    )
  }, [items, selectedItemId, ledgerData])

  const selectedWarehouse = useMemo(() => {
    return warehouses.find((wh) => wh.id === selectedWarehouseId) || null
  }, [warehouses, selectedWarehouseId])

  const handleViewGrn = async (goodsReceiptId: number | null) => {
    if (!goodsReceiptId) return
    try {
      setLoadingGrnId(goodsReceiptId)
      const grn = await procurementService.getGoodsReceiptById(goodsReceiptId)
      setSelectedGrn(grn)
      setIsGrnModalOpen(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load goods receipt details')
    } finally {
      setLoadingGrnId(null)
    }
  }

  const handleViewOpeningStock = async (openingStockId: number | null) => {
    if (!openingStockId) return
    try {
      setLoadingOpeningStockId(openingStockId)
      const stock = await inventoryService.getOpeningStockById(openingStockId)
      setSelectedOpeningStock(stock)
      setIsOpeningStockModalOpen(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load opening stock details')
    } finally {
      setLoadingOpeningStockId(null)
    }
  }

  const handleViewStockTransfer = async (stockTransferId: number | null) => {
    if (!stockTransferId) return
    try {
      setLoadingStockTransferId(stockTransferId)
      const transfer = await inventoryService.getStockTransferById(stockTransferId)
      setSelectedStockTransfer(transfer)
      setIsStockTransferModalOpen(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load stock transfer details')
    } finally {
      setLoadingStockTransferId(null)
    }
  }

  const handleViewStockAdjustment = async (stockAdjustmentId: number | null) => {
    if (!stockAdjustmentId) return
    try {
      setLoadingStockAdjustmentId(stockAdjustmentId)
      const adjustment = await inventoryService.getStockAdjustmentById(stockAdjustmentId)
      setSelectedStockAdjustment(adjustment)
      setIsStockAdjustmentModalOpen(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load stock adjustment details')
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

  const hasSelectedItem = Boolean(selectedItemId || ledgerData?.itemId)
  const currentUom = ledgerData?.unitOfMeasure || selectedItem?.unitOfMeasure || 'units'

  return (
    <div className="space-y-5">
      <KpiCardGrid columns={3}>
        <KpiCard
          label="Total in"
          value={
            hasSelectedItem
              ? `${formatQuantity(ledgerData?.totalIn ?? 0)} ${currentUom}`
              : '—'
          }
          hint={!hasSelectedItem ? 'Select an item below' : undefined}
        />
        <KpiCard
          label="Total out"
          value={
            hasSelectedItem
              ? `${formatQuantity(ledgerData?.totalOut ?? 0)} ${currentUom}`
              : '—'
          }
          hint={!hasSelectedItem ? 'Select an item below' : undefined}
        />
        <KpiCard
          label="Closing balance"
          value={
            hasSelectedItem
              ? `${formatQuantity(ledgerData?.closingBalance ?? 0)} ${currentUom}`
              : '—'
          }
          hint={!hasSelectedItem ? 'Select an item below' : undefined}
        />
      </KpiCardGrid>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Item Picker */}
          <div className="relative" ref={itemDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsItemOpen((o) => !o)
                setIsWarehouseOpen(false)
              }}
              className={cn(
                'flex h-9 min-w-[16rem] max-w-[22rem] items-center justify-between gap-2 rounded-md border bg-card px-3 text-xs transition-colors cursor-pointer',
                isItemOpen
                  ? 'border-foreground ring-1 ring-foreground text-foreground'
                  : 'border-border text-foreground hover:bg-secondary/40'
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {selectedItem ? (
                  <span className="truncate font-medium">
                    {selectedItem.name}
                    {selectedItem.itemCode ? (
                      <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
                        ({selectedItem.itemCode})
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select item...</span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform',
                  isItemOpen && 'rotate-180 text-foreground'
                )}
              />
            </button>

            {isItemOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-80 rounded-md border border-border bg-card p-2 shadow-panel">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search item by name or code..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-border bg-secondary pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                    autoFocus
                  />
                  {itemSearch && (
                    <button
                      type="button"
                      onClick={() => setItemSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {filteredItems.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No items found
                    </div>
                  ) : (
                    filteredItems.map((it) => {
                      const isSelected = selectedItemId === it.id
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => selectItem(it.id)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-secondary text-foreground font-semibold'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                          )}
                        >
                          <div className="text-left min-w-0">
                            <p className="font-medium text-foreground truncate">{it.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {it.itemCode}
                              {it.unitOfMeasure ? ` · ${it.unitOfMeasure}` : ''}
                            </p>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-foreground shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Warehouse Picker */}
          <div className="relative" ref={warehouseDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsWarehouseOpen((o) => !o)
                setIsItemOpen(false)
              }}
              className={cn(
                'flex h-9 min-w-[13rem] max-w-[18rem] items-center justify-between gap-2 rounded-md border bg-card px-3 text-xs transition-colors cursor-pointer',
                isWarehouseOpen
                  ? 'border-foreground ring-1 ring-foreground text-foreground'
                  : 'border-border text-foreground hover:bg-secondary/40'
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {selectedWarehouse ? (
                  <span className="truncate font-medium">
                    {selectedWarehouse.name}
                    <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
                      ({selectedWarehouse.warehouseCode})
                    </span>
                  </span>
                ) : (
                  <span className="font-medium text-foreground">All warehouses</span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform',
                  isWarehouseOpen && 'rotate-180 text-foreground'
                )}
              />
            </button>

            {isWarehouseOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-md border border-border bg-card p-2 shadow-panel">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search warehouse..."
                    value={warehouseSearch}
                    onChange={(e) => setWarehouseSearch(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-border bg-secondary pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
                    autoFocus
                  />
                  {warehouseSearch && (
                    <button
                      type="button"
                      onClick={() => setWarehouseSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  <button
                    type="button"
                    onClick={() => selectWarehouse(null)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors cursor-pointer',
                      selectedWarehouseId === null
                        ? 'bg-secondary text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    )}
                  >
                    <span className="font-medium text-foreground">All warehouses</span>
                    {selectedWarehouseId === null && (
                      <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
                    )}
                  </button>

                  {filteredWarehouses.length === 0 && warehouseSearch.trim() ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      No warehouses found
                    </div>
                  ) : (
                    filteredWarehouses.map((wh) => {
                      const isSelected = selectedWarehouseId === wh.id
                      return (
                        <button
                          key={wh.id}
                          type="button"
                          onClick={() => selectWarehouse(wh.id)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-secondary text-foreground font-semibold'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                          )}
                        >
                          <div className="text-left min-w-0">
                            <p className="font-medium text-foreground truncate">{wh.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {wh.warehouseCode}
                            </p>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-foreground shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedWarehouseId !== null && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer px-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={!ledgerData || ledgerData.movements.length === 0}
          className="self-start lg:self-auto"
          title="Export stock ledger as CSV"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          Export
        </Button>
      </div>

      <div className="w-full">
        {isLoading ? (
          <div className="py-20 text-center rounded-md border border-border bg-card">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">
              Loading stock ledger movements...
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center rounded-md border border-border bg-card">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true)
                fetchLedger(selectedItemId, selectedWarehouseId)
              }}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            <Table className="border-0 rounded-none" tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="w-[14%]">Date</TH>
                  <TH className="w-[44%]">Reference</TH>
                  <TH className="w-[14%] text-right">In</TH>
                  <TH className="w-[14%] text-right">Out</TH>
                  <TH className="w-[14%] text-right">Balance</TH>
                </tr>
              </THead>
              <TBody>
                {!ledgerData || ledgerData.movements.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="p-0">
                      <TableEmptyState
                        icon={<Package className="h-5 w-5" />}
                        title="No stock movements found"
                        description="No inventory movements recorded for this item and warehouse yet. Posted goods receipts and opening stock entries appear here automatically."
                      />
                    </TD>
                  </TR>
                ) : (
                  ledgerData.movements.map((entry: StockLedgerEntry) => {
                    const canOpenDetails = Boolean(
                      entry.goodsReceiptId ||
                        entry.openingStockId ||
                        entry.stockTransferId ||
                        entry.stockAdjustmentId
                    )
                    const openDetails = () => {
                      if (entry.goodsReceiptId) handleViewGrn(entry.goodsReceiptId)
                      else if (entry.openingStockId)
                        handleViewOpeningStock(entry.openingStockId)
                      else if (entry.stockTransferId)
                        handleViewStockTransfer(entry.stockTransferId)
                      else if (entry.stockAdjustmentId)
                        handleViewStockAdjustment(entry.stockAdjustmentId)
                    }
                    const isRowLoading =
                      (loadingGrnId != null && loadingGrnId === entry.goodsReceiptId) ||
                      (loadingOpeningStockId != null &&
                        loadingOpeningStockId === entry.openingStockId) ||
                      (loadingStockTransferId != null &&
                        loadingStockTransferId === entry.stockTransferId) ||
                      (loadingStockAdjustmentId != null &&
                        loadingStockAdjustmentId === entry.stockAdjustmentId)

                    return (
                      <TR
                        key={entry.id}
                        clickable={canOpenDetails}
                        onClick={canOpenDetails ? openDetails : undefined}
                      >
                        <TD className="font-normal tabular-nums text-muted-foreground whitespace-nowrap">
                          {formatShortDate(entry.movementDate)}
                        </TD>

                        <TD>
                          <div>
                            {canOpenDetails ? (
                              <span className="text-ref-link inline-flex items-center gap-1.5">
                                <span>{entry.referenceNumber}</span>
                                {isRowLoading && (
                                  <span className="h-3 w-3 animate-spin rounded-full border border-info border-t-transparent inline-block" />
                                )}
                              </span>
                            ) : (
                              <span className="text-ref text-foreground">
                                {entry.referenceNumber}
                              </span>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatTransactionType(entry.transactionType)}
                            </p>
                          </div>
                        </TD>

                        <TD className="text-right tabular-nums font-medium text-success">
                          {entry.quantityIn ? `+${formatQuantity(entry.quantityIn)}` : '—'}
                        </TD>

                        <TD className="text-right tabular-nums font-medium text-destructive">
                          {entry.quantityOut ? `-${formatQuantity(entry.quantityOut)}` : '—'}
                        </TD>

                        <TD className="text-right tabular-nums font-medium">
                          {formatQuantity(entry.runningBalance)}
                        </TD>
                      </TR>
                    )
                  })
                )}
              </TBody>
            </Table>

            {ledgerData && ledgerData.movements.length > 0 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground bg-surface-subtle">
                <span className="tabular-nums">
                  {ledgerData.movements.length}{' '}
                  {ledgerData.movements.length === 1 ? 'movement' : 'movements'} · Unit:{' '}
                  {currentUom}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <GoodsReceiptDetailsModal
        isOpen={isGrnModalOpen}
        receipt={selectedGrn}
        onClose={() => setIsGrnModalOpen(false)}
        onDownloadPdf={handleDownloadGrnPdf}
      />

      <OpeningStockDetailsModal
        isOpen={isOpeningStockModalOpen}
        openingStock={selectedOpeningStock}
        onClose={() => {
          setIsOpeningStockModalOpen(false)
          setSelectedOpeningStock(null)
        }}
      />

      <StockTransferDetailsModal
        isOpen={isStockTransferModalOpen}
        transfer={selectedStockTransfer}
        onClose={() => {
          setIsStockTransferModalOpen(false)
          setSelectedStockTransfer(null)
        }}
      />

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
