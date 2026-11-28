import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { ComingSoonReport } from './ComingSoonReport'
import { PendingPurchaseOrdersReport } from './PendingPurchaseOrdersReport'
import { PurchaseSummaryReport } from './PurchaseSummaryReport'
import { StockSummaryReport } from './StockSummaryReport'
import { StockMovementsReport } from './StockMovementsReport'
import { ProductionSummaryReport } from './ProductionSummaryReport'
import { MaterialConsumptionReport } from './MaterialConsumptionReport'
import { InspectionSummaryReport } from './InspectionSummaryReport'
import { RejectionReport } from './RejectionReport'
import { PendingDispatchesReport } from './PendingDispatchesReport'
import { SupplierOutstandingReport } from './SupplierOutstandingReport'
import { CustomerOutstandingReport } from './CustomerOutstandingReport'
import { ExpenseReport } from './ExpenseReport'
import { MaintenanceHistoryReport } from './MaintenanceHistoryReport'
import { DueOverdueMaintenanceReport } from './DueOverdueMaintenanceReport'
import { EquipmentDowntimeReport } from './EquipmentDowntimeReport'
import { SearchInput } from '../../components/ui/Input'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import {
  REPORT_CATEGORIES,
  REPORTS,
  getReportById,
  type ReportDefinition,
} from './reportCatalog'

export interface ReportsPageProps {
  initialReportId?: string | null
  onInitialReportConsumed?: () => void
}

export function ReportsPage({
  initialReportId = null,
  onInitialReportConsumed,
}: ReportsPageProps = {}) {
  const [search, setSearch] = useState('')
  const [activeReportId, setActiveReportId] = useState<string | null>(initialReportId)

  useEffect(() => {
    if (!initialReportId) return
    setActiveReportId(initialReportId)
    onInitialReportConsumed?.()
  }, [initialReportId, onInitialReportConsumed])

  const activeReport = activeReportId ? getReportById(activeReportId) : undefined

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    return REPORT_CATEGORIES.map((category) => {
      const reports = REPORTS.filter((r) => {
        if (!r.available) return false
        if (r.categoryId !== category.id) return false
        if (!q) return true
        return (
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          category.label.toLowerCase().includes(q)
        )
      })
      return { category, reports }
    }).filter((group) => group.reports.length > 0)
  }, [search])

  const openReport = (report: ReportDefinition) => {
    setActiveReportId(report.id)
  }

  if (activeReport) {
    const back = () => setActiveReportId(null)
    if (activeReport.id === 'purchase-summary' && activeReport.available) {
      return <PurchaseSummaryReport onBack={back} />
    }
    if (activeReport.id === 'pending-purchase-orders' && activeReport.available) {
      return <PendingPurchaseOrdersReport onBack={back} />
    }
    if (activeReport.id === 'stock-summary' && activeReport.available) {
      return <StockSummaryReport onBack={back} />
    }
    if (activeReport.id === 'stock-movements' && activeReport.available) {
      return <StockMovementsReport onBack={back} />
    }
    if (activeReport.id === 'production-summary' && activeReport.available) {
      return <ProductionSummaryReport onBack={back} />
    }
    if (activeReport.id === 'material-consumption' && activeReport.available) {
      return <MaterialConsumptionReport onBack={back} />
    }
    if (activeReport.id === 'inspection-summary' && activeReport.available) {
      return <InspectionSummaryReport onBack={back} />
    }
    if (activeReport.id === 'rejection-report' && activeReport.available) {
      return <RejectionReport onBack={back} />
    }
    if (activeReport.id === 'pending-dispatches' && activeReport.available) {
      return <PendingDispatchesReport onBack={back} />
    }
    if (activeReport.id === 'supplier-outstanding' && activeReport.available) {
      return <SupplierOutstandingReport onBack={back} />
    }
    if (activeReport.id === 'customer-outstanding' && activeReport.available) {
      return <CustomerOutstandingReport onBack={back} />
    }
    if (activeReport.id === 'expense-report' && activeReport.available) {
      return <ExpenseReport onBack={back} />
    }
    if (activeReport.id === 'maintenance-history' && activeReport.available) {
      return <MaintenanceHistoryReport onBack={back} />
    }
    if (activeReport.id === 'due-overdue-maintenance' && activeReport.available) {
      return <DueOverdueMaintenanceReport onBack={back} />
    }
    if (activeReport.id === 'equipment-downtime' && activeReport.available) {
      return <EquipmentDowntimeReport onBack={back} />
    }
    return <ComingSoonReport report={activeReport} onBack={back} />
  }

  return (
    <ContentCanvas className="space-y-8 pt-2">
      <div>
        <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
          Reports
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
          Operational and financial reports.
        </p>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search reports..."
        className="w-full max-w-xl"
      />

      {grouped.length === 0 ? (
        <div className="rounded-md border border-border bg-card px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-medium text-foreground">No reports match your search.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different name or clear the search field.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-4">
          {grouped.map(({ category, reports }) => {
            const Icon = category.icon
            return (
              <section
                key={category.id}
                className="rounded-md border border-border bg-card shadow-xs overflow-hidden"
              >
                <div className="flex items-center gap-2.5 border-b border-border/80 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-secondary text-muted-foreground shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">{category.label}</h2>
                </div>
                <ul className="divide-y divide-border/80">
                  {reports.map((report) => (
                    <li key={report.id}>
                      <button
                        type="button"
                        onClick={() => openReport(report)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors cursor-pointer"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {report.name}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </ContentCanvas>
  )
}
