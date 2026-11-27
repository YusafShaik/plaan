import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Truck, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
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
    <ContentCanvas className="space-y-8 pt-2">
      <header className="space-y-5">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Dispatch
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Outbound shipments against sales orders.
          </p>
        </div>
        <UnderlineTabs
          items={[{ id: 'orders', label: 'Dispatch Orders' }]}
          value={activeSubTab}
          onChange={() => {}}
        />
      </header>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search dispatch orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm rounded-md border border-border/80 bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-colors"
          />
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditingDispatch(null)
            setIsCreateModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          New dispatch
        </Button>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <Table className="border-0 rounded-none shadow-none bg-transparent">
          <THead>
            <tr>
              <TH>Dispatch no.</TH>
              <TH>Sales order</TH>
              <TH>Customer</TH>
              <TH className="text-right">Status</TH>
            </tr>
          </THead>
          <TBody>
              {isLoading ? (
                <TR>
                  <TD colSpan={4} className="py-12 text-center font-normal text-muted-foreground">
                    Loading dispatch orders...
                  </TD>
                </TR>
              ) : dispatches.length === 0 ? (
                <TR>
                  <TD colSpan={4} className="py-12 text-center font-normal">
                    <Truck className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">No dispatch orders found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {search ? 'Try clearing your search query.' : 'Create a dispatch against a confirmed Sales Order to get started.'}
                    </p>
                  </TD>
                </TR>
              ) : (
                dispatches.map((d) => (
                  <TR
                    key={d.id}
                    onClick={() => handleRowClick(d)}
                    clickable
                  >
                    <TD>
                      <span className="text-ref-link">
                        {d.dispatchNumber}
                      </span>
                    </TD>
                    <TD>
                      <span className="text-ref text-foreground">
                        {d.salesOrderNumber}
                      </span>
                    </TD>
                    <TD className="font-medium">
                      {d.customerName}
                    </TD>
                    <TD className="text-right">
                      {d.status === 'POSTED' ? (
                        <Badge variant="success">Posted</Badge>
                      ) : (
                        <Badge variant="neutral">Draft</Badge>
                      )}
                    </TD>
                  </TR>
                ))
              )}
          </TBody>
        </Table>

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
              <span className="px-2 text-muted-foreground tabular-nums">
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
    </ContentCanvas>
  )
}
