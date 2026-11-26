import { FileBarChart } from 'lucide-react'
import { ReportPageLayout } from './ReportPageLayout'
import type { ReportDefinition } from './reportCatalog'
import { getCategoryById } from './reportCatalog'

export interface ComingSoonReportProps {
  report: ReportDefinition
  onBack: () => void
}

export function ComingSoonReport({ report, onBack }: ComingSoonReportProps) {
  const category = getCategoryById(report.categoryId)

  return (
    <ReportPageLayout
      categoryLabel={category?.label ?? 'Reports'}
      title={report.name}
      description={report.description}
      onBack={onBack}
      showExport
      exportDisabled
    >
      <div className="rounded-md border border-border bg-card px-6 py-16 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-border/80 bg-secondary text-muted-foreground">
          <FileBarChart className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-foreground">Coming soon</h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
          {report.name} will summarize live data from your existing Plaan records.
          Filters, summary metrics and CSV export will appear here when this report is
          enabled.
        </p>
      </div>
    </ReportPageLayout>
  )
}
