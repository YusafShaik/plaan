import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Cog,
  Edit,
  Eye,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Alert } from '../../components/ui/Alert'
import { CreateEquipmentModal } from './CreateEquipmentModal'
import { EquipmentDetailsModal } from './EquipmentDetailsModal'
import { maintenanceService } from '../../services/maintenanceService'
import type {
  Equipment,
  EquipmentOperationalStatus,
  EquipmentRecordStatus,
} from '../../types/maintenance'
import type { PageResponse } from '../../types/masterData'

const OPS_LABEL: Record<EquipmentOperationalStatus, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under Maintenance',
  BREAKDOWN: 'Breakdown',
}

function operationalBadge(status: EquipmentOperationalStatus) {
  if (status === 'OPERATIONAL') return <Badge variant="success">{OPS_LABEL[status]}</Badge>
  if (status === 'UNDER_MAINTENANCE') return <Badge variant="warning">{OPS_LABEL[status]}</Badge>
  return <Badge variant="destructive">{OPS_LABEL[status]}</Badge>
}

export function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [pageData, setPageData] = useState<PageResponse<Equipment> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [opsFilter, setOpsFilter] = useState<EquipmentOperationalStatus | ''>('')
  const [recordFilter, setRecordFilter] = useState<EquipmentRecordStatus | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null)
  const [selected, setSelected] = useState<Equipment | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const load = useCallback(
    (page = 0) => {
      setIsLoading(true)
      setError(null)
      maintenanceService
        .getEquipment({
          search: search.trim() || undefined,
          operationalStatus: opsFilter || undefined,
          recordStatus: recordFilter || undefined,
          page,
          size: pageSize,
        })
        .then((res) => {
          setEquipment(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load equipment.')
          setIsLoading(false)
        })
    },
    [search, opsFilter, recordFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => load(0), 250)
    return () => clearTimeout(timer)
  }, [load])

  const openDetails = (item: Equipment) => {
    setSelected(item)
    setIsDetailsOpen(true)
  }

  const hasFilters = Boolean(search || opsFilter || recordFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>
          <NativeSelect
            dense
            className="w-auto min-w-[10rem]"
            value={opsFilter}
            onChange={(e) => setOpsFilter(e.target.value as EquipmentOperationalStatus | '')}
          >
            <option value="">All Conditions</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="BREAKDOWN">Breakdown</option>
          </NativeSelect>
          <NativeSelect
            dense
            className="w-auto min-w-[8.5rem]"
            value={recordFilter}
            onChange={(e) => setRecordFilter(e.target.value as EquipmentRecordStatus | '')}
          >
            <option value="">All Records</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </NativeSelect>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setOpsFilter('')
                setRecordFilter('')
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ml-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setEquipmentToEdit(null)
            setIsCreateOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          New Equipment
        </Button>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <Table className="border-0 rounded-none shadow-none bg-transparent">
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Equipment</TH>
              <TH>Location</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && equipment.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-16 text-center text-muted-foreground">
                  Loading equipment...
                </TD>
              </TR>
            ) : equipment.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Cog className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No equipment found.</p>
                    <p className="text-xs text-muted-foreground">
                      Register machines before creating maintenance plans or work orders.
                    </p>
                  </div>
                </TD>
              </TR>
            ) : (
              equipment.map((row) => (
                <TR
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => openDetails(row)}
                >
                  <TD>
                    <RefLink>{row.equipmentCode}</RefLink>
                    {row.recordStatus === 'INACTIVE' && (
                      <span className="ml-2 text-xs text-muted-foreground">Inactive</span>
                    )}
                  </TD>
                  <TD className="font-medium text-foreground">{row.equipmentName}</TD>
                  <TD>{row.location || '—'}</TD>
                  <TD>{operationalBadge(row.operationalStatus)}</TD>
                  <TD className="text-right">
                    <div
                      className="inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="View"
                        onClick={() => openDetails(row)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => {
                          setEquipmentToEdit(row)
                          setIsCreateOpen(true)
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>

      {pageData && equipment.length > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <div>
            Showing {equipment.length} of {pageData.totalElements} equipment
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

      <CreateEquipmentModal
        isOpen={isCreateOpen}
        equipmentToEdit={equipmentToEdit}
        onClose={() => {
          setIsCreateOpen(false)
          setEquipmentToEdit(null)
        }}
        onSuccess={() => load(currentPage)}
      />

      <EquipmentDetailsModal
        isOpen={isDetailsOpen}
        equipment={selected}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelected(null)
        }}
        onEdit={(item) => {
          setEquipmentToEdit(item)
          setIsCreateOpen(true)
        }}
        onChanged={() => load(currentPage)}
      />
    </div>
  )
}
