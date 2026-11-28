import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Filter,
  MoreHorizontal,
  Package,
  Power,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  RotateCcw,
  Check,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmptyState } from '../../components/ui/Table'
import { CreateItemModal } from './CreateItemModal'
import { masterDataService } from '../../services/masterDataService'
import { toast } from '../../lib/feedback'
import type {
  Item,
  ItemType,
  CreateItemPayload,
  PageResponse,
  ItemSummary,
} from '../../types/masterData'

export interface ItemsPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
  showHeader?: boolean
}

export function ItemsPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
  showHeader = true,
}: ItemsPageProps = {}) {
  const [items, setItems] = useState<Item[]>([])
  const [itemTypes, setItemTypes] = useState<ItemType[]>([])
  const [summary, setSummary] = useState<ItemSummary | null>(null)
  const [pageData, setPageData] = useState<PageResponse<Item> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')
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

  const loadItemTypes = useCallback(() => {
    masterDataService
      .getItemTypes()
      .then(setItemTypes)
      .catch((err) => console.error('Failed to load item types', err))
  }, [])

  const loadSummary = useCallback(() => {
    masterDataService
      .getSummary()
      .then(setSummary)
      .catch((err) => console.error('Failed to load item summary', err))
  }, [])

  const loadItems = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)

      const typeId = selectedTypeFilter !== 'all' ? Number(selectedTypeFilter) : undefined
      const active =
        selectedStatusFilter === 'active'
          ? true
          : selectedStatusFilter === 'inactive'
          ? false
          : undefined

      masterDataService
        .getItems({
          search: search.trim() || undefined,
          typeId,
          active,
          page,
          size: pageSize,
        })
        .then((res) => {
          setItems(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load items.')
          setIsLoading(false)
        })
    },
    [search, selectedTypeFilter, selectedStatusFilter, pageSize]
  )

  useEffect(() => {
    loadItemTypes()
    loadSummary()
  }, [loadItemTypes, loadSummary])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadItems(0)
    }, 250)
    return () => clearTimeout(timer)
  }, [loadItems])

  const handleCreateItem = async (payload: CreateItemPayload) => {
    await masterDataService.createItem(payload)
    loadItemTypes()
    loadSummary()
    loadItems(0)
  }

  const handleToggleStatus = async (item: Item) => {
    try {
      const updated = await masterDataService.toggleStatus(item.id)
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
      loadSummary()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update item status')
    } finally {
      setActiveMenuId(null)
    }
  }

  const handleExport = () => {
    if (items.length === 0) return
    const headers = ['Item Code', 'Item Name', 'Type', 'Unit of Measure', 'Status', 'Description']
    const rows = items.map((i) => [
      `"${i.itemCode.replace(/"/g, '""')}"`,
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.itemType.name.replace(/"/g, '""')}"`,
      `"${i.unitOfMeasure.replace(/"/g, '""')}"`,
      i.active ? 'Active' : 'Inactive',
      `"${(i.description || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `plaan-items-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const selectedTypeName = useMemo(() => {
    if (selectedTypeFilter === 'all') return null
    const found = itemTypes.find((t) => String(t.id) === selectedTypeFilter)
    return found ? found.name : 'Unknown Type'
  }, [selectedTypeFilter, itemTypes])

  const hasActiveFilters = selectedTypeFilter !== 'all' || selectedStatusFilter !== 'all'

  const clearAllFilters = () => {
    setSelectedTypeFilter('all')
    setSelectedStatusFilter('all')
    setIsFilterOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* 1. Optional Standalone Header (skipped when rendered inside MasterDataPage) */}
      {showHeader && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Items
            </h1>
            <p className="text-sm font-normal text-muted-foreground mt-1">
              Manage materials, components and finished products.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 bg-primary text-primary-foreground hover:opacity-90 font-medium px-4 py-2.5 rounded-md text-sm self-start sm:self-auto cursor-pointer"
          >
            <span>Add item</span>
          </Button>
        </div>
      )}

      <KpiCardGrid columns={3}>
        <KpiCard label="Total items" value={summary?.totalItems ?? items.length} />
        <KpiCard
          label="Active items"
          value={summary?.activeItems ?? items.filter((i) => i.active).length}
        />
        <KpiCard
          label="Inactive items"
          value={summary?.inactiveItems ?? items.filter((i) => !i.active).length}
        />
      </KpiCardGrid>

      {/* 3. Toolbar: Search + Filter on Left, Export on Right */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name or code..."
          />

          {/* Filter Dropdown Button & Popover */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-9 w-9 flex items-center justify-center rounded-md border transition-colors cursor-pointer relative ${
                isFilterOpen || hasActiveFilters
                  ? 'border-foreground bg-secondary text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
              title="Filter by type or status"
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-md bg-foreground" />
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute left-0 top-full mt-2 z-30 w-72 rounded-md border border-border bg-card p-3.5 shadow-panel animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Filter by
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Filter by Item Type */}
                <div className="py-2.5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Item Type
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTypeFilter('all')
                        setIsFilterOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors cursor-pointer ${
                        selectedTypeFilter === 'all'
                          ? 'bg-secondary font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      }`}
                    >
                      <span>All Types</span>
                      {selectedTypeFilter === 'all' && (
                        <Check className="h-4 w-4 text-brand-deep" />
                      )}
                    </button>

                    {itemTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setSelectedTypeFilter(String(type.id))
                          setIsFilterOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors cursor-pointer ${
                          selectedTypeFilter === String(type.id)
                            ? 'bg-secondary font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        <span className="truncate">{type.name}</span>
                        {selectedTypeFilter === String(type.id) && (
                          <Check className="h-4 w-4 text-brand-deep" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter by Status */}
                <div className="pt-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Status
                  </p>
                  <div className="space-y-1">
                    {[
                      { value: 'all', label: 'All Statuses' },
                      { value: 'active', label: 'Active Only' },
                      { value: 'inactive', label: 'Inactive Only' },
                    ].map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => {
                          setSelectedStatusFilter(s.value)
                          setIsFilterOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors cursor-pointer ${
                          selectedStatusFilter === s.value
                            ? 'bg-secondary font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        <span>{s.label}</span>
                        {selectedStatusFilter === s.value && (
                          <Check className="h-4 w-4 text-brand-deep" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedTypeName && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{selectedTypeName}</span>
              <button
                type="button"
                onClick={() => setSelectedTypeFilter('all')}
                className="p-0.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear type filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {selectedStatusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">
                {selectedStatusFilter === 'active' ? 'Active' : 'Inactive'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('all')}
                className="p-0.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={items.length === 0}
          className="ml-auto flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {/* 4. Clean Enterprise Data Table */}
      <Table tableClassName="table-fixed">
        <THead>
          <tr>
            <TH className="w-[18%]">Item code</TH>
            <TH className="w-[34%]">Item name</TH>
            <TH className="w-[20%]">Type</TH>
            <TH className="w-[10%]">UOM</TH>
            <TH className="w-[12%]">Status</TH>
            <TH className="w-[6%] text-right" />
          </tr>
        </THead>
        <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={6} className="py-16 text-center text-muted-foreground font-normal">
                  Loading items...
                </TD>
              </TR>
            ) : error ? (
              <TR>
                <TD colSpan={6} className="py-16 text-center text-destructive font-normal">
                  {error}
                </TD>
              </TR>
            ) : items.length === 0 ? (
              <TR>
                <TD colSpan={6} className="p-0">
                  <TableEmptyState
                    icon={<Package className="h-5 w-5" />}
                    title="No items found"
                    description={
                      search || selectedTypeFilter !== 'all' || selectedStatusFilter !== 'all'
                        ? 'Try clearing your filters or changing your search terms.'
                        : 'Create your first item using "+ Add item" above.'
                    }
                  />
                </TD>
              </TR>
            ) : (
              items.map((item) => (
                <TR
                  key={item.id}
                  clickable
                  className="group"
                >
                  <TD className="text-ref text-foreground">
                    {item.itemCode}
                  </TD>

                  <TD>
                    <p className="font-medium text-foreground">{item.name}</p>
                  </TD>

                  <TD className="font-normal">
                    {item.itemType.name}
                  </TD>

                  <TD className="font-normal">
                    {item.unitOfMeasure}
                  </TD>

                  <TD>
                    <Badge variant={item.active ? 'success' : 'neutral'}>
                      {item.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>

                  <TD className="text-right relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuId(activeMenuId === item.id ? null : item.id)
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                      title="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {activeMenuId === item.id && (
                      <div
                        ref={actionMenuRef}
                        className="absolute right-4 top-10 z-20 w-40 rounded-md border border-border bg-card p-1 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                        >
                          <Power className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{item.active ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      </div>
                    )}
                  </TD>
                </TR>
              ))
            )}
        </TBody>
      </Table>

      {/* 5. Pagination Bar */}
      {pageData && pageData.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {currentPage * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium text-foreground">
              {Math.min((currentPage + 1) * pageSize, pageData.totalElements)}
            </span>{' '}
            of{' '}
            <span className="font-medium text-foreground">
              {pageData.totalElements}
            </span>{' '}
            items
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageData.first || isLoading}
              onClick={() => loadItems(currentPage - 1)}
              className="gap-1 rounded-md px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {currentPage + 1} of {pageData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pageData.last || isLoading}
              onClick={() => loadItems(currentPage + 1)}
              className="gap-1 rounded-md px-3"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 6. Modal for Adding New Item */}
      <CreateItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemTypes={itemTypes}
        onSubmit={handleCreateItem}
      />
    </div>
  )
}
