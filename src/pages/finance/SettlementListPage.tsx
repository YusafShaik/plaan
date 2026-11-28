import { useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  CheckCircle2,
  Edit,
  Eye,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  TableEmptyState,
  TablePagination,
} from '../../components/ui/Table'
import { Alert } from '../../components/ui/Alert'
import { useAuth } from '../../hooks/useAuth'
import { formatMoney, formatShortDate } from '../../lib/format'
import { confirmAction, toast } from '../../lib/feedback'
import { cn } from '../../lib/cn'
import { PAYMENT_METHOD_LABELS, POST_STATUS_FILTERS } from './financeHelpers'
import type { PaymentMethod } from '../../types/finance'
import type { PageResponse } from '../../types/masterData'

export interface SettlementRecord {
  id: number
  number: string
  date: string
  invoiceNumber: string
  partyName: string
  paymentMethod: PaymentMethod
  amount: number
  status: 'DRAFT' | 'POSTED'
}

export interface SettlementListPageProps<T> {
  initialInvoiceId?: number | null
  onConsumedInitialInvoice?: () => void
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
  searchPlaceholder: string
  numberHeader: string
  partyHeader: string
  itemLabel: string
  emptyTitle: string
  emptyDescription: string
  deleteTitle: string
  deleteDescription: string
  postVerb: string
  fetchList: (params: {
    search?: string
    status?: 'DRAFT' | 'POSTED'
    page: number
    size: number
  }) => Promise<PageResponse<T>>
  postItem: (id: number) => Promise<unknown>
  deleteItem: (id: number) => Promise<void>
  toRow: (raw: T) => SettlementRecord
  renderModals: (ctx: {
    isCreateOpen: boolean
    closeCreate: () => void
    itemToEdit: T | null
    preselectedInvoiceId: number | null
    selectedItem: T | null
    isDetailsOpen: boolean
    closeDetails: () => void
    openEditFromDetails: (raw: T) => void
    reload: () => void
  }) => ReactNode
}

