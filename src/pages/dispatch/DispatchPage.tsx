import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Truck, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { dispatchService } from '../../services/dispatchService'
import { CreateDispatchModal } from './CreateDispatchModal'
import { DispatchDetailsModal } from './DispatchDetailsModal'
import type { DispatchOrder } from '../../types/dispatch'

export function DispatchPage() {
  const [activeSubTab] = useState<'orders'>('orders')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 10

  const [dispatches, setDispatches] = useState<DispatchOrder[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchOrder | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [editingDispatch, setEditingDispatch] = useState<DispatchOrder | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchDispatches = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await dispatchService.getDispatchOrders({
        search: debouncedSearch || undefined,
        page,
        size: pageSize,
        sortBy: 'createdAt',
        direction: 'desc',
      })
      setDispatches(res.content)
      setTotalElements(res.totalElements)
      setTotalPages(res.totalPages)
    } catch (err) {
      console.error('Failed to fetch dispatch orders:', err)
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, page, pageSize])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDispatches()
    })
  }, [fetchDispatches])

  const handleRowClick = (d: DispatchOrder) => {
    setSelectedDispatch(d)
    setIsDetailsModalOpen(true)
  }

  const handleEditDispatch = (d: DispatchOrder) => {
    setEditingDispatch(d)
    setIsCreateModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Page Header matching Screenshot 1 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dispatch</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage outgoing goods and customer shipments.
        </p>
      </div>

      {/* Tabs matching Screenshot 1 */}
      <div className="flex items-center gap-6 border-b border-border text-sm font-medium">
        <button
          type="button"
          className={`pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
            activeSubTab === 'orders'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Dispatch Orders
          {activeSubTab === 'orders' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search dispatch orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-[10px] border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-foreground transition-colors"
          />
        </div>

        <Button
          onClick={() => {
            setEditingDispatch(null)
            setIsCreateModalOpen(true)
          }}
          className="bg-[#107048] hover:bg-[#0d603e] text-white font-medium text-xs sm:text-sm px-4 h-10 rounded-[10px] cursor-pointer shadow-xs flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Dispatch</span>
        </Button>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="overflow-hidden rounded-[12px] border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/30 font-semibold text-muted-foreground">
                <th className="py-3 px-4">Dispatch No.</th>
                <th className="py-3 px-4">Sales Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    Loading dispatch orders...
                  </td>
                </tr>
              ) : dispatches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <Truck className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">No dispatch orders found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {search ? 'Try clearing your search query.' : 'Create a dispatch against a confirmed Sales Order to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                dispatches.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => handleRowClick(d)}
                    className="hover:bg-secondary/25 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {d.dispatchNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {d.salesOrderNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {d.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {d.status === 'POSTED' ? (
                        <span className="font-semibold text-emerald-400">Posted</span>
                      ) : (
                        <span className="font-medium text-muted-foreground">Draft</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/15 text-xs">
            <span className="text-muted-foreground">
              Showing {dispatches.length} of {totalElements} orders
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 text-muted-foreground font-mono">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dispatch Modal */}
      <CreateDispatchModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingDispatch(null)
        }}
        onSuccess={() => {
          fetchDispatches()
        }}
        editingDispatch={editingDispatch}
      />

      {/* Details Modal */}
      <DispatchDetailsModal
        isOpen={isDetailsModalOpen}
        dispatch={selectedDispatch}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedDispatch(null)
        }}
        onEdit={(d) => {
          setIsDetailsModalOpen(false)
          handleEditDispatch(d)
        }}
        onDispatchUpdated={() => {
          fetchDispatches()
        }}
      />
    </div>
  )
}
