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
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
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
  showHeader = true,
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
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Status filter dropdown */}
          <NativeSelect
            dense
            className="w-auto min-w-[9.5rem]"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
            }
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </NativeSelect>

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

        {/* Add lives in MasterDataPage header when embedded (showHeader=false) */}
        {showHeader && (
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="primary" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" />
              Add customer
            </Button>
          </div>
        )}
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
          <div className="py-16 text-center rounded-md border border-border/80 bg-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No customers found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Customer Master maintains customer organizations and shipping details for sales and dispatch.
            </p>
            <Button
              size="sm"
              variant="primary"
              className="mt-4"
              onClick={handleOpenAdd}
            >
              <Plus className="h-3.5 w-3.5" />
              Add customer
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Code</TH>
                  <TH>Customer name</TH>
                  <TH>Contact person</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {customers.map((c) => (
                  <TR
                    key={c.id}
                    clickable
                    className="group"
                    onClick={() => handleOpenEdit(c)}
                  >
                    <TD>
                      <span className="text-ref-link">
                        {c.customerCode}
                      </span>
                    </TD>

                    <TD>
                      {c.name}
                      {c.taxId && (
                        <span className="block text-xs text-ref text-muted-foreground mt-0.5">
                          GSTIN: {c.taxId}
                        </span>
                      )}
                    </TD>

                    <TD className="text-muted-foreground font-normal">
                      <p className="text-foreground">{c.contactPerson || '—'}</p>
                      {c.phone && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.phone}
                        </p>
                      )}
                    </TD>

                    <TD>
                      <Badge variant={c.active ? 'success' : 'neutral'}>
                        {c.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TD>

                    <TD
                      className="text-right space-x-1 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                        title="Edit Customer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                          c.active
                            ? 'text-muted-foreground hover:bg-secondary hover:text-warning'
                            : 'text-muted-foreground hover:bg-secondary hover:text-success'
                        }`}
                        title={c.active ? 'Deactivate Customer' : 'Activate Customer'}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                        title="Delete Customer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            {/* Pagination Controls */}
            {pageData && pageData.totalPages > 1 && (
              <div className="flex items-center justify-between border border-t-0 border-border/80 rounded-b-md bg-card px-4 py-3 text-xs text-muted-foreground">
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
                  <span className="tabular-nums text-foreground">
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
          </>
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
