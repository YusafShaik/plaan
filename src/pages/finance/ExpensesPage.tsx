import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  RotateCcw,
  Receipt,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Alert } from '../../components/ui/Alert'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
import { CreateExpenseModal } from './CreateExpenseModal'
import { ExpenseDetailsModal } from './ExpenseDetailsModal'
import { ManageExpenseCategoriesModal } from './ManageExpenseCategoriesModal'
import { financeService } from '../../services/financeService'
import type {
  Expense,
  ExpenseStatus,
  ExpenseCategory,
  ExpenseOverview,
  PaymentMethod,
} from '../../types/finance'
import type { PageResponse } from '../../types/masterData'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
}

function monthBounds() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = now
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { from: fmt(from), to: fmt(to) }
}

export function ExpensesPage() {
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

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isManageOpen, setIsManageOpen] = useState(false)

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
      setIsLoading(true)
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
    }, 250)
    return () => clearTimeout(timer)
  }, [loadExpenses, loadOverview])

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this draft expense?')) return
    try {
      await financeService.deleteExpense(id)
      loadExpenses(currentPage)
      loadOverview()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete expense')
    }
  }

  const handleOpenDetails = (expense: Expense) => {
    setSelectedExpense(expense)
    setIsDetailsOpen(true)
  }

  const handleRefresh = () => {
    loadExpenses(currentPage)
    loadOverview()
  }

  const hasFilters =
    search || statusFilter || categoryFilter !== '' || methodFilter || fromDate !== defaults.from || toDate !== defaults.to

  const maxCategoryAmount =
    overview?.byCategory.reduce((m, c) => Math.max(m, Number(c.amount) || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="flex h-10 rounded-md border border-border/80 bg-secondary px-2.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            title="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="flex h-10 rounded-md border border-border/80 bg-secondary px-2.5 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            title="To date"
          />
          <NativeSelect
            dense
            className="w-auto min-w-[9rem]"
            value={categoryFilter === '' ? '' : String(categoryFilter)}
            onChange={(e) =>
              setCategoryFilter(e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            dense
            className="w-auto min-w-[8.5rem]"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | '')}
          >
            <option value="">All Methods</option>
            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            dense
            className="w-auto min-w-[8rem]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
          </NativeSelect>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setCategoryFilter('')
                setMethodFilter('')
                const bounds = monthBounds()
                setFromDate(bounds.from)
                setToDate(bounds.to)
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ml-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setIsManageOpen(true)}>
            <Settings2 className="h-4 w-4" />
            Manage Categories
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setExpenseToEdit(null)
              setIsCreateOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            New Expense
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <KpiCardGrid columns={3}>
        <KpiCard
          label="Posted this month"
          value={formatCurrency(overview?.totalPostedThisMonth)}
        />
        <KpiCard
          label="Expense rows"
          value={pageData?.totalElements ?? expenses.length}
        />
        <KpiCard
          label="Categories with spend"
          value={overview?.byCategory?.length ?? 0}
        />
      </KpiCardGrid>

      <div className="rounded-md border border-border bg-card shadow-xs overflow-hidden">
        <Table className="border-0 rounded-none shadow-none bg-transparent">
          <THead>
            <tr>
              <TH>Reference</TH>
              <TH>Category</TH>
              <TH>Method</TH>
              <TH className="text-right">Amount</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && expenses.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-16 text-center text-muted-foreground">
                  Loading expenses...
                </TD>
              </TR>
            ) : expenses.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Receipt className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No expenses found.</p>
                    <p className="text-xs text-muted-foreground">
                      Record paid operating costs like rent, utilities, and repairs.
                    </p>
                  </div>
                </TD>
              </TR>
            ) : (
              expenses.map((expense) => (
                <TR
                  key={expense.id}
                  className="cursor-pointer"
                  onClick={() => handleOpenDetails(expense)}
                >
                  <TD>
                    <RefLink>{expense.expenseNumber}</RefLink>
                  </TD>
                  <TD>
                    <div className="text-sm font-medium text-foreground">{expense.categoryName}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                      {expense.description}
                    </div>
                  </TD>
                  <TD className="text-sm text-foreground">
                    {METHOD_LABEL[expense.paymentMethod]}
                  </TD>
                  <TD className="text-right font-medium text-foreground">
                    {formatCurrency(expense.amount)}
                  </TD>
                  <TD>
                    {expense.status === 'POSTED' ? (
                      <Badge variant="success">Posted</Badge>
                    ) : (
                      <Badge variant="warning">Draft</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <div
                      className="inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="View"
                        onClick={() => handleOpenDetails(expense)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {expense.status === 'DRAFT' && (
                        <>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => {
                              setExpenseToEdit(expense)
                              setIsCreateOpen(true)
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => handleDelete(expense.id)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        {pageData && pageData.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/80">
            <p className="text-xs text-muted-foreground">
              Page {pageData.page + 1} of {pageData.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 0}
                onClick={() => loadExpenses(currentPage - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= pageData.totalPages - 1}
                onClick={() => loadExpenses(currentPage + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {overview && overview.byCategory.length > 0 && (
          <div className="px-5 py-5 border-t border-border/80 space-y-3.5">
            <h3 className="text-sm font-semibold text-foreground">Expenses by category</h3>
            <div className="space-y-3">
              {overview.byCategory.map((row) => {
                const amount = Number(row.amount) || 0
                const pct = maxCategoryAmount > 0 ? (amount / maxCategoryAmount) * 100 : 0
                return (
                  <div key={row.categoryName}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{row.categoryName}</span>
                      <span className="text-muted-foreground">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-2 w-full rounded-md bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-md bg-brand transition-[width] duration-300"
                        style={{ width: `${Math.max(pct, amount > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

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
