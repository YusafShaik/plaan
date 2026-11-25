import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search,
  Filter,
  MoreHorizontal,
  Power,
  ChevronLeft,
  ChevronRight,
  X,
  Warehouse as WarehouseIcon,
  Download,
  RotateCcw,
  Check,
  MapPin,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { CreateWarehouseModal } from './CreateWarehouseModal'
import { masterDataService } from '../../services/masterDataService'
import type {
  Warehouse,
  CreateWarehousePayload,
  PageResponse,
  WarehouseSummary,
} from '../../types/masterData'

export interface WarehousesPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
  showHeader?: boolean
}

export function WarehousesPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
  showHeader = true,
}: WarehousesPageProps = {}) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [summary, setSummary] = useState<WarehouseSummary | null>(null)
  const [pageData, setPageData] = useState<PageResponse<Warehouse> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  const isModalOpen = controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsModalOpen = setControlledModalOpen || setInternalModalOpen

  const filterRef = useRef<HTMLDivElement>(null)
  const actionMenuRef = useRef<HTMLDivElement>(null)

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadSummary = useCallback(() => {
    masterDataService
      .getWarehouseSummary()
      .then(setSummary)
      .catch((err) => console.error('Failed to load warehouse summary', err))
  }, [])

  const loadWarehouses = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)

      const active =
        selectedStatusFilter === 'active'
          ? true
          : selectedStatusFilter === 'inactive'
          ? false
          : undefined

      masterDataService
        .getWarehouses({
          search: search.trim() || undefined,
          active,
          page,
          size: pageSize,
        })
        .then((res) => {
          setWarehouses(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load warehouses.')
          setIsLoading(false)
        })
    },
    [search, selectedStatusFilter, pageSize]
  )

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWarehouses(0)
    }, 250)
    return () => clearTimeout(timer)
  }, [loadWarehouses])

  const handleCreateWarehouse = async (payload: CreateWarehousePayload) => {
    await masterDataService.createWarehouse(payload)
    loadSummary()
    loadWarehouses(0)
  }

  const handleToggleStatus = async (warehouse: Warehouse) => {
    try {
      const updated = await masterDataService.toggleWarehouseStatus(warehouse.id)
      setWarehouses((prev) => prev.map((w) => (w.id === warehouse.id ? updated : w)))
      loadSummary()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update warehouse status')
    } finally {
      setActiveMenuId(null)
    }
  }

  const handleExport = () => {
    if (warehouses.length === 0) return
    const headers = ['Warehouse Code', 'Name', 'Address / Location', 'Description', 'Status']
    const rows = warehouses.map((w) => [
      `"${w.warehouseCode.replace(/"/g, '""')}"`,
      `"${w.name.replace(/"/g, '""')}"`,
      `"${(w.address || '').replace(/"/g, '""')}"`,
      `"${(w.description || '').replace(/"/g, '""')}"`,
      w.active ? 'Active' : 'Inactive',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `warehouses_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const hasActiveFilters = selectedStatusFilter !== 'all' || search.trim() !== ''

  const clearAllFilters = () => {
    setSelectedStatusFilter('all')
    setSearch('')
  }

  const totalCount = pageData?.totalElements ?? warehouses.length

  return (
    <div className="space-y-4">
      {/* 1. Header if rendered standalone */}
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3.5">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Warehouses
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage storage facilities, depots, and inventory locations.
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 bg-[#171717] text-white hover:opacity-90 font-medium px-4 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            <span>+ Add warehouse</span>
          </Button>
        </div>
      )}

      {/* 2. Unified Metric Strip */}
      <div className="flex items-center gap-6 py-1">
        <div>
          <span className="text-xs text-muted-foreground font-medium">Total warehouses</span>
          <p className="text-xl font-semibold text-foreground tracking-tight mt-0.5">
            {summary?.totalWarehouses ?? warehouses.length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Active</span>
          <p className="text-xl font-semibold text-emerald-600 tracking-tight mt-0.5">
            {summary?.activeWarehouses ?? warehouses.filter((w) => w.active).length}
          </p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <span className="text-xs text-muted-foreground font-medium">Inactive</span>
          <p className="text-xl font-semibold text-muted-foreground tracking-tight mt-0.5">
            {summary?.inactiveWarehouses ?? warehouses.filter((w) => !w.active).length}
          </p>
        </div>
      </div>

      {/* 3. Toolbar: Active filter chip on Left, Right Search + Filter + Export */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedStatusFilter !== 'all' ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-sm text-foreground animate-in fade-in-50 duration-150">
              <span className="text-muted-foreground text-xs font-normal">Status:</span>
              <span className="font-medium text-xs capitalize">{selectedStatusFilter}</span>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('all')}
                className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Remove filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">All warehouses</span>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer ml-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset all
            </button>
          )}
        </div>

        {/* Right side controls: Search bar, Filter Dropdown button, Export */}
        <div className="flex items-center gap-2.5">
          {/* Search bar with sharp black focus ring */}
          <div className="relative w-64 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search code, name, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary pl-10 pr-3.5 text-sm font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Filter Dropdown Button & Popover */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex h-10 w-10 items-center justify-center rounded-[10px] border transition-colors cursor-pointer ${
                selectedStatusFilter !== 'all' || isFilterOpen
                  ? 'border-foreground bg-secondary text-foreground'
                  : 'border-border/80 bg-secondary text-muted-foreground hover:text-foreground hover:border-border'
              }`}
              title="Filter by status"
            >
              <Filter className="h-4 w-4" />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-[12px] border border-border bg-white p-2 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-2 py-1.5 border-b border-border/60 mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Filter Status</span>
                  {selectedStatusFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilter('all')}
                      className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {[
                    { id: 'all', label: 'All Statuses' },
                    { id: 'active', label: 'Active only' },
                    { id: 'inactive', label: 'Inactive only' },
                  ].map((option) => {
                    const isSelected = selectedStatusFilter === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedStatusFilter(option.id)
                          setIsFilterOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-secondary text-foreground font-semibold'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-foreground stroke-[2.5]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={warehouses.length === 0}
            className="flex h-10 items-center gap-1.5 rounded-[10px] border border-border/80 bg-secondary px-3.5 text-xs font-medium text-foreground hover:border-border hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Export as CSV"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 4. Table Data Section with Row Hover */}
      <div className="w-full">
        {isLoading && warehouses.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading warehouses...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadWarehouses(0)}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <WarehouseIcon className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No warehouses found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {search || selectedStatusFilter !== 'all'
                ? 'No warehouses match your current filter criteria. Try resetting filters.'
                : 'Your organization warehouse directory is empty. Click "+ Add warehouse" above to register your first warehouse.'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="mt-4 gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset filters</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-sm font-semibold text-foreground">
                  <th className="py-3.5 px-4 font-semibold">Warehouse code</th>
                  <th className="py-3.5 px-4 font-semibold">Warehouse name</th>
                  <th className="py-3.5 px-4 font-semibold">Address / Location</th>
                  <th className="py-3.5 px-4 font-semibold">Description</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 text-right w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {warehouses.map((w) => (
                  <tr
                    key={w.id}
                    className="group border-b border-border/50 hover:bg-secondary/70 transition-colors duration-150 cursor-pointer"
                  >
                    {/* Warehouse Code */}
                    <td className="py-4 px-4 font-mono text-sm font-normal text-muted-foreground">
                      {w.warehouseCode}
                    </td>

                    {/* Warehouse Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <WarehouseIcon className="h-4 w-4 text-muted-foreground/80 shrink-0 group-hover:text-foreground transition-colors" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{w.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Address / Location */}
                    <td className="py-4 px-4 text-sm font-normal text-foreground">
                      {w.address ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="line-clamp-1 max-w-xs">{w.address}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-4 px-4 text-sm font-normal text-muted-foreground">
                      {w.description ? (
                        <span className="line-clamp-1 max-w-xs block">{w.description}</span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>

                    {/* Status Indicator */}
                    <td className="py-4 px-4">
                      {w.active ? (
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                          <span className="h-2 w-2 rounded-full bg-[#048140]" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions Context Menu */}
                    <td className="py-4 px-4 text-right relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === w.id ? null : w.id)}
                        className="p-1.5 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                        title="Actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {activeMenuId === w.id && (
                        <div
                          ref={actionMenuRef}
                          className="absolute right-4 top-10 z-50 w-40 rounded-[10px] border border-border bg-white p-1 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100 text-left"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(w)}
                            className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary cursor-pointer transition-colors"
                          >
                            <Power className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Mark as {w.active ? 'Inactive' : 'Active'}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Footer */}
        {warehouses.length > 0 && pageData && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60 text-xs text-muted-foreground">
            <div>
              Showing {warehouses.length} of {totalCount} warehouses
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 0 || isLoading}
                onClick={() => loadWarehouses(currentPage - 1)}
                className="flex items-center gap-1 rounded-[8px] border border-border/80 bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="px-2 font-medium text-foreground">
                Page {currentPage + 1} of {Math.max(1, pageData.totalPages)}
              </span>
              <button
                type="button"
                disabled={currentPage + 1 >= pageData.totalPages || isLoading}
                onClick={() => loadWarehouses(currentPage + 1)}
                className="flex items-center gap-1 rounded-[8px] border border-border/80 bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      <CreateWarehouseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateWarehouse}
      />
    </div>
  )
}
