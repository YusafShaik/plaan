import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { SearchInput } from '../../components/ui/Input'
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
import { Alert } from '../../components/ui/Alert'
import { FinishedGoodsInspectionForm } from './FinishedGoodsInspectionForm'
import { qualityService } from '../../services/qualityService'
import { formatQuantity, formatShortDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import type {
  FinishedGoodsInspection,
  FinishedGoodsInspectionStatus,
} from '../../types/quality'
import type { PageResponse } from '../../types/masterData'

const STATUS_FILTERS: { value: FinishedGoodsInspectionStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'COMPLETED', label: 'Completed' },
]

function statusBadge(status: FinishedGoodsInspectionStatus) {
  if (status === 'COMPLETED') return <Badge variant="success">Completed</Badge>
  if (status === 'DRAFT') return <Badge variant="neutral">Draft</Badge>
  return <Badge variant="warning">Pending</Badge>
}

export function FinishedGoodsInspectionsPage() {
  const [inspections, setInspections] = useState<FinishedGoodsInspection[]>([])
  const [pageData, setPageData] = useState<PageResponse<FinishedGoodsInspection> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FinishedGoodsInspectionStatus | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const load = useCallback(
    (page = 0) => {
      setError(null)
      qualityService
        .getFinishedGoodsInspections({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          page,
          size: pageSize,
        })
        .then((res) => {
          setInspections(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : 'Failed to load finished goods inspections.'
          )
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => load(0), 200)
    return () => clearTimeout(timer)
  }, [load])

  const hasFilters = Boolean(search || statusFilter)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search receipt, order, item..."
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((pill) => {
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
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="rounded-md border border-border/80 bg-card overflow-visible">
        <Table className="border-0 rounded-none overflow-visible" tableClassName="table-fixed">
          <THead>
            <tr>
              <TH className="w-[17%]">Production receipt</TH>
              <TH className="w-[25%]">Item</TH>
              <TH className="w-[17%]">Warehouse</TH>
              <TH className="w-[12%]">Date</TH>
              <TH className="w-[10%] text-right">Quantity</TH>
              <TH className="w-[10%] pl-4">Status</TH>
              <TH className="w-[9%] px-3 text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && inspections.length === 0 ? (
              <TR>
                <TD colSpan={7} className="py-16 text-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-foreground" />
                  Loading finished goods inspections...
                </TD>
              </TR>
            ) : inspections.length === 0 ? (
              <TR>
                <TD colSpan={7} className="p-0">
                  <TableEmptyState
                    icon={<ClipboardCheck className="h-5 w-5" />}
                    title="No finished goods inspections found"
                    description={
                      hasFilters
                        ? 'No finished goods inspections match your current search or status filter.'
                        : 'Pending inspections are created automatically when a Production Receipt is posted for products with an active Finished goods template.'
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
              inspections.map((row) => (
                <TR key={row.id} clickable onClick={() => setSelectedId(row.id)}>
                  <TD>
                    <span className="text-ref-link">{row.productionReceiptNumber}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {row.inspectionNumber} · {row.productionOrderNumber}
                    </p>
                  </TD>
                  <TD>
                    <p className="font-medium text-foreground truncate">{row.itemName}</p>
                    <p className="text-ref text-muted-foreground truncate">{row.itemCode}</p>
                  </TD>
                  <TD>
                    <p className="text-foreground truncate">{row.warehouseName}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.warehouseCode}</p>
                  </TD>
                  <TD className="text-muted-foreground tabular-nums">
                    {formatShortDate(row.inspectionDate)}
                  </TD>
                  <TD className="text-right tabular-nums font-medium">
                    {formatQuantity(row.receivedQuantity)}{' '}
                    <span className="text-xs font-normal text-muted-foreground uppercase">
                      {row.unitOfMeasure}
                    </span>
                  </TD>
                  <TD className="pl-4">{statusBadge(row.status)}</TD>
                  <TD className="px-3 text-right">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant={row.status === 'COMPLETED' ? 'ghost' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedId(row.id)}
                      >
                        {row.status === 'COMPLETED' ? 'View' : 'Inspect'}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        {pageData && (
          <TablePagination
            page={currentPage}
            totalPages={pageData.totalPages}
            totalElements={pageData.totalElements}
            count={inspections.length}
            itemLabel="inspections"
            onPageChange={(nextPage) => load(nextPage)}
          />
        )}
      </div>

      <FinishedGoodsInspectionForm
        isOpen={selectedId != null}
        inspectionId={selectedId}
        onClose={() => {
          setSelectedId(null)
          load(currentPage)
        }}
        onCompleted={() => {
          setSelectedId(null)
          load(0)
        }}
      />
    </div>
  )
}
