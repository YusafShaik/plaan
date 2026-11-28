import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronRight,
  Plus,
  Wrench,
} from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { navigatePlaan } from '../../lib/navigate'
import { formatMoney as formatCurrency, getCurrencySymbol } from '../../lib/format'
import { cn } from '../../lib/cn'
import { dashboardService } from '../../services/dashboardService'
import { useAuth } from '../../hooks/useAuth'
import type { DashboardOverview, DashboardTrendMonth } from '../../types/dashboard'

function formatMoney(amount: number, currency: string) {
  return formatCurrency(amount, currency, 0)
}

function formatCompactAxisMoney(amount: number, currency: string) {
  const symbol = getCurrencySymbol(currency)
  if (amount <= 0) return `${symbol}0`
  if (amount >= 1_000_000) {
    const scaled = amount / 1_000_000
    return `${symbol}${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}M`
  }
  if (amount >= 1_000) {
    const scaled = amount / 1_000
    return `${symbol}${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}K`
  }
  return `${symbol}${Math.round(amount)}`
}

/** Round positive values up to clean 1 / 2 / 2.5 / 5 / 10 × 10^k axis intervals. */
function niceCeiling(value: number): number {
  if (value <= 0) return 100
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const fraction = value / magnitude
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return step * magnitude
}

type AttentionSeverity = 'critical' | 'warning'

interface AttentionItem {
  key: string
  label: string
  count: number
  severity: AttentionSeverity
  onClick: () => void
}

interface SetupStep {
  step: number
  title: string
  description: string
  onClick: () => void
}

const SETUP_STEPS: SetupStep[] = [
  {
    step: 1,
    title: 'Add master data items & partners',
    description: 'Raw materials, finished goods, customers & suppliers',
    onClick: () => navigatePlaan({ tab: 'master-data' }),
  },
  {
    step: 2,
    title: 'Create first purchase order',
    description: 'Receive raw materials into warehouse inventory',
    onClick: () => navigatePlaan({ tab: 'procurement' }),
  },
  {
    step: 3,
    title: 'Set opening stock balances',
    description: 'Initialize current warehouse inventory quantities',
    onClick: () => {
      sessionStorage.setItem('plaan_inventory_focus', JSON.stringify({ tab: 'overview' }))
      navigatePlaan({ tab: 'inventory' })
    },
  },
  {
    step: 4,
    title: 'Register plant equipment',
    description: 'Track machine uptime, breakdowns & preventive plans',
    onClick: () => navigatePlaan({ tab: 'maintenance', section: 'equipment' }),
  },
]

