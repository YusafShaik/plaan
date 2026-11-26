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
import { PurchaseInvoiceDetailsModal } from '../finance/PurchaseInvoiceDetailsModal'
import { CreateSupplierPaymentModal } from '../finance/CreateSupplierPaymentModal'
import { masterDataService } from '../../services/masterDataService'
import { financeService } from '../../services/financeService'
import { reportsService } from '../../services/reportsService'
import { useAuth } from '../../hooks/useAuth'
import type { PurchaseInvoice } from '../../types/finance'
import type {
  DeliveryScheduleStatus,
  OutstandingPaymentStatusFilter,
  SupplierOutstandingReport as SupplierOutstandingReportData,
  SupplierOutstandingRow,
} from '../../types/reports'
import type { Supplier } from '../../types/masterData'

export interface SupplierOutstandingReportProps {
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

function paymentBadge(status: SupplierOutstandingRow['paymentStatus']) {
  if (status === 'PARTIALLY_PAID') return <Badge variant="warning">Partially Paid</Badge>
  return <Badge variant="neutral">Unpaid</Badge>
}

export function SupplierOutstandingReport({ onBack }: SupplierOutstandingReportProps) {
  const { organization } = useAuth()
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [invoiceFrom, setInvoiceFrom] = useState('')
  const [invoiceTo, setInvoiceTo] = useState('')
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>('')
  const [dueStatus, setDueStatus] = useState<DueFilter>('all')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [report, setReport] = useState<SupplierOutstandingReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<number | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  useEffect(() => {
    masterDataService
      .getSuppliers({ size: 200 })
      .then((pageData) => setSuppliers(pageData.content))
      .catch(() => setSuppliers([]))
  }, [])

  const filterParams = {
    supplierId: supplierId === '' ? undefined : supplierId,
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
      .getSupplierOutstanding({
        ...filterParams,
        page,
        size: pageSize,
      })
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load supplier outstanding.')
        setReport(null)
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filter fields listed individually
  }, [
    supplierId,
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

  const maxSupplierValue = useMemo(() => {
    if (!report?.bySupplier.length) return 0
    return Math.max(...report.bySupplier.map((s) => s.outstandingAmount))
  }, [report])

  const openInvoice = async (row: SupplierOutstandingRow) => {
    try {
      const invoice = await financeService.getPurchaseInvoiceById(row.purchaseInvoiceId)
      setSelectedInvoice(invoice)
      setIsDetailsOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open purchase invoice')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await reportsService.exportSupplierOutstandingCsv(filterParams)
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
        title="Supplier Outstanding"
        description="Unpaid and partially paid purchase invoices, with supplier balances and payment urgency."
        onBack={onBack}
        onExport={() => void handleExport()}
        exportDisabled={
          isExporting || isLoading || !report || report.summary.outstandingInvoices === 0
        }
        filters={
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-2">Due Status</p>
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
                label="Supplier"
                value={supplierId === '' ? '' : supplierId}
                onChange={(v) => {
                  setSupplierId(v ? Number(v) : '')
                  setPage(0)
                }}
                options={[
                  { value: '', label: 'All Suppliers' },
                  ...suppliers.map((s) => ({ value: s.id, label: s.name })),
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
                  label: 'Total Outstanding',
                  value: formatMoney(report.summary.totalOutstanding, currency),
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
                  label: 'Suppliers to Pay',
                  value: report.summary.suppliersToPay,
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

        {report && report.bySupplier.length > 0 && (
          <section className="space-y-3 mb-5">
            <h2 className="text-sm font-semibold text-foreground">Supplier-wise outstanding</h2>
            <div className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-4">
              {report.bySupplier.map((supplier) => {
                const pct =
                  maxSupplierValue > 0
                    ? Math.max(4, Math.round((supplier.outstandingAmount / maxSupplierValue) * 100))
                    : 0
                return (
                  <div key={supplier.supplierId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {supplier.supplierName}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(supplier.outstandingAmount, currency)}
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
                  <TH>Invoice / Supplier</TH>
                  <TH>Invoice Date</TH>
                  <TH>Invoice Amount</TH>
                  <TH>Paid</TH>
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
                      Loading supplier outstanding...
                    </TD>
                  </TR>
                ) : !report || report.invoices.content.length === 0 ? (
                  <TR>
                    <TD colSpan={8} className="py-14 text-center text-muted-foreground">
                      No outstanding purchase invoices match the selected filters.
                    </TD>
                  </TR>
                ) : (
                  report.invoices.content.map((row) => (
                    <TR
                      key={row.purchaseInvoiceId}
                      className="cursor-pointer"
                      onClick={() => void openInvoice(row)}
                    >
                      <TD>
                        <div className="flex flex-wrap items-center gap-2">
                          <RefLink>{row.invoiceNumber}</RefLink>
                          {dueBadge(row.dueStatus)}
                        </div>
                        <div className="text-sm text-foreground mt-0.5">{row.supplierName}</div>
                        <div className="text-[11px] text-ref text-muted-foreground mt-0.5">
                          {row.supplierInvoiceNumber}
                        </div>
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {formatDate(row.invoiceDate)}
                      </TD>
                      <TD className="font-mono text-xs tabular-nums">
                        {formatMoney(row.invoiceAmount, currency)}
                      </TD>
                      <TD className="font-mono text-xs tabular-nums">
                        {formatMoney(row.paidAmount, currency)}
                      </TD>
                      <TD className="font-mono text-xs tabular-nums font-medium text-foreground">
                        {formatMoney(row.outstandingAmount, currency)}
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {formatDate(row.dueDate)}
                      </TD>
                      <TD>{paymentBadge(row.paymentStatus)}</TD>
                      <TD className="font-mono text-xs tabular-nums text-muted-foreground">
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

      <PurchaseInvoiceDetailsModal
        isOpen={isDetailsOpen}
        invoice={selectedInvoice}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedInvoice(null)
        }}
        onRecordPayment={(inv) => {
          setIsDetailsOpen(false)
          setSelectedInvoice(null)
          setPaymentInvoiceId(inv.id)
          setIsPaymentModalOpen(true)
        }}
      />

      <CreateSupplierPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setPaymentInvoiceId(null)
        }}
        onSuccess={() => {
          setIsPaymentModalOpen(false)
          setPaymentInvoiceId(null)
          load()
        }}
        preselectedInvoiceId={paymentInvoiceId}
      />
    </>
  )
}
