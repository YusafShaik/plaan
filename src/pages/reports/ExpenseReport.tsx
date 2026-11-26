import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { ExpenseDetailsModal } from '../finance/ExpenseDetailsModal'
import { financeService } from '../../services/financeService'
import { reportsService } from '../../services/reportsService'
import { useAuth } from '../../hooks/useAuth'
import type { Expense, ExpenseCategory, PaymentMethod } from '../../types/finance'
import type {
  ExpenseReport as ExpenseReportData,
  ExpenseReportRow,
} from '../../types/reports'

export interface ExpenseReportProps {
  onBack: () => void
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
}

function firstDayOfMonthIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMoney(amount: number, currency: string) {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatPercent(value: number) {
  return `${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`
}

export function ExpenseReport({ onBack }: ExpenseReportProps) {
  const { organization } = useAuth()
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso)
  const [toDate, setToDate] = useState(todayIso)
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [report, setReport] = useState<ExpenseReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    financeService
      .getExpenseCategories(true)
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  const filterParams = {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    categoryId: categoryId === '' ? undefined : categoryId,
    paymentMethod: paymentMethod || undefined,
    search: search.trim() || undefined,
  }

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getExpenseReport({
        ...filterParams,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load expense report.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filter fields listed individually
  }, [fromDate, toDate, categoryId, paymentMethod, search, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const currency = report?.currency || organization?.baseCurrency || 'INR'

  const maxCategoryValue = useMemo(() => {
    if (!report?.byCategory.length) return 0
    return Math.max(...report.byCategory.map((c) => c.amount))
  }, [report])

  const maxPaymentValue = useMemo(() => {
    if (!report?.byPaymentMethod.length) return 0
    return Math.max(...report.byPaymentMethod.map((m) => m.amount))
  }, [report])

  const openExpense = async (row: ExpenseReportRow) => {
    try {
      const expense = await financeService.getExpenseById(row.expenseId)
      setSelectedExpense(expense)
      setIsDetailsOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open expense')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportExpenseReportCsv(filterParams)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <ReportPageLayout
        categoryLabel="Finance"
        title="Expense Report"
        description="Posted operational expenses by category and payment method for the selected period."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting || isLoading || !report || report.summary.expenseTransactions === 0
        }
        filters={
          <div className="space-y-3">
            <div className="relative max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                placeholder="Search expense number, description or payee..."
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <DateField
                label="From Date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(0)
                }}
              />
              <DateField
                label="To Date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(0)
                }}
              />
              <Select
                label="Expense Category"
                value={categoryId === '' ? '' : categoryId}
                onChange={(v) => {
                  setCategoryId(v ? Number(v) : '')
                  setPage(0)
                }}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map((c) => ({
                    value: c.id,
                    label: c.active === false ? `${c.name} (Inactive)` : c.name,
                  })),
                ]}
              />
              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(v) => {
                  setPaymentMethod(v as PaymentMethod | '')
                  setPage(0)
                }}
                options={[
                  { value: '', label: 'All Methods' },
                  ...(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => ({
                    value: m,
                    label: METHOD_LABEL[m],
                  })),
                ]}
              />
            </div>
          </div>
        }
        summary={
          report ? (
            <ReportSummaryCards
              items={[
                {
                  label: 'Total Expenses',
                  value: formatMoney(report.summary.totalExpenses, currency),
                },
                {
                  label: 'Expense Transactions',
                  value: report.summary.expenseTransactions,
                },
              ]}
            />
          ) : null
        }
        footer={
          report && report.expenses.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.expenses.content.length} of {report.expenses.totalElements}{' '}
                expenses
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <span>
                  Page {page + 1} of {Math.max(1, report.expenses.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= report.expenses.totalPages || isLoading}
                  className="h-8 gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {error && <Alert variant="destructive">{error}</Alert>}

        {report && (report.byCategory.length > 0 || report.byPaymentMethod.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            {report.byCategory.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Expenses by category</h2>
                <div className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-4">
                  {report.byCategory.map((category) => {
                    const pct =
                      maxCategoryValue > 0
                        ? Math.max(4, Math.round((category.amount / maxCategoryValue) * 100))
                        : 0
                    return (
                      <div key={category.categoryId} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {category.categoryName}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {formatMoney(category.amount, currency)}
                            <span className="ml-2 text-xs font-medium text-muted-foreground">
                              {formatPercent(category.percentage)}
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-md bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-md bg-foreground"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {report.byPaymentMethod.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Payment method breakdown
                </h2>
                <div className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-4">
                  {report.byPaymentMethod.map((method) => {
                    const pct =
                      maxPaymentValue > 0
                        ? Math.max(4, Math.round((method.amount / maxPaymentValue) * 100))
                        : 0
                    return (
                      <div key={method.paymentMethod} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {METHOD_LABEL[method.paymentMethod]}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {formatMoney(method.amount, currency)}
                            <span className="ml-2 text-xs font-medium text-muted-foreground">
                              {formatPercent(method.percentage)}
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-md bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-md bg-foreground"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-medium text-foreground">Total Expenses</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatMoney(report.summary.totalExpenses, currency)}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Expense transactions</h2>
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
            <Table className="border-0 rounded-none shadow-none bg-transparent">
              <THead>
                <tr>
                  <TH>Expense</TH>
                  <TH>Category</TH>
                  <TH>Payee</TH>
                  <TH>Payment Method</TH>
                  <TH>Payment Reference</TH>
                  <TH>Amount</TH>
                </tr>
              </THead>
              <TBody>
                {isLoading && !report ? (
                  <TR>
                    <TD colSpan={6} className="py-14 text-center text-muted-foreground">
                      Loading expense report...
                    </TD>
                  </TR>
                ) : !report || report.expenses.content.length === 0 ? (
                  <TR>
                    <TD colSpan={6} className="py-14 text-center text-muted-foreground">
                      No posted expenses match the selected filters.
                    </TD>
                  </TR>
                ) : (
                  <>
                    {report.expenses.content.map((row) => (
                      <TR
                        key={row.expenseId}
                        className="cursor-pointer"
                        onClick={() => void openExpense(row)}
                      >
                        <TD>
                          <RefLink>{row.expenseNumber}</RefLink>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(row.expenseDate)}
                          </div>
                          <div className="text-sm text-foreground mt-0.5">{row.description}</div>
                        </TD>
                        <TD className="text-sm text-foreground">{row.categoryName}</TD>
                        <TD className="text-sm text-muted-foreground">
                          {row.paidTo?.trim() ? row.paidTo : '—'}
                        </TD>
                        <TD className="text-sm text-foreground">
                          {METHOD_LABEL[row.paymentMethod]}
                        </TD>
                        <TD className="text-[11px] text-ref text-muted-foreground">
                          {row.paymentReference?.trim() ? row.paymentReference : '—'}
                        </TD>
                        <TD className="font-mono text-xs tabular-nums font-medium text-foreground">
                          {formatMoney(row.amount, currency)}
                        </TD>
                      </TR>
                    ))}
                    <TR>
                      <TD colSpan={5} className="text-sm font-semibold text-foreground">
                        Total
                      </TD>
                      <TD className="font-mono text-xs tabular-nums font-semibold text-foreground">
                        {formatMoney(report.summary.totalExpenses, currency)}
                      </TD>
                    </TR>
                  </>
                )}
              </TBody>
            </Table>
          </div>
        </section>
      </ReportPageLayout>

      <ExpenseDetailsModal
        isOpen={isDetailsOpen}
        expense={selectedExpense}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedExpense(null)
        }}
      />
    </>
  )
}