export function DashboardPage() {
  const { organization } = useAuth()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    dashboardService
      .getOverview()
      .then((data) => {
        if (!cancelled) {
          setError(null)
          setOverview(data)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Unable to load dashboard.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const currency = overview?.currency || organization?.baseCurrency || 'INR'

  const attentionItems: AttentionItem[] = useMemo(() => {
    if (!overview) return []
    const a = overview.attention
    const active: AttentionItem[] = [
      {
        key: 'breakdowns',
        label: 'Equipment breakdowns',
        count: a.equipmentBreakdowns,
        severity: 'critical',
        onClick: () => navigatePlaan({ tab: 'maintenance', section: 'equipment' }),
      },
      {
        key: 'material-shortage',
        label: 'Production orders with material shortage',
        count: a.productionOrdersWithMaterialShortage,
        severity: 'critical',
        onClick: () =>
          navigatePlaan({ tab: 'manufacturing', section: 'production-orders' }),
      },
      {
        key: 'overdue-dispatches',
        label: 'Overdue customer dispatches',
        count: a.overdueCustomerDispatches,
        severity: 'critical',
        onClick: () => navigatePlaan({ tab: 'reports', reportId: 'pending-dispatches' }),
      },
      {
        key: 'overdue-ar',
        label: 'Overdue customer invoices',
        count: a.overdueCustomerInvoices,
        severity: 'critical',
        onClick: () => navigatePlaan({ tab: 'reports', reportId: 'customer-outstanding' }),
      },
      {
        key: 'overdue-ap',
        label: 'Overdue supplier invoices',
        count: a.overdueSupplierInvoices,
        severity: 'warning',
        onClick: () => navigatePlaan({ tab: 'reports', reportId: 'supplier-outstanding' }),
      },
      {
        key: 'overdue-pos',
        label: 'Overdue purchase orders',
        count: a.overduePurchaseOrders,
        severity: 'warning',
        onClick: () =>
          navigatePlaan({ tab: 'reports', reportId: 'pending-purchase-orders' }),
      },
      {
        key: 'pending-qc',
        label: 'Pending quality inspections',
        count: a.pendingQualityInspections,
        severity: 'warning',
        onClick: () => navigatePlaan({ tab: 'reports', reportId: 'inspection-summary' }),
      },
      {
        key: 'overdue-maint',
        label: 'Overdue maintenance plans',
        count: a.overdueMaintenancePlans,
        severity: 'warning',
        onClick: () =>
          navigatePlaan({ tab: 'reports', reportId: 'due-overdue-maintenance' }),
      },
    ]
    return active
      .filter((item) => item.count > 0)
      .sort((x, y) => {
        if (x.severity !== y.severity) return x.severity === 'critical' ? -1 : 1
        return y.count - x.count
      })
  }, [overview])

  const equipment = overview?.equipmentStatus
  const equipmentTotal = equipment?.activeMachines ?? 0

  const productionTotal = overview
    ? overview.productionOrders.released +
      overview.productionOrders.inProgress +
      overview.productionOrders.completed +
      overview.productionOrders.closed
    : 0

  const isBlankWorkspace = useMemo(() => {
    if (!overview) return false
    const hasTrendActivity = overview.trend.some(
      (m) => Number(m.salesInvoiced || 0) > 0 || Number(m.purchasesInvoiced || 0) > 0
    )
    const hasBalances =
      overview.metrics.salesInvoiced > 0 ||
      overview.metrics.purchasesInvoiced > 0 ||
      overview.metrics.customerOutstanding > 0 ||
      overview.metrics.supplierOutstanding > 0
    return (
      !hasTrendActivity &&
      !hasBalances &&
      productionTotal === 0 &&
      equipmentTotal === 0 &&
      attentionItems.length === 0
    )
  }, [overview, productionTotal, equipmentTotal, attentionItems.length])

  const openAttentionTotal = attentionItems.reduce((sum, item) => sum + item.count, 0)
  const hasCriticalAttention = attentionItems.some((item) => item.severity === 'critical')

  return (
    <ContentCanvas className="space-y-5 pt-1">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Business overview
            {overview?.periodLabel ? (
              <span className="text-foreground font-medium"> · {overview.periodLabel}</span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigatePlaan({ tab: 'procurement' })}
          >
            <Plus className="h-3.5 w-3.5" />
            New PO
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigatePlaan({ tab: 'sales' })}
          >
            <Plus className="h-3.5 w-3.5" />
            Sales order
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigatePlaan({ tab: 'finance', section: 'expenses' })}
          >
            <Plus className="h-3.5 w-3.5" />
            Log expense
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              sessionStorage.setItem(
                'plaan_inventory_focus',
                JSON.stringify({ tab: 'transfers' })
              )
              navigatePlaan({ tab: 'inventory' })
            }}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Stock transfer
          </Button>
        </div>
      </header>

      {error && <Alert variant="destructive">{error}</Alert>}

      {isLoading && !overview ? (
        <div className="rounded-md border border-border bg-card px-6 py-12 text-center shadow-xs">
          <p className="text-sm text-muted-foreground">Loading overview…</p>
        </div>
      ) : overview ? (
        <>
          <KpiCardGrid columns={4}>
            <KpiCard
              label="Sales invoiced"
              hint="Current month"
              value={formatMoney(overview.metrics.salesInvoiced, currency)}
              onClick={() =>
                navigatePlaan({ tab: 'finance', section: 'sales-invoices' })
              }
            />
            <KpiCard
              label="Purchases invoiced"
              hint="Current month"
              value={formatMoney(overview.metrics.purchasesInvoiced, currency)}
              onClick={() =>
                navigatePlaan({ tab: 'finance', section: 'purchase-invoices' })
              }
            />
            <KpiCard
              label="Customer outstanding"
              hint="Live balance"
              value={formatMoney(overview.metrics.customerOutstanding, currency)}
              onClick={() =>
                navigatePlaan({ tab: 'reports', reportId: 'customer-outstanding' })
              }
            />
            <KpiCard
              label="Supplier outstanding"
              hint="Live balance"
              value={formatMoney(overview.metrics.supplierOutstanding, currency)}
              onClick={() =>
                navigatePlaan({ tab: 'reports', reportId: 'supplier-outstanding' })
              }
            />
          </KpiCardGrid>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            <div className="lg:col-span-7 flex">
              <SalesVsPurchasesCard trend={overview.trend} currency={currency} />
            </div>

            <div className="lg:col-span-5 flex">
              {isBlankWorkspace ? (
                <section className="flex w-full flex-col rounded-md border border-border bg-card shadow-xs overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-border/80 px-4 py-3.5">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Get started
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure core operations in four steps
                      </p>
                    </div>
                    <Badge variant="brand" dot={false}>
                      Setup
                    </Badge>
                  </div>
                  <ul className="flex-1 divide-y divide-border/80">
                    {SETUP_STEPS.map((item) => (
                      <li key={item.step}>
                        <button
                          type="button"
                          onClick={item.onClick}
                          className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-surface-subtle text-xs font-semibold tabular-nums text-foreground">
                              {item.step}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <section className="flex w-full flex-col rounded-md border border-border bg-card shadow-xs overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-border/80 px-4 py-3.5">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Requires attention
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Operational exceptions needing follow-up
                      </p>
                    </div>
                    {attentionItems.length > 0 ? (
                      <Badge variant={hasCriticalAttention ? 'destructive' : 'warning'}>
                        {openAttentionTotal} open
                      </Badge>
                    ) : (
                      <Badge variant="success">All caught up</Badge>
                    )}
                  </div>
                  {attentionItems.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
                      <p className="text-sm font-medium text-foreground">
                        No open exceptions
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        Overdue work, material shortages, and equipment breakdowns will
                        surface here automatically.
                      </p>
                    </div>
                  ) : (
                    <ul className="flex-1 max-h-[260px] overflow-y-auto divide-y divide-border/80">
                      {attentionItems.map((item) => (
                        <li key={item.key}>
                          <button
                            type="button"
                            onClick={item.onClick}
                            className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-[1px]',
                                  item.severity === 'critical'
                                    ? 'bg-destructive'
                                    : 'bg-warning'
                                )}
                                aria-hidden="true"
                              />
                              <span className="text-sm font-medium text-foreground truncate">
                                {item.label}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-2 shrink-0">
                              <span className="text-sm font-semibold tabular-nums text-foreground">
                                {item.count}
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    Production orders
                  </h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {productionTotal} total
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigatePlaan({ tab: 'manufacturing', section: 'production-orders' })
                  }
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  View all →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatusCount
                  label="Released"
                  value={overview.productionOrders.released}
                  dotClass="bg-info"
                  onClick={() =>
                    navigatePlaan({ tab: 'manufacturing', section: 'production-orders' })
                  }
                />
                <StatusCount
                  label="In progress"
                  value={overview.productionOrders.inProgress}
                  dotClass="bg-warning"
                  onClick={() =>
                    navigatePlaan({ tab: 'manufacturing', section: 'production-orders' })
                  }
                />
                <StatusCount
                  label="Completed"
                  value={overview.productionOrders.completed}
                  dotClass="bg-success"
                  onClick={() =>
                    navigatePlaan({ tab: 'manufacturing', section: 'production-orders' })
                  }
                />
                <StatusCount
                  label="Closed"
                  value={overview.productionOrders.closed}
                  dotClass="bg-muted-foreground/60"
                  onClick={() =>
                    navigatePlaan({ tab: 'manufacturing', section: 'production-orders' })
                  }
                />
              </div>
            </section>

            <section className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    Equipment status
                  </h2>
                  {equipmentTotal > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {equipmentTotal} active
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigatePlaan({ tab: 'maintenance', section: 'equipment' })
                  }
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  View all →
                </button>
              </div>
              {equipmentTotal === 0 ? (
                <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-dashed border-border bg-surface-subtle/60 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                      <Wrench className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        No equipment registered
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Add machines to monitor availability and breakdowns
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigatePlaan({ tab: 'maintenance', section: 'equipment' })
                    }
                    className="shrink-0"
                  >
                    Register machine
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-2.5 w-full rounded-md bg-secondary overflow-hidden flex gap-0.5">
                    {equipment!.breakdown > 0 && (
                      <div
                        className="h-full bg-destructive"
                        style={{
                          width: `${(equipment!.breakdown / equipmentTotal) * 100}%`,
                        }}
                      />
                    )}
                    {equipment!.operational > 0 && (
                      <div
                        className="h-full bg-success"
                        style={{
                          width: `${(equipment!.operational / equipmentTotal) * 100}%`,
                        }}
                      />
                    )}
                    {equipment!.underMaintenance > 0 && (
                      <div
                        className="h-full bg-warning"
                        style={{
                          width: `${(equipment!.underMaintenance / equipmentTotal) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <StatusCount
                      label="Breakdown"
                      value={equipment!.breakdown}
                      dotClass="bg-destructive"
                      onClick={() =>
                        navigatePlaan({ tab: 'maintenance', section: 'equipment' })
                      }
                    />
                    <StatusCount
                      label="Operational"
                      value={equipment!.operational}
                      dotClass="bg-success"
                      onClick={() =>
                        navigatePlaan({ tab: 'maintenance', section: 'equipment' })
                      }
                    />
                    <StatusCount
                      label="Under maint."
                      value={equipment!.underMaintenance}
                      dotClass="bg-warning"
                      onClick={() =>
                        navigatePlaan({ tab: 'maintenance', section: 'equipment' })
                      }
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </ContentCanvas>
  )
}

function SeriesSummary({
  label,
  swatchClass,
  latest,
  prev,
  currency,
  positiveIsGood,
}: {
  label: string
  swatchClass: string
  latest: number
  prev: number
  currency: string
  positiveIsGood: boolean
}) {
  const delta = latest - prev
  const showDelta = !(latest === 0 && prev === 0)

  return (
    <div className="flex flex-col sm:items-end">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={cn('h-1.5 w-1.5 rounded-[1px]', swatchClass)} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatMoney(latest, currency)}
        </span>
        {showDelta ? (
          delta === 0 ? (
            <span className="text-xs text-muted-foreground">No change</span>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
                positiveIsGood
                  ? delta > 0
                    ? 'text-success'
                    : 'text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              {delta > 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {delta > 0 ? '+' : '−'}
              {formatCompactAxisMoney(Math.abs(delta), currency)}
            </span>
          )
        ) : null}
      </div>
    </div>
  )
}

function SalesVsPurchasesCard({
  trend,
  currency,
}: {
  trend: DashboardTrendMonth[]
  currency: string
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const latest = trend.length > 0 ? trend[trend.length - 1] : undefined
  const prev = trend.length > 1 ? trend[trend.length - 2] : undefined
  const latestSales = Number(latest?.salesInvoiced || 0)
  const prevSales = Number(prev?.salesInvoiced || 0)
  const latestPurchases = Number(latest?.purchasesInvoiced || 0)
  const prevPurchases = Number(prev?.purchasesInvoiced || 0)

  const sharedMax = useMemo(
    () =>
      trend.reduce(
        (max, m) =>
          Math.max(max, Number(m.salesInvoiced || 0), Number(m.purchasesInvoiced || 0)),
        0
      ),
    [trend]
  )

  const yTop = sharedMax > 0 ? niceCeiling(sharedMax * 1.1) : 100
  const yMid = yTop / 2

  const hoveredItem =
    hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < trend.length
      ? trend[hoveredIndex]
      : null

  return (
    <section className="flex w-full flex-col justify-between rounded-md border border-border bg-card px-5 py-4 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Sales vs. purchases</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monthly invoice activity · last 6 months
          </p>
        </div>

        <div className="flex items-center gap-5">
          <SeriesSummary
            label="Sales"
            swatchClass="bg-ink"
            latest={latestSales}
            prev={prevSales}
            currency={currency}
            positiveIsGood
          />
          <SeriesSummary
            label="Purchases"
            swatchClass="bg-brand"
            latest={latestPurchases}
            prev={prevPurchases}
            currency={currency}
            positiveIsGood={false}
          />
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex gap-3">
          {/* Y-axis labels */}
          <div className="flex h-[170px] flex-col justify-between text-right text-xs tabular-nums text-muted-foreground shrink-0 select-none pb-0.5">
            <span>{sharedMax > 0 ? formatCompactAxisMoney(yTop, currency) : `${getCurrencySymbol(currency)}10K`}</span>
            <span>{sharedMax > 0 ? formatCompactAxisMoney(yMid, currency) : `${getCurrencySymbol(currency)}5K`}</span>
            <span>{formatCompactAxisMoney(0, currency)}</span>
          </div>

          {/* Plot grid + grouped bars */}
          <div
            className="relative flex-1"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Dashed horizontal gridlines */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[170px] flex flex-col justify-between">
              <div className="border-t border-dashed border-border/70" />
              <div className="border-t border-dashed border-border/70" />
              <div className="border-t border-border" />
            </div>

            {sharedMax === 0 && (
              <div className="pointer-events-auto absolute inset-x-0 top-0 h-[170px] z-10 flex items-center justify-center px-3">
                <div className="rounded-md border border-border/80 bg-card/95 px-5 py-3.5 text-center shadow-xs">
                  <p className="text-sm font-medium text-foreground">
                    No invoice activity yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sales and purchase invoices will plot here as transactions are posted.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigatePlaan({ tab: 'finance', section: 'sales-invoices' })
                    }
                    className="mt-2.5"
                  >
                    Record invoice
                  </Button>
                </div>
              </div>
            )}

            {/* Columns */}
            <div className="relative flex h-[170px] items-end justify-between gap-2 px-1">
              {trend.map((month, idx) => {
                const salesVal = Number(month.salesInvoiced || 0)
                const purchaseVal = Number(month.purchasesInvoiced || 0)
                const salesPct = sharedMax > 0 ? Math.max(salesVal > 0 ? 4 : 0, (salesVal / yTop) * 100) : 0
                const purchasePct =
                  sharedMax > 0 ? Math.max(purchaseVal > 0 ? 4 : 0, (purchaseVal / yTop) * 100) : 0
                const isDimmed = hoveredIndex !== null && hoveredIndex !== idx && sharedMax > 0

                return (
                  <div
                    key={month.monthKey}
                    onMouseEnter={() => sharedMax > 0 && setHoveredIndex(idx)}
                    className={cn(
                      'relative flex h-full flex-1 items-end justify-center gap-1 transition-opacity',
                      isDimmed ? 'opacity-45' : 'opacity-100',
                      sharedMax > 0 ? 'cursor-crosshair' : ''
                    )}
                  >
                    <div
                      className="w-3 sm:w-4 rounded-t-[2px] bg-ink transition-[height] duration-300"
                      style={{ height: `${salesPct}%` }}
                      title={
                        sharedMax > 0
                          ? `${month.monthLabel} Sales: ${formatMoney(salesVal, currency)}`
                          : undefined
                      }
                    />
                    <div
                      className="w-3 sm:w-4 rounded-t-[2px] bg-brand transition-[height] duration-300"
                      style={{ height: `${purchasePct}%` }}
                      title={
                        sharedMax > 0
                          ? `${month.monthLabel} Purchases: ${formatMoney(purchaseVal, currency)}`
                          : undefined
                      }
                    />
                  </div>
                )
              })}
            </div>

            {/* X-axis month labels */}
            <div className="mt-2 flex items-center justify-between gap-2 px-1">
              {trend.map((month, idx) => (
                <div
                  key={month.monthKey}
                  className={cn(
                    'flex-1 text-center text-xs tabular-nums transition-colors',
                    hoveredIndex === idx
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {month.monthLabel}
                </div>
              ))}
            </div>

            {/* Unified hover tooltip */}
            {hoveredItem && hoveredIndex !== null && sharedMax > 0 && (
              <div
                className={cn(
                  'pointer-events-none absolute top-1 z-20 min-w-[172px] rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md',
                  hoveredIndex <= 1
                    ? 'left-1'
                    : hoveredIndex >= trend.length - 2
                      ? 'right-1'
                      : 'left-1/2 -translate-x-1/2'
                )}
              >
                <p className="font-semibold text-foreground">{hoveredItem.monthLabel}</p>
                <div className="mt-1.5 space-y-1 tabular-nums">
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-[1px] bg-ink" />
                      Sales
                    </span>
                    <span className="font-medium text-foreground">
                      {formatMoney(Number(hoveredItem.salesInvoiced || 0), currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-[1px] bg-brand" />
                      Purchases
                    </span>
                    <span className="font-medium text-foreground">
                      {formatMoney(Number(hoveredItem.purchasesInvoiced || 0), currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-border/80 pt-1">
                    <span className="text-muted-foreground">Net</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(
                        Number(hoveredItem.salesInvoiced || 0) -
                          Number(hoveredItem.purchasesInvoiced || 0),
                        currency
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function StatusCount({
  label,
  value,
  dotClass,
  onClick,
}: {
  label: string
  value: number
  dotClass: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-md border border-border/70 bg-surface-subtle/70 dark:bg-secondary/40 px-3 py-2.5 text-left hover:border-border hover:bg-secondary/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-[1px]', dotClass)} aria-hidden="true" />
        <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">
          {label}
        </p>
      </div>
      <p className="text-lg font-semibold tabular-nums mt-0.5 text-foreground">
        {value}
      </p>
    </button>
  )
}
