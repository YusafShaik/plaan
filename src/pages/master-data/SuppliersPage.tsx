import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search,
  Filter,
  MoreHorizontal,
  Power,
  ChevronLeft,
  ChevronRight,
  X,
  Truck,
  Download,
  RotateCcw,
  Check,
  Phone,
  Mail,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { CreateSupplierModal } from './CreateSupplierModal'
import { masterDataService } from '../../services/masterDataService'
import type {
  Supplier,
  CreateSupplierPayload,
  PageResponse,
  SupplierSummary,
} from '../../types/masterData'

export interface SuppliersPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
  showHeader?: boolean
}

export function SuppliersPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
  showHeader = true,
}: SuppliersPageProps = {}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [summary, setSummary] = useState<SupplierSummary | null>(null)
  const [pageData, setPageData] = useState<PageResponse<Supplier> | null>(null)
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
      .getSupplierSummary()
      .then(setSummary)
      .catch((err) => console.error('Failed to load supplier summary', err))
  }, [])

  const loadSuppliers = useCallback(
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
        .getSuppliers({
          search: search.trim() || undefined,
          active,
          page,
          size: pageSize,
        })
        .then((res) => {
          setSuppliers(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load suppliers.')
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
      loadSuppliers(0)
    }, 250)
    return () => clearTimeout(timer)
  }, [loadSuppliers])

  const handleCreateSupplier = async (payload: CreateSupplierPayload) => {
    await masterDataService.createSupplier(payload)
    loadSummary()
    loadSuppliers(0)
  }

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      const updated = await masterDataService.toggleSupplierStatus(supplier.id)
      setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? updated : s)))
      loadSummary()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update supplier status')
    } finally {
      setActiveMenuId(null)
    }
  }

  const handleExport = () => {
    if (suppliers.length === 0) return
    const headers = ['Supplier Code', 'Name', 'Contact Person', 'Phone', 'Email', 'GSTIN / Tax ID', 'Status', 'Address']
    const rows = suppliers.map((s) => [
      `"${s.supplierCode.replace(/"/g, '""')}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${(s.contactPerson || '').replace(/"/g, '""')}"`,
      `"${(s.phone || '').replace(/"/g, '""')}"`,
      `"${(s.email || '').replace(/"/g, '""')}"`,
      `"${(s.taxId || '').replace(/"/g, '""')}"`,
      s.active ? 'Active' : 'Inactive',
      `"${(s.address || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `suppliers_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const hasActiveFilters = selectedStatusFilter !== 'all' || search.trim() !== ''

  const clearAllFilters = () => {
    setSelectedStatusFilter('all')
    setSearch('')
  }

  const totalCount = pageData?.totalElements ?? suppliers.length

  return (
    <div className="space-y-4">
      {/* Optional Standalone Header (skipped when rendered inside MasterDataPage) */}
      {showHeader && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Suppliers
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage procurement vendors, trade partners, and raw material suppliers.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 bg-ink text-ink-foreground hover:opacity-90 font-medium px-4 py-2 rounded-md cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <span>Add supplier</span>
          </Button>
        </div>
      )}

      {/* 2. Summary KPI Metrics Strip (Horizontal data hierarchy EXACTLY matching ItemsPage) */}
      <div className="flex flex-wrap items-center gap-10 py-3 border-b border-border">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Total suppliers</p>
          <p className="text-[24px] font-semibold tracking-tight text-foreground mt-1">
            {summary?.totalSuppliers ?? suppliers.length}
          </p>
        </div>

        <div className="h-9 w-px bg-border" />

        <div>
          <p className="text-sm font-medium text-muted-foreground">Active in procurement</p>
          <p className="text-[24px] font-semibold tracking-tight text-success mt-1">
            {summary?.activeSuppliers ?? suppliers.filter((s) => s.active).length}
          </p>
        </div>

        <div className="h-9 w-px bg-border" />

        <div>
          <p className="text-sm font-medium text-muted-foreground">Inactive / Suspended</p>
          <p className="text-[24px] font-semibold tracking-tight text-muted-foreground mt-1">
            {summary?.inactiveSuppliers ?? suppliers.filter((s) => !s.active).length}
          </p>
        </div>
      </div>

      {/* 3. Toolbar: Active filter chip on Left, Right Search + Filter + Export */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedStatusFilter !== 'all' ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-sm text-foreground animate-in fade-in-50 duration-150">
              <span className="text-muted-foreground text-xs font-normal">Status:</span>
              <span className="font-medium">
                {selectedStatusFilter === 'active' ? 'Active' : 'Inactive'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('all')}
                className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Clear status filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground font-normal">
              Showing {totalCount} suppliers
            </span>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm font-medium text-muted-foreground hover:text-foreground underline decoration-muted-foreground/40 underline-offset-2 ml-1 cursor-pointer"
            >
              Reset all
            </button>
          )}
        </div>

        {/* Right side controls: Search bar, Filter Dropdown button, Export */}
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-64 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, code, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-sm font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Filter Dropdown Button & Popover */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-10 w-10 flex items-center justify-center rounded-md border transition-colors cursor-pointer relative ${
                isFilterOpen || selectedStatusFilter !== 'all'
                  ? 'border-accent bg-brand/15 text-brand-deep'
                  : 'border-border/80 bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
              title="Filter by Status"
            >
              <Filter className="h-4 w-4" />
              {selectedStatusFilter !== 'all' && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-deep" />
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 z-30 w-64 rounded-md border border-border bg-card p-3.5 shadow-panel animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Filter by Status
                  </span>
                  {selectedStatusFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatusFilter('all')
                        setIsFilterOpen(false)
                      }}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                <div className="pt-2.5 space-y-1">
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
            )}
          </div>

          {/* Export button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={suppliers.length === 0}
            className="h-10 px-4 gap-2 rounded-md border-border text-sm font-medium text-foreground hover:bg-secondary cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* 4. Enterprise Data Table */}
      <Table>
        <THead>
          <tr>
            <TH>Supplier code</TH>
            <TH>Supplier name</TH>
            <TH>Contact person</TH>
            <TH>Contact info</TH>
            <TH>GSTIN / Tax ID</TH>
            <TH>Status</TH>
            <TH className="text-right w-12" />
          </tr>
        </THead>
        <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={7} className="py-16 text-center font-normal text-muted-foreground">
                  Loading suppliers...
                </TD>
              </TR>
            ) : error ? (
              <TR>
                <TD colSpan={7} className="py-16 text-center font-normal text-destructive">
                  {error}
                </TD>
              </TR>
            ) : suppliers.length === 0 ? (
              <TR>
                <TD colSpan={7} className="py-16 text-center font-normal">
                  <p className="text-base font-semibold text-foreground">
                    No suppliers found
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    {search || selectedStatusFilter !== 'all'
                      ? 'Try clearing your filters or changing your search terms.'
                      : 'Your organization supplier master is empty. Click "+ Add supplier" above to register your first supplier.'}
                  </p>
                </TD>
              </TR>
            ) : (
              suppliers.map((supplier) => (
                <TR
                  key={supplier.id}
                  clickable
                  className="group"
                >
                  <TD className="text-ref text-foreground">
                    {supplier.supplierCode}
                  </TD>

                  <TD>
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 text-muted-foreground/80 shrink-0 group-hover:text-foreground transition-colors" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{supplier.name}</p>
                        {supplier.address && (
                          <p className="text-xs font-normal text-muted-foreground mt-0.5 line-clamp-1 max-w-xs">
                            {supplier.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </TD>

                  <TD className="font-normal">
                    {supplier.contactPerson || '—'}
                  </TD>

                  <TD className="font-normal text-muted-foreground">
                    <div className="space-y-0.5">
                      {supplier.phone && (
                        <p className="flex items-center gap-1.5 text-foreground">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{supplier.phone}</span>
                        </p>
                      )}
                      {supplier.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[180px]">{supplier.email}</span>
                        </p>
                      )}
                      {!supplier.phone && !supplier.email && <span>—</span>}
                    </div>
                  </TD>

                  <TD className="text-ref text-foreground font-normal">
                    {supplier.taxId || '—'}
                  </TD>

                  <TD>
                    <Badge variant={supplier.active ? 'success' : 'neutral'}>
                      {supplier.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>

                  <TD className="text-right relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuId(activeMenuId === supplier.id ? null : supplier.id)
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                      title="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {activeMenuId === supplier.id && (
                      <div
                        ref={actionMenuRef}
                        className="absolute right-4 top-10 z-20 w-44 rounded-md border border-border bg-card p-1 shadow-panel animate-in fade-in-50 zoom-in-95 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(supplier)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                        >
                          <Power className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{supplier.active ? 'Deactivate supplier' : 'Activate supplier'}</span>
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
            suppliers
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageData.first || isLoading}
              onClick={() => loadSuppliers(currentPage - 1)}
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
              onClick={() => loadSuppliers(currentPage + 1)}
              className="gap-1 rounded-md px-3"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 6. Modal for Adding New Supplier */}
      <CreateSupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateSupplier}
      />
    </div>
  )
}
