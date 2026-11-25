import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Power,
  RotateCcw,
  Users,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { CreateCustomerModal } from './CreateCustomerModal'
import { masterDataService } from '../../services/masterDataService'
import type { Customer, PageResponse } from '../../types/masterData'

export interface CustomersPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
  showHeader?: boolean
}

export function CustomersPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
}: CustomersPageProps = {}) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pageData, setPageData] = useState<PageResponse<Customer> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isModalOpen = controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsModalOpen = setControlledModalOpen || setInternalModalOpen

  const loadCustomers = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)

      const active =
        statusFilter === 'active'
          ? true
          : statusFilter === 'inactive'
          ? false
          : undefined

      masterDataService
        .getCustomers({
          search: search.trim() || undefined,
          active,
          page,
          size: pageSize,
        })
        .then((res) => {
          setCustomers(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load customers.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(0)
    }, 200)
    return () => clearTimeout(timer)
  }, [loadCustomers])

  const handleOpenAdd = () => {
    setCustomerToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (customer: Customer) => {
    setCustomerToEdit(customer)
    setIsModalOpen(true)
  }

  const handleToggleStatus = async (customer: Customer) => {
    try {
      await masterDataService.toggleCustomerStatus(customer.id)
      loadCustomers(currentPage)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update customer status.')
    }
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete customer "${customer.name}" (${customer.customerCode})?`)) {
      return
    }

    try {
      await masterDataService.deleteCustomer(customer.id)
      loadCustomers(currentPage)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete customer.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar matching Screenshot 1: Search customers... on Left, + Add Customer on Right */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-64 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-[10px] border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Status filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="flex h-10 items-center rounded-[10px] border border-border/80 bg-secondary px-3 text-xs font-medium text-foreground focus:outline-none focus:border-foreground cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {(search || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ml-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        {/* Right side: + Add Customer button */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={handleOpenAdd}
            className="flex h-10 items-center gap-1.5 rounded-[10px] bg-[#107048] hover:bg-[#0d603e] text-white px-4 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </Button>
        </div>
      </div>

      {/* Table Section matching Screenshot 1 */}
      <div className="w-full">
        {isLoading && customers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading customers...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true)
                loadCustomers(0)
              }}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center rounded-[12px] border border-border/80 bg-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No customers found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Customer Master maintains customer organizations and shipping details for sales and dispatch.
            </p>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="mt-4 gap-1.5 text-xs bg-[#107048] hover:bg-[#0d603e] text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Customer</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[12px] border border-border/80 bg-card">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="py-3.5 px-4 font-normal">Code</th>
                  <th className="py-3.5 px-4 font-normal">Customer Name</th>
                  <th className="py-3.5 px-4 font-normal">Contact Person</th>
                  <th className="py-3.5 px-4 font-normal">Status</th>
                  <th className="py-3.5 px-4 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-secondary/40 transition-colors cursor-pointer group"
                    onClick={() => handleOpenEdit(c)}
                  >
                    {/* Code */}
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {c.customerCode}
                    </td>

                    {/* Customer Name */}
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {c.name}
                      {c.taxId && (
                        <span className="block text-[11px] text-muted-foreground font-mono mt-0.5">
                          GSTIN: {c.taxId}
                        </span>
                      )}
                    </td>

                    {/* Contact Person */}
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <p className="text-foreground">{c.contactPerson || '—'}</p>
                      {c.phone && (
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {c.phone}
                        </p>
                      )}
                    </td>

                    {/* Status matching Screenshot 1: Active in green, Inactive in muted */}
                    <td className="py-3.5 px-4">
                      {c.active ? (
                        <span className="text-emerald-500 font-medium">Active</span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Inactive</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="rounded-[6px] p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                        title="Edit Customer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`rounded-[6px] p-1.5 transition-colors cursor-pointer ${
                          c.active
                            ? 'text-muted-foreground hover:bg-secondary hover:text-amber-500'
                            : 'text-muted-foreground hover:bg-secondary hover:text-emerald-500'
                        }`}
                        title={c.active ? 'Deactivate Customer' : 'Activate Customer'}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="rounded-[6px] p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                        title="Delete Customer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {pageData && pageData.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <span>
                  Showing {pageData.page * pageData.size + 1} to{' '}
                  {Math.min((pageData.page + 1) * pageData.size, pageData.totalElements)} of{' '}
                  {pageData.totalElements} customers
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageData.first}
                    onClick={() => loadCustomers(currentPage - 1)}
                    className="h-7 text-xs px-2.5"
                  >
                    Previous
                  </Button>
                  <span className="font-mono text-foreground">
                    {pageData.page + 1} / {pageData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageData.last}
                    onClick={() => loadCustomers(currentPage + 1)}
                    className="h-7 text-xs px-2.5"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Customer Modal */}
      <CreateCustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setCustomerToEdit(null)
        }}
        onSuccess={() => {
          loadCustomers(currentPage)
        }}
        customerToEdit={customerToEdit}
      />
    </div>
  )
}