export function SettlementListPage<T>({
  initialInvoiceId,
  onConsumedInitialInvoice,
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
  searchPlaceholder,
  numberHeader,
  partyHeader,
  itemLabel,
  emptyTitle,
  emptyDescription,
  deleteTitle,
  deleteDescription,
  postVerb,
  fetchList,
  postItem,
  deleteItem,
  toRow,
  renderModals,
}: SettlementListPageProps<T>) {
  const { organization } = useAuth()
  const currency = organization?.baseCurrency

  const [rows, setRows] = useState<T[]>([])
  const [pageData, setPageData] = useState<PageResponse<T> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'DRAFT' | 'POSTED'>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isCreateOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsCreateOpen = setControlledModalOpen || setInternalModalOpen
  const [itemToEdit, setItemToEdit] = useState<T | null>(null)
  const [preselectedInvoiceId, setPreselectedInvoiceId] = useState<number | null>(null)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const loadRows = useCallback(
    (page = 0) => {
      setError(null)
      fetchList({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        page,
        size: pageSize,
      })
        .then((res) => {
          setRows(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : `Failed to load ${itemLabel}.`)
          setIsLoading(false)
        })
    },
    [fetchList, search, statusFilter, pageSize, itemLabel]
  )

  useEffect(() => {
    const timer = setTimeout(() => loadRows(0), 200)
    return () => clearTimeout(timer)
  }, [loadRows])

  useEffect(() => {
    if (!initialInvoiceId) return
    Promise.resolve().then(() => {
      setItemToEdit(null)
      setPreselectedInvoiceId(initialInvoiceId)
      setIsCreateOpen(true)
      onConsumedInitialInvoice?.()
    })
  }, [initialInvoiceId, onConsumedInitialInvoice, setIsCreateOpen])

  useEffect(() => {
    if (openMenuId === null) return
    const handleOutside = () => setOpenMenuId(null)
    window.addEventListener('click', handleOutside)
    return () => window.removeEventListener('click', handleOutside)
  }, [openMenuId])

  const openDetails = (raw: T) => {
    setOpenMenuId(null)
    setSelectedItem(raw)
    setIsDetailsOpen(true)
  }

  const openEdit = (raw: T) => {
    setOpenMenuId(null)
    setItemToEdit(raw)
    setPreselectedInvoiceId(null)
    setIsCreateOpen(true)
  }

  const handlePost = async (row: SettlementRecord) => {
    setOpenMenuId(null)
    setProcessingId(row.id)
    try {
      await postItem(row.id)
      toast.success(`${row.number} posted`)
      loadRows(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to ${postVerb.toLowerCase()}.`)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (row: SettlementRecord) => {
    setOpenMenuId(null)
    const ok = await confirmAction({
      title: deleteTitle,
      description: deleteDescription,
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    setProcessingId(row.id)
    try {
      await deleteItem(row.id)
      toast.success(`Draft ${row.number} deleted`)
      loadRows(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete draft.')
    } finally {
      setProcessingId(null)
    }
  }

  const hasFilters = Boolean(search || statusFilter)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {POST_STATUS_FILTERS.map((pill) => {
            const active = statusFilter === pill.value
            return (
              <button
                key={pill.label}
                type="button"
                onClick={() => setStatusFilter(pill.value)}
                className={cn(
                  'h-8 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {pill.label}
              </button>
            )
          })}
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="rounded-md border border-border/80 bg-card shadow-xs overflow-visible">
        <Table
          className="border-0 rounded-none shadow-none bg-transparent overflow-visible"
          tableClassName="table-fixed"
        >
          <THead>
            <tr>
              <TH className="w-[13%]">{numberHeader}</TH>
              <TH className="w-[12%]">Invoice</TH>
              <TH className="w-[21%]">{partyHeader}</TH>
              <TH className="w-[11%]">Date</TH>
              <TH className="w-[11%]">Method</TH>
              <TH className="w-[11%] text-right">Amount</TH>
              <TH className="w-[10%] pl-6">Status</TH>
              <TH className="w-[11%] px-3 text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && rows.length === 0 ? (
              <TR>
                <TD colSpan={8} className="py-16 text-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-foreground" />
                  Loading {itemLabel}...
                </TD>
              </TR>
            ) : rows.length === 0 ? (
              <TR>
                <TD colSpan={8} className="p-0">
                  <TableEmptyState
                    icon={<Wallet className="h-5 w-5" />}
                    title={emptyTitle}
                    description={
                      hasFilters
                        ? `No ${itemLabel} match your current search or status filter.`
                        : emptyDescription
                    }
                    action={
                      hasFilters ? (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset filters
                        </Button>
                      ) : undefined
                    }
                  />
                </TD>
              </TR>
            ) : (
              rows.map((raw) => {
                const row = toRow(raw)
                const isPosted = row.status === 'POSTED'
                const isBusy = processingId === row.id

                return (
                  <TR key={row.id} clickable onClick={() => openDetails(raw)}>
                    <TD>
                      <span className="text-ref-link">{row.number}</span>
                    </TD>
                    <TD>
                      <span className="text-ref text-foreground">{row.invoiceNumber}</span>
                    </TD>
                    <TD>
                      <p className="font-medium text-foreground truncate">{row.partyName}</p>
                    </TD>
                    <TD className="text-muted-foreground tabular-nums">
                      {formatShortDate(row.date)}
                    </TD>
                    <TD className="text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[row.paymentMethod]}
                    </TD>
                    <TD className="text-right tabular-nums font-medium">
                      {formatMoney(row.amount, currency, 2)}
                    </TD>
                    <TD className="pl-6">
                      {isPosted ? (
                        <Badge variant="success">Posted</Badge>
                      ) : (
                        <Badge variant="neutral">Draft</Badge>
                      )}
                    </TD>
                    <TD className="px-3 text-right">
                      <div
                        className="relative inline-flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isPosted ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handlePost(row)}
                          >
                            {isBusy ? '...' : 'Post'}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openDetails(raw)}
                          >
                            View
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                          aria-label="Row actions"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openMenuId === row.id && (
                          <div className="absolute right-0 top-9 z-40 w-44 rounded-md border border-border bg-card shadow-md py-1 text-left">
                            <button
                              type="button"
                              onClick={() => openDetails(raw)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              View details
                            </button>

                            {!isPosted && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEdit(raw)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                  Edit draft
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handlePost(row)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  {postVerb}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(row)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete draft
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TD>
                  </TR>
                )
              })
            )}
          </TBody>
        </Table>

        {pageData && (
          <TablePagination
            page={currentPage}
            totalPages={pageData.totalPages}
            totalElements={pageData.totalElements}
            count={rows.length}
            itemLabel={itemLabel}
            onPageChange={(nextPage) => loadRows(nextPage)}
          />
        )}
      </div>

      {renderModals({
        isCreateOpen,
        closeCreate: () => {
          setIsCreateOpen(false)
          setItemToEdit(null)
          setPreselectedInvoiceId(null)
        },
        itemToEdit,
        preselectedInvoiceId,
        selectedItem,
        isDetailsOpen,
        closeDetails: () => setIsDetailsOpen(false),
        openEditFromDetails: (raw) => openEdit(raw),
        reload: () => loadRows(currentPage),
      })}
    </div>
  )
}
