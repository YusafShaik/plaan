import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportPageLayout, ReportSummaryCards } from './ReportPageLayout'
import { DateField } from '../../components/ui/DateField'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { SalesInvoiceDetailsModal } from '../finance/SalesInvoiceDetailsModal'
import { CreateCustomerReceiptModal } from '../finance/CreateCustomerReceiptModal'
import { masterDataService } from '../../services/masterDataService'
import { financeService } from '../../services/financeService'
import { reportsService } from '../../services/reportsService'
import { useAuth } from '../../hooks/useAuth'
import type { SalesInvoice } from '../../types/finance'
import type {
  DeliveryScheduleStatus,
  OutstandingPaymentStatusFilter,
  CustomerOutstandingReport as CustomerOutstandingReportData,
  CustomerOutstandingRow,
} from '../../types/reports'
import type { Customer } from '../../types/masterData'

export interface CustomerOutstandingReportProps {
  onBack: () => void
}

type DueFilter = 'all' | DeliveryScheduleStatus
type PaymentFilter = '' | OutstandingPaymentStatusFilter

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

function dueBadge(status: DeliveryScheduleStatus) {
  if (status === 'OVERDUE') return <Badge variant="destructive">Overdue</Badge>
  if (status === 'DUE_TODAY') return <Badge variant="warning">Due Today</Badge>
  if (status === 'UPCOMING') return <Badge variant="neutral">Upcoming</Badge>
  return <Badge variant="neutral">Not Scheduled</Badge>
}

function paymentBadge(status: CustomerOutstandingRow['paymentStatus']) {
  if (status === 'PARTIALLY_PAID') return <Badge variant="warning">Partially Paid</Badge>
  return <Badge variant="neutral">Unpaid</Badge>
}

