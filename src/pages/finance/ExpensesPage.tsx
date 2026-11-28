import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  Edit,
  Eye,
  MoreHorizontal,
  Receipt,
  RefreshCw,
  RotateCcw,
  Trash2,
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
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Alert } from '../../components/ui/Alert'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
import { CreateExpenseModal } from './CreateExpenseModal'
import { ExpenseDetailsModal } from './ExpenseDetailsModal'
import { ManageExpenseCategoriesModal } from './ManageExpenseCategoriesModal'
import { financeService } from '../../services/financeService'
import { useAuth } from '../../hooks/useAuth'
import { formatMoney, formatShortDate } from '../../lib/format'
import { confirmAction, toast } from '../../lib/feedback'
import { cn } from '../../lib/cn'
import { PAYMENT_METHOD_LABELS, POST_STATUS_FILTERS } from './financeHelpers'
import type {
  Expense,
  ExpenseStatus,
  ExpenseCategory,
  ExpenseOverview,
  PaymentMethod,
} from '../../types/finance'
import type { PageResponse } from '../../types/masterData'

function monthBounds() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { from: fmt(from), to: fmt(now) }
}

export interface ExpensesPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
  isManageOpen?: boolean
  setIsManageOpen?: (open: boolean) => void
}

export function ExpensesPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
  isManageOpen: controlledManageOpen,
  setIsManageOpen: setControlledManageOpen,
}: ExpensesPageProps = {}) {
  const { organization } = useAuth()
  const currency = organization?.baseCurrency
  const defaults = monthBounds()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [pageData, setPageData] = useState<PageResponse<Expense> | null>(null)
  const [overview, setOverview] = useState<ExpenseOverview | null>(null)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('')
  const [fromDate, setFromDate] = useState(defaults.from)
  const [toDate, setToDate] = useState(defaults.to)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const [internalCreateOpen, setInternalCreateOpen] = useState(false)
  const isCreateOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalCreateOpen
  const setIsCreateOpen = setControlledModalOpen || setInternalCreateOpen
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [internalManageOpen, setInternalManageOpen] = useState(false)
  const isManageOpen =
    controlledManageOpen !== undefined ? controlledManageOpen : internalManageOpen
  const setIsManageOpen = setControlledManageOpen || setInternalManageOpen

  const loadOverview = useCallback(() => {
    financeService
      .getExpenseOverview({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })
      .then(setOverview)
      .catch(() => setOverview(null))
  }, [fromDate, toDate])

  const loadExpenses = useCallback(
    (page = 0) => {
      setError(null)
      financeService
        .getExpenses({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          categoryId: categoryFilter === '' ? undefined : categoryFilter,
          paymentMethod: methodFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page,
          size: pageSize,
        })
        .then((res) => {
          setExpenses(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load expenses.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, categoryFilter, methodFilter, fromDate, toDate, pageSize]
  )

  useEffect(() => {
    financeService.getExpenseCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadExpenses(0)
      loadOverview()
    }, 200)
    return () => clearTimeout(timer)
  }, [loadExpenses, loadOverview])

  useEffect(() => {
    if (openMenuId === null) return
    const handleOutside = () => setOpenMenuId(null)
    window.addEventListener('click', handleOutside)
    return () => window.removeEventListener('click', handleOutside)
  }, [openMenuId])

  const handleRefresh = () => {
    loadExpenses(currentPage)
    loadOverview()
  }

  const handlePost = async (expense: Expense) => {
    setOpenMenuId(null)
    setProcessingId(expense.id)
    try {
      await financeService.postExpense(expense.id)
      toast.success(`Expense ${expense.expenseNumber} posted`)
      handleRefresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post expense.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (expense: Expense) => {
    setOpenMenuId(null)
    const ok = await confirmAction({
      title: `Delete draft expense ${expense.expenseNumber}?`,
      description: 'This draft expense will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    setProcessingId(expense.id)
    try {
      await financeService.deleteExpense(expense.id)
      toast.success(`Draft expense ${expense.expenseNumber} deleted`)
      handleRefresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete expense.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleOpenDetails = (expense: Expense) => {
    setOpenMenuId(null)
    setSelectedExpense(expense)
    setIsDetailsOpen(true)
  }

  const hasFilters = Boolean(
    search ||
      statusFilter ||
      categoryFilter !== '' ||
      methodFilter ||
      fromDate !== defaults.from ||
      toDate !== defaults.to
  )

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setCategoryFilter('')
    setMethodFilter('')
    const bounds = monthBounds()
    setFromDate(bounds.from)
    setToDate(bounds.to)
  }

  const totalByCategories =
    overview?.byCategory.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0

  return (
    <div className="space-y-6">
      <KpiCardGrid columns={3}>
        <KpiCard
          label="Posted this month"
          value={formatMoney(overview?.totalPostedThisMonth, currency, 2)}
        />
        <KpiCard
          label="Entries"
          value={pageData?.totalElements ?? expenses.length}
        />
        <KpiCard
          label="Categories with spend"
          value={overview?.byCategory?.length ?? 0}
        />
      </KpiCardGrid>

      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search expenses..."
            className="w-56"
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border/80 bg-card px-2.5 text-xs text-muted-foreground">
            <span>From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border-0 bg-transparent text-xs font-medium text-foreground tabular-nums focus:outline-none"
            />
          </label>
          <label className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border/80 bg-card px-2.5 text-xs text-muted-foreground">
            <span>To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border-0 bg-transparent text-xs font-medium text-foreground tabular-nums focus:outline-none"
            />
          </label>
          <NativeSelect
            dense
            className="w-auto min-w-[8.5rem]"
            value={categoryFilter === '' ? '' : String(categoryFilter)}
            onChange={(e) =>
              setCategoryFilter(e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            dense
            className="w-auto min-w-[7.5rem]"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | '')}
          >
            <option value="">All methods</option>
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </NativeSelect>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="rounded-md border border-border/80 bg-card shadow-xs overflow-visible">
        <Table
          className="border-0 rounded-none shadow-none bg-transparent overflow-visible"
          tableClassName="table-fixed"
        >
          <THead>
            <tr>
              <TH className="w-[12%]">Reference</TH>
              <TH className="w-[29%]">Expense</TH>
              <TH className="w-[11%]">Date</TH>
              <TH className="w-[12%]">Method</TH>
              <TH className="w-[12%] text-right">Amount</TH>
              <TH className="w-[11%] pl-6">Status</TH>
              <TH className="w-[13%] px-3 text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && expenses.length === 0 ? (
              <TR>
                <TD colSpan={7} className="py-16 text-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-foreground" />
                  Loading expenses...
                </TD>
              </TR>
            ) : expenses.length === 0 ? (
              <TR>
                <TD colSpan={7} className="p-0">
                  <TableEmptyState
                    icon={<Receipt className="h-5 w-5" />}
                    title="No expenses found"
                    description={
                      hasFilters
                        ? 'No expenses match your current search, date range, or filters.'
                        : 'Record paid operating costs like rent, utilities, and repairs.'
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
              expenses.map((expense) => {
                const isPosted = expense.status === 'POSTED'
                const isBusy = processingId === expense.id

                return (
                  <TR key={expense.id} clickable onClick={() => handleOpenDetails(expense)}>
                    <TD>
                      <span className="text-ref-link">{expense.expenseNumber}</span>
                    </TD>
                    <TD>
                      <p className="font-medium text-foreground truncate">{expense.categoryName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {expense.description}
                      </p>
                    </TD>
                    <TD className="text-muted-foreground tabular-nums">
                      {formatShortDate(expense.expenseDate)}
                    </TD>
                    <TD className="text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                    </TD>
                    <TD className="text-right tabular-nums font-medium text-foreground">
                      {formatMoney(expense.amount, currency, 2)}
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
                            onClick={() => void handlePost(expense)}
                          >
                            {isBusy ? '...' : 'Post'}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(expense)}
                          >
                            View
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId(openMenuId === expense.id ? null : expense.id)
                          }
                          aria-label="Expense actions"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openMenuId === expense.id && (
                          <div className="absolute right-0 top-9 z-40 w-44 rounded-md border border-border bg-card shadow-md py-1 text-left">
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(expense)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              View details
                            </button>

                            {!isPosted && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    setExpenseToEdit(expense)
                                    setIsCreateOpen(true)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                  Edit draft
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handlePost(expense)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  Post expense
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(expense)}
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
            count={expenses.length}
            itemLabel="expenses"
            onPageChange={(nextPage) => loadExpenses(nextPage)}
          />
        )}
      </div>

      {overview && overview.byCategory.length > 0 && (
        <section className="rounded-md border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Expenses by category</h3>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              Total {formatMoney(totalByCategories, currency, 2)}
            </span>
          </div>
          <div className="space-y-3">
            {overview.byCategory.map((row) => {
              const amount = Number(row.amount) || 0
              const share = totalByCategories > 0 ? Math.round((amount / totalByCategories) * 100) : 0
              return (
                <div key={row.categoryName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{row.categoryName}</span>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="text-muted-foreground">{share}%</span>
                      <span className="font-semibold text-foreground w-24 text-right">
                        {formatMoney(amount, currency, 2)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-md bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-md bg-primary transition-[width] duration-300"
                      style={{ width: `${Math.max(share, amount > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <CreateExpenseModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setExpenseToEdit(null)
        }}
        onSuccess={handleRefresh}
        expenseToEdit={expenseToEdit}
      />

      <ExpenseDetailsModal
        isOpen={isDetailsOpen}
        expense={selectedExpense}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedExpense(null)
        }}
        onEdit={(exp) => {
          setExpenseToEdit(exp)
          setIsCreateOpen(true)
        }}
        onDeleted={handleRefresh}
        onPosted={handleRefresh}
      />

      <ManageExpenseCategoriesModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        onChanged={() => {
          financeService.getExpenseCategories().then(setCategories).catch(() => {})
          loadOverview()
        }}
      />
    </div>
  )
}
