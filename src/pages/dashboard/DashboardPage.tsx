import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { navigatePlaan } from '../../lib/navigate'
import { dashboardService } from '../../services/dashboardService'
import { useAuth } from '../../hooks/useAuth'
import type { DashboardOverview, DashboardTrendMonth } from '../../types/dashboard'

function formatMoney(amount: number, currency: string) {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

type AttentionItem = {
  key: string
  label: string
  count: number
  onClick: () => void
}

export function DashboardPage() {
  const { organization } = useAuth()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    dashboardService
      .getOverview()
      .then((data) => {
        if (!cancelled) setOverview(data)
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
    return [
      {
        key: 'overdue-pos',
        label: 'Overdue purchase orders',
        count: a.overduePurchaseOrders,
        onClick: () =>
          navigatePlaan({ tab: 'reports', reportId: 'pending-purchase-orders' }),
      },
      {
        key: 'overdue-dispatches',
        label: 'Overdue customer dispatches',
        count: a.overdueCustomerDispatches,
        onClick: () => navigatePlaan({ tab: 'reports', reportId: 'pending-dispatches' }),
      },
      {
        key: 'material-shortage',
        label: 'Production orders with material shortage',
        count: a.productionOrdersWithMaterialShortage,
        onClick: () =>
          navigatePlaan({ tab: 'manufacturing', section: 'production-orders' }),
      },
      {
        key: 'pending-qc',
        label: 'Pending quality inspections',
        count: a.pendingQualityInspections,
        onClick: () => navigatePlaan({ tab: 'reports', reportId: 'inspection-summary' }),
      },
      {
        key: 'overdue-ar',
        label: 'Overdue customer invoices',
        count: a.overdueCustomerInvoices,
        onClick: () =>
          navigatePlaan({ tab: 'reports', reportId: 'customer-outstanding' }),
      },
      {
        key: 'overdue-ap',
        label: 'Overdue supplier invoices',
        count: a.overdueSupplierInvoices,
        onClick: () =>
          navigatePlaan({ tab: 'reports', reportId: 'supplier-outstanding' }),
      },
      {
        key: 'overdue-maint',
        label: 'Overdue maintenance plans',
        count: a.overdueMaintenancePlans,
        onClick: () =>
          navigatePlaan({ tab: 'reports', reportId: 'due-overdue-maintenance' }),
      },
      {
        key: 'breakdowns',
        label: 'Equipment breakdowns',
        count: a.equipmentBreakdowns,
        onClick: () => navigatePlaan({ tab: 'maintenance', section: 'equipment' }),
      },
    ]
  }, [overview])

  const equipment = overview?.equipmentStatus
  const equipmentTotal = equipment?.activeMachines ?? 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Business overview
          {overview?.periodLabel ? (
            <span className="text-foreground"> · {overview.periodLabel}</span>
          ) : null}
        </p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {isLoading && !overview ? (
        <div className="rounded-md border border-border bg-card px-6 py-12 text-center shadow-xs">
          <p className="text-sm text-muted-foreground">Loading overview…</p>
        </div>
      ) : overview ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Sales Invoiced"
              hint="Current month"
              value={formatMoney(overview.metrics.salesInvoiced, currency)}
              onClick={() =>
                navigatePlaan({ tab: 'finance', section: 'sales-invoices' })
              }
            />
            <MetricCard
              label="Purchases Invoiced"
              hint="Current month"
              value={formatMoney(overview.metrics.purchasesInvoiced, currency)}
              onClick={() =>
                navigatePlaan({ tab: 'finance', section: 'purchase-invoices' })
              }
            />
            <MetricCard
              label="Customer Outstanding"
              hint="Live balance"
              value={formatMoney(overview.metrics.customerOutstanding, currency)}
              onClick={() =>
                navigatePlaan({ tab: 'reports', reportId: 'customer-outstanding' })
              }
            />
            <MetricCard
              label="Supplier Outstanding"
              hint="Live balance"
              value={formatMoney(overview.metrics.supplierOutstanding, currency)}
              onClick={() =>
                navigatePlaan({ tab: 'reports', reportId: 'supplier-outstanding' })
              }
            />
          </div>

          <SalesPurchaseTrend trend={overview.trend} currency={currency} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Production orders
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    navigatePlaan({ tab: 'manufacturing', section: 'production-orders' })
                  }
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatusCount label="Released" value={overview.productionOrders.released} />
                <StatusCount
                  label="In Progress"
                  value={overview.productionOrders.inProgress}
                />
                <StatusCount
                  label="Completed"
                  value={overview.productionOrders.completed}
                />
                <StatusCount label="Closed" value={overview.productionOrders.closed} />
              </div>
            </section>

            <section className="rounded-md border border-border bg-card px-4 py-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">Equipment status</h2>
                <button
                  type="button"
                  onClick={() =>
                    navigatePlaan({ tab: 'maintenance', section: 'equipment' })
                  }
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  View all
                </button>
              </div>
              {equipmentTotal === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No active machines yet.
                </p>
              ) : (
                <>
                  <div className="h-2.5 w-full rounded-md bg-secondary overflow-hidden flex">
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
                      tone="destructive"
                    />
                    <StatusCount
                      label="Operational"
                      value={equipment!.operational}
                      tone="success"
                    />
                    <StatusCount
                      label="Under Maintenance"
                      value={equipment!.underMaintenance}
                      tone="warning"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {equipmentTotal} active machine{equipmentTotal === 1 ? '' : 's'}
                  </p>
                </>
              )}
            </section>
          </div>

          <section className="rounded-md border border-border bg-card shadow-xs overflow-hidden">
            <div className="border-b border-border/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Requires attention</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Operational items that need follow-up
              </p>
            </div>
            {attentionItems.every((item) => item.count === 0) ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  Nothing requires attention
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Overdue work, shortages and breakdowns will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/80">
                {attentionItems.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {item.label}
                      </span>
                      <span className="inline-flex items-center gap-2 shrink-0">
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            item.count > 0 ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {item.count}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

/**
 * Stripe Billing Overview pattern (Mobbin): two equal series cards,
 * line charts with hover tooltip + MoM delta — no duplicate KPI totals.
 */
function SalesPurchaseTrend({
  trend,
  currency,
}: {
  trend: DashboardTrendMonth[]
  currency: string
}) {
  const labels = useMemo(() => trend.map((m) => m.monthLabel), [trend])
  const sales = useMemo(() => trend.map((m) => Number(m.salesInvoiced || 0)), [trend])
  const purchases = useMemo(
    () => trend.map((m) => Number(m.purchasesInvoiced || 0)),
    [trend]
  )

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Sales &amp; Purchase trend
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Monthly invoice values · last 6 months
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SeriesTrendCard
          title="Sales"
          values={sales}
          labels={labels}
          currency={currency}
          stroke="var(--foreground)"
          fillId="plaanSalesTrendFill"
        />
        <SeriesTrendCard
          title="Purchases"
          values={purchases}
          labels={labels}
          currency={currency}
          stroke="var(--brand)"
          fillId="plaanPurchaseTrendFill"
        />
      </div>
    </section>
  )
}

function SeriesTrendCard({
  title,
  values,
  labels,
  currency,
  stroke,
  fillId,
}: {
  title: string
  values: number[]
  labels: string[]
  currency: string
  stroke: string
  fillId: string
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const chart = useMemo(() => buildLineChart(values), [values])
  const containerRef = useRef<HTMLDivElement>(null)

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el || values.length === 0) return
    const rect = el.getBoundingClientRect()
    const ratio = rect.width <= 0 ? 0 : (event.clientX - rect.left) / rect.width
    const next = Math.round(ratio * (values.length - 1))
    setActiveIndex(Math.max(0, Math.min(values.length - 1, next)))
  }

  const point = activeIndex != null ? chart.points[activeIndex] : null
  const value = activeIndex != null ? values[activeIndex] ?? 0 : 0
  const prior =
    activeIndex != null && activeIndex > 0 ? values[activeIndex - 1] ?? 0 : 0
  const delta = value - prior
  const tooltipLeft =
    point && chart.width > 0 ? `${(point.x / chart.width) * 100}%` : '50%'

  return (
    <section className="rounded-md border border-border bg-card px-4 py-4 shadow-xs">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
      </div>

      <div
        ref={containerRef}
        className="relative mt-4 h-40 w-full cursor-crosshair touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setActiveIndex(null)}
        onPointerDown={onMove}
      >
        {chart.maxValue === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground">No invoices yet</p>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              className="h-full w-full overflow-visible"
              role="img"
              aria-label={`${title} trend`}
            >
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity="0.14" />
                  <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((t) => (
                <line
                  key={t}
                  x1={0}
                  x2={chart.width}
                  y1={chart.padTop + chart.plotH * t}
                  y2={chart.padTop + chart.plotH * t}
                  stroke="var(--border)"
                  strokeDasharray="3 4"
                />
              ))}
              <path d={chart.area} fill={`url(#${fillId})`} />
              <path
                d={chart.line}
                fill="none"
                stroke={stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {point && (
                <>
                  <line
                    x1={point.x}
                    x2={point.x}
                    y1={chart.padTop}
                    y2={chart.padTop + chart.plotH}
                    stroke="var(--muted-foreground)"
                    strokeOpacity="0.35"
                    strokeWidth="1"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="var(--card)"
                    stroke={stroke}
                    strokeWidth="2"
                  />
                </>
              )}
            </svg>

            {activeIndex != null && (
              <div
                className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-1.5 shadow-panel"
                style={{ left: tooltipLeft }}
              >
                <p className="text-[11px] text-muted-foreground">{labels[activeIndex]}</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatMoney(value, currency)}
                </p>
                {activeIndex > 0 && (
                  <p
                    className={`mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
                      delta >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {delta >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {formatMoney(Math.abs(delta), currency)} vs prior
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-2 flex justify-between gap-1">
        {labels.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className={`flex-1 text-center text-[10px] font-medium ${
              activeIndex === i ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}

function buildLineChart(values: number[]) {
  const width = 480
  const height = 140
  const padX = 6
  const padTop = 10
  const padBottom = 4
  const plotH = height - padTop - padBottom
  const baseline = padTop + plotH
  const n = Math.max(values.length, 1)
  const step = n === 1 ? 0 : (width - padX * 2) / (n - 1)
  const maxValue = values.reduce((max, v) => Math.max(max, Number(v || 0)), 0)
  const scaleMax = maxValue <= 0 ? 1 : maxValue * 1.1

  const points = values.map((value, i) => ({
    x: padX + i * step,
    y: maxValue <= 0 ? baseline : baseline - (Number(value || 0) / scaleMax) * plotH,
  }))

  const line = monotonePath(points, padTop, baseline)
  return {
    width,
    height,
    padTop,
    plotH,
    maxValue,
    points,
    line,
    area: areaFromLine(line, points, baseline),
  }
}

function monotonePath(
  points: Array<{ x: number; y: number }>,
  yMin: number,
  yMax: number
) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  const n = points.length
  const dx: number[] = []
  const dy: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x)
    dy.push(points[i + 1].y - points[i].y)
    m.push(dx[i] === 0 ? 0 : dy[i] / dx[i])
  }

  const slopes = new Array<number>(n)
  slopes[0] = m[0] ?? 0
  slopes[n - 1] = m[n - 2] ?? 0
  for (let i = 1; i < n - 1; i++) {
    slopes[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(m[i]) < 1e-8) {
      slopes[i] = 0
      slopes[i + 1] = 0
    } else {
      const a = slopes[i] / m[i]
      const b = slopes[i + 1] / m[i]
      const s = a * a + b * b
      if (s > 9) {
        const t = 3 / Math.sqrt(s)
        slopes[i] = t * a * m[i]
        slopes[i + 1] = t * b * m[i]
      }
    }
  }

  const clamp = (y: number) => Math.min(yMax, Math.max(yMin, y))
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    d += ` C ${p1.x + dx[i] / 3} ${clamp(p1.y + (slopes[i] * dx[i]) / 3)}, ${
      p2.x - dx[i] / 3
    } ${clamp(p2.y - (slopes[i + 1] * dx[i]) / 3)}, ${p2.x} ${p2.y}`
  }
  return d
}

function areaFromLine(
  line: string,
  points: Array<{ x: number; y: number }>,
  baseline: number
) {
  if (!line || points.length === 0) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
}

function MetricCard({
  label,
  hint,
  value,
  onClick,
}: {
  label: string
  hint: string
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border bg-card px-4 py-3.5 shadow-xs text-left hover:bg-secondary/40 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {hint}
        </span>
      </div>
      <p className="text-xl font-semibold tabular-nums text-foreground mt-1.5 tracking-tight">
        {value}
      </p>
    </button>
  )
}

function StatusCount({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'success' | 'warning' | 'destructive'
}) {
  const valueClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'destructive'
          ? 'text-destructive'
          : 'text-foreground'
  return (
    <div className="rounded-md border border-border/80 bg-secondary/40 px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums mt-0.5 ${valueClass}`}>{value}</p>
    </div>
  )
}