export function CustomerOutstandingReport({ onBack }: CustomerOutstandingReportProps) {
  const { organization } = useAuth()
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [invoiceFrom, setInvoiceFrom] = useState('')
  const [invoiceTo, setInvoiceTo] = useState('')
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>('')
  const [dueStatus, setDueStatus] = useState<DueFilter>('all')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [report, setReport] = useState<CustomerOutstandingReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [receiptInvoiceId, setReceiptInvoiceId] = useState<number | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  useEffect(() => {
    masterDataService
      .getCustomers({ size: 200 })
      .then((pageData) => setCustomers(pageData.content))
      .catch(() => setCustomers([]))
  }, [])

  const filterParams = {
    customerId: customerId === '' ? undefined : customerId,
    invoiceFrom: invoiceFrom || undefined,
    invoiceTo: invoiceTo || undefined,
    dueFrom: dueFrom || undefined,
    dueTo: dueTo || undefined,
    paymentStatus: paymentStatus || undefined,
    dueStatus: dueStatus === 'all' ? undefined : dueStatus,
  }

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    reportsService
      .getCustomerOutstanding({
        ...filterParams,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load customer outstanding.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filter fields listed individually
  }, [
    customerId,
    invoiceFrom,
    invoiceTo,
    dueFrom,
    dueTo,
    paymentStatus,
    dueStatus,
    page,
    pageSize,
  ])

  useEffect(() => {
    const timer = setTimeout(load, 200)
    return () => clearTimeout(timer)
  }, [load])

  const currency = report?.currency || organization?.baseCurrency || 'INR'

  const maxCustomerValue = useMemo(() => {
    if (!report?.byCustomer.length) return 0
    return Math.max(...report.byCustomer.map((c) => c.outstandingAmount))
  }, [report])

  const openInvoice = async (row: CustomerOutstandingRow) => {
    try {
      const invoice = await financeService.getSalesInvoiceById(row.salesInvoiceId)
      setSelectedInvoice(invoice)
      setIsDetailsOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open sales invoice')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportCustomerOutstandingCsv(filterParams)
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
        title="Customer Outstanding"
        description="Unpaid and partially paid sales invoices, with customer balances and collection urgency."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting || isLoading || !report || report.summary.outstandingInvoices === 0
        }
        filters={
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Due Status</p>
              <UnderlineTabs
                items={[
                  { id: 'all', label: 'All' },
                  { id: 'OVERDUE', label: 'Overdue' },
                  { id: 'DUE_TODAY', label: 'Due Today' },
                  { id: 'UPCOMING', label: 'Upcoming' },
                  { id: 'NOT_SCHEDULED', label: 'Not Scheduled' },
                ]}
                value={dueStatus}
                onChange={(id) => {
                  setDueStatus(id as DueFilter)
                  setPage(0)
                }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Select
                label="Customer"
                value={customerId === '' ? '' : customerId}
                onChange={(v) => {
                  setCustomerId(v ? Number(v) : '')
                  setPage(0)
                }}
                options={[
                  { value: '', label: 'All Customers' },
                  ...customers.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <Select
                label="Payment Status"
                value={paymentStatus}
                onChange={(v) => {
                  setPaymentStatus(v as PaymentFilter)
                  setPage(0)
                }}
                options={[
                  { value: '', label: 'All Outstanding' },
                  { value: 'UNPAID', label: 'Unpaid' },
                  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                ]}
              />
              <DateField
                label="Invoice From"
                value={invoiceFrom}
                onChange={(e) => {
                  setInvoiceFrom(e.target.value)
                  setPage(0)
                }}
              />
              <DateField
                label="Invoice To"
                value={invoiceTo}
                onChange={(e) => {
                  setInvoiceTo(e.target.value)
                  setPage(0)
                }}
              />
              <DateField
                label="Due From"
                value={dueFrom}
                onChange={(e) => {
                  setDueFrom(e.target.value)
                  setPage(0)
                }}
              />
              <DateField
                label="Due To"
                value={dueTo}
                onChange={(e) => {
                  setDueTo(e.target.value)
                  setPage(0)
                }}
              />
            </div>
          </div>
        }
        summary={
          report ? (
            <ReportSummaryCards
              items={[
                {
                  label: 'Total Receivable',
                  value: formatMoney(report.summary.totalReceivable, currency),
                },
                {
                  label: 'Overdue Amount',
                  value: formatMoney(report.summary.overdueAmount, currency),
                },
                {
                  label: 'Outstanding Invoices',
                  value: report.summary.outstandingInvoices,
                },
                {
                  label: 'Customers with Outstanding',
                  value: report.summary.customersWithOutstanding,
                },
              ]}
            />
          ) : null
        }
        footer={
          report && report.invoices.totalElements > 0 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {report.invoices.content.length} of {report.invoices.totalElements}{' '}
                invoices
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
                  Page {page + 1} of {Math.max(1, report.invoices.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= report.invoices.totalPages || isLoading}
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

        {report && report.byCustomer.length > 0 && (
          <section className="space-y-3 mb-5">
            <h2 className="text-sm font-semibold text-foreground">Customer-wise outstanding</h2>
            <div className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-4">
              {report.byCustomer.map((customer) => {
                const pct =
                  maxCustomerValue > 0
                    ? Math.max(
                        4,
                        Math.round((customer.outstandingAmount / maxCustomerValue) * 100)
                      )
                    : 0
                return (
                  <div key={customer.customerId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {customer.customerName}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(customer.outstandingAmount, currency)}
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

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Outstanding invoice details</h2>
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
            <Table className="border-0 rounded-none shadow-none bg-transparent">
              <THead>
                <tr>
                  <TH>Invoice / Customer</TH>
                  <TH>Invoice Date</TH>
                  <TH>Invoice Amount</TH>
                  <TH>Received</TH>
                  <TH>Outstanding</TH>
                  <TH>Due Date</TH>
                  <TH>Payment Status</TH>
                  <TH>Days Overdue</TH>
                </tr>
              </THead>
              <TBody>
                {isLoading && !report ? (
                  <TR>
                    <TD colSpan={8} className="py-14 text-center text-muted-foreground">
                      Loading customer outstanding...
                    </TD>
                  </TR>
                ) : !report || report.invoices.content.length === 0 ? (
                  <TR>
                    <TD colSpan={8} className="py-14 text-center text-muted-foreground">
                      No outstanding sales invoices match the selected filters.
                    </TD>
                  </TR>
                ) : (
                  report.invoices.content.map((row) => (
                    <TR
                      key={row.salesInvoiceId}
                      className="cursor-pointer"
                      onClick={() => void openInvoice(row)}
                    >
                      <TD>
                        <div className="flex flex-wrap items-center gap-2">
                          <RefLink>{row.invoiceNumber}</RefLink>
                          {dueBadge(row.dueStatus)}
                        </div>
                        <div className="text-sm text-foreground mt-0.5">{row.customerName}</div>
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {formatDate(row.invoiceDate)}
                      </TD>
                      <TD className="tabular-nums text-xs tabular-nums">
                        {formatMoney(row.invoiceAmount, currency)}
                      </TD>
                      <TD className="tabular-nums text-xs tabular-nums">
                        {formatMoney(row.receivedAmount, currency)}
                      </TD>
                      <TD className="tabular-nums text-xs tabular-nums font-medium text-foreground">
                        {formatMoney(row.outstandingAmount, currency)}
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {formatDate(row.dueDate)}
                      </TD>
                      <TD>{paymentBadge(row.paymentStatus)}</TD>
                      <TD className="tabular-nums text-xs tabular-nums text-muted-foreground">
                        {row.daysOverdue != null ? row.daysOverdue : '—'}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </section>
      </ReportPageLayout>

      <SalesInvoiceDetailsModal
        isOpen={isDetailsOpen}
        invoice={selectedInvoice}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedInvoice(null)
        }}
        onRecordReceipt={(inv) => {
          setIsDetailsOpen(false)
          setSelectedInvoice(null)
          setReceiptInvoiceId(inv.id)
          setIsReceiptModalOpen(true)
        }}
      />

      <CreateCustomerReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false)
          setReceiptInvoiceId(null)
        }}
        onSuccess={() => {
          setIsReceiptModalOpen(false)
          setReceiptInvoiceId(null)
          load()
        }}
        preselectedInvoiceId={receiptInvoiceId}
      />
    </>
  )
}
