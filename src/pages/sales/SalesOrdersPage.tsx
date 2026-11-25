import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  RotateCcw,
  ShoppingCart,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Ban,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { CreateSalesOrderModal } from './CreateSalesOrderModal'
import { SalesOrderDetailsModal } from './SalesOrderDetailsModal'
import { salesService } from '../../services/salesService'
import { useAuth } from '../../hooks/useAuth'
import type { SalesOrder, SalesOrderStatus } from '../../types/sales'
import type { PageResponse } from '../../types/masterData'

export function SalesOrdersPage() {
  const { organization } = useAuth()
  const currencySymbol =
    organization?.baseCurrency === 'USD'
      ? '$'
      : organization?.baseCurrency === 'EUR'
      ? '€'
      : '₹'

  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [pageData, setPageData] = useState<PageResponse<SalesOrder> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SalesOrderStatus | ''>('')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [orderToEdit, setOrderToEdit] = useState<SalesOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const loadOrders = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)

      salesService
        .getSalesOrders({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          page,
          size: pageSize,
          sortBy: 'createdAt',
          direction: 'desc',
        })
        .then((res) => {
          setOrders(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load sales orders.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders(0)
    }, 200)
    return () => clearTimeout(timer)
  }, [loadOrders])

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`
  }

  const handleOpenCreate = () => {
    setOrderToEdit(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (order: SalesOrder) => {
    setOrderToEdit(order)
    setIsCreateModalOpen(true)
  }

  const handleOpenDetails = async (order: SalesOrder) => {
    setSelectedOrder(order)
    setIsDetailsModalOpen(true)
    try {
      const detailed = await salesService.getSalesOrderById(order.id)
      setSelectedOrder(detailed)
    } catch (err) {
      console.error('Failed to get full sales order details', err)
    }
  }

  const handleConfirmOrder = async (order: SalesOrder) => {
    try {
      await salesService.confirmSalesOrder(order.id)
      loadOrders(currentPage)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to confirm sales order')
    }
  }

  const handleCancelOrder = async (order: SalesOrder) => {
    if (!confirm(`Are you sure you want to cancel sales order ${order.orderNumber}?`)) return
    try {
      await salesService.cancelSalesOrder(order.id)
      loadOrders(currentPage)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel sales order')
    }
  }

  const handleDeleteDraft = async (order: SalesOrder) => {
    if (!confirm(`Are you sure you want to delete draft order ${order.orderNumber}?`)) return
    try {
      await salesService.deleteSalesOrder(order.id)
      loadOrders(currentPage)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete draft order')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar matching Screenshot 1: Search on Left, + New Sales Order on Right */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-64 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search sales orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Status Filter */}
          <NativeSelect
            dense
            className="w-auto min-w-[9.5rem]"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as SalesOrderStatus | '')
            }
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </NativeSelect>

          {(search || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ml-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        {/* Right side: + New Sales Order button */}
        <div className="flex items-center gap-2.5">
          <Button type="button" variant="primary" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            New sales order
          </Button>
        </div>
      </div>

      {/* Table Section matching Screenshot 1: Order No. | Customer | Amount | Status */}
      <div className="w-full">
        {isLoading && orders.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading sales orders...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true)
                loadOrders(0)
              }}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center rounded-md border border-border/80 bg-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No sales orders found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Sales Orders record customer purchase requirements, agreed selling prices, and delivery terms.
            </p>
            <Button
              size="sm"
              variant="primary"
              className="mt-4"
              onClick={handleOpenCreate}
            >
              <Plus className="h-3.5 w-3.5" />
              Create first sales order
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Order no.</TH>
                  <TH>Customer</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {orders.map((o) => (
                  <TR
                    key={o.id}
                    clickable
                    className="group"
                    onClick={() => handleOpenDetails(o)}
                  >
                    <TD>
                      <span className="text-ref-link">
                        {o.orderNumber}
                      </span>
                    </TD>

                    <TD>
                      <p className="font-medium">{o.customerName}</p>
                      <p className="text-[11px] text-ref text-muted-foreground">
                        {o.customerCode} · WH: {o.warehouseName}
                      </p>
                    </TD>

                    <TD className="font-mono font-medium">
                      {formatCurrency(o.totalAmount)}
                    </TD>

                    <TD>
                      {o.status === 'CONFIRMED' && (
                        <Badge variant="success">Confirmed</Badge>
                      )}
                      {o.status === 'DRAFT' && (
                        <Badge variant="neutral">Draft</Badge>
                      )}
                      {o.status === 'CANCELLED' && (
                        <Badge variant="destructive">Cancelled</Badge>
                      )}
                    </TD>

                    <TD
                      className="text-right space-x-1 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(o)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                        title="View Order Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {o.status === 'DRAFT' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(o)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                            title="Edit Draft"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleConfirmOrder(o)}
                            className="rounded-md p-1.5 text-success hover:bg-success/10 transition-colors cursor-pointer"
                            title="Confirm Order"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(o)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            title="Delete Draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}

                      {o.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(o)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                          title="Cancel Order"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
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
                  {pageData.totalElements} orders
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageData.first}
                    onClick={() => loadOrders(currentPage - 1)}
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
                    onClick={() => loadOrders(currentPage + 1)}
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

      {/* Create / Edit Modal */}
      <CreateSalesOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setOrderToEdit(null)
        }}
        onSuccess={() => {
          loadOrders(currentPage)
        }}
        orderToEdit={orderToEdit}
      />

      {/* Details Modal */}
      <SalesOrderDetailsModal
        isOpen={isDetailsModalOpen}
        order={selectedOrder}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedOrder(null)
        }}
        onEdit={(ord) => {
          setIsDetailsModalOpen(false)
          handleOpenEdit(ord)
        }}
        onOrderUpdated={() => {
          loadOrders(currentPage)
        }}
      />
    </div>
  )
}
