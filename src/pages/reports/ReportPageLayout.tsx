import type { ReactNode } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
import { ContentCanvas } from '../../components/layout/ContentCanvas'

export interface ReportPageLayoutProps {
  categoryLabel: string
  title: string
  description?: string
  onBack: () => void
  /** Show Export CSV control; disabled when onExport is omitted. */
  showExport?: boolean
  exportDisabled?: boolean
  onExport?: () => void
  filters?: ReactNode
  summary?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/**
 * Shared shell for individual reports: breadcrumb, title, optional export,
 * filters, summary metrics, table/content, and pagination footer.
 */
export function ReportPageLayout({
  categoryLabel,
  title,
  description,
  onBack,
  showExport = true,
  exportDisabled = false,
  onExport,
  filters,
  summary,
  children,
  footer,
}: ReportPageLayoutProps) {
  return (
    <ContentCanvas className="space-y-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Reports / {categoryLabel}
          </button>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {showExport && (
          <Button
            type="button"
            variant="outline"
            disabled={exportDisabled || !onExport}
            onClick={onExport}
            className="gap-1.5 shrink-0"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {filters && <div className="space-y-3">{filters}</div>}

      {summary && <div>{summary}</div>}

      <div>{children}</div>

      {footer && <div>{footer}</div>}
    </ContentCanvas>
  )
}

export interface ReportSummaryCardsProps {
  items: Array<{ label: string; value: string | number }>
}

/** Compact metric strip used by reports that need summary cards. */
export function ReportSummaryCards({ items }: ReportSummaryCardsProps) {
  if (items.length === 0) return null
  return (
    <KpiCardGrid columns={items.length <= 3 ? 3 : 4}>
      {items.map((item) => (
        <KpiCard key={item.label} label={item.label} value={item.value} />
      ))}
    </KpiCardGrid>
  )
}
