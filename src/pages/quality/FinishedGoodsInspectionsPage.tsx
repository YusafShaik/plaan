import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Alert } from '../../components/ui/Alert'
import { FinishedGoodsInspectionForm } from './FinishedGoodsInspectionForm'
import { qualityService } from '../../services/qualityService'
import type {
  FinishedGoodsInspection,
  FinishedGoodsInspectionStatus,
} from '../../types/quality'
import type { PageResponse } from '../../types/masterData'

function statusBadge(status: FinishedGoodsInspectionStatus) {
  if (status === 'COMPLETED') return <Badge variant="success">Completed</Badge>
  if (status === 'DRAFT') return <Badge variant="info">Draft</Badge>
  return <Badge variant="warning">Pending</Badge>
}

function formatQty(qty: number) {
  if (qty % 1 === 0) return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
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
      setIsLoading(true)
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
          setError(err instanceof Error ? err.message : 'Failed to load finished goods inspections.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => load(0), 250)
    return () => clearTimeout(timer)
  }, [load])

  const hasFilters = Boolean(search || statusFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search receipt, order, item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>
          <NativeSelect
            dense
            className="w-auto min-w-[9rem]"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as FinishedGoodsInspectionStatus | '')
            }
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="DRAFT">Draft</option>
            <option value="COMPLETED">Completed</option>
          </NativeSelect>
          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
              }}
              className="h-10 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {isLoading && inspections.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <p className="mt-3 text-xs text-muted-foreground">Loading inspections...</p>
        </div>
      ) : inspections.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-foreground">No finished goods inspections</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {hasFilters
              ? 'No inspections match your filters.'
              : 'Pending inspections are created automatically when a Production Receipt is posted for products with an active Finished Goods template.'}
          </p>
        </div>
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Production Receipt</TH>
                <TH>Item</TH>
                <TH className="text-right">Quantity</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {inspections.map((row) => (
                <TR
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(row.id)}
                >
                  <TD>
                    <RefLink>{row.productionReceiptNumber}</RefLink>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.inspectionNumber} · {row.productionOrderNumber}
                    </p>
                  </TD>
                  <TD className="font-medium">
                    {row.itemName}
                    <p className="text-xs text-ref text-muted-foreground mt-0.5">{row.itemCode}</p>
                  </TD>
                  <TD className="text-right tabular-nums">
                    {formatQty(row.receivedQuantity)}
                    <span className="ml-1 text-muted-foreground font-sans text-xs">
                      {row.unitOfMeasure}
                    </span>
                  </TD>
                  <TD>{statusBadge(row.status)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {pageData && (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {inspections.length} of {pageData.totalElements} inspections
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => load(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <span className="px-2 text-foreground font-medium">
                  Page {pageData.page + 1} of {pageData.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => load(currentPage + 1)}
                  disabled={currentPage >= pageData.totalPages - 1}
                  className="h-8 gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

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
