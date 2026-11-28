import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Layers,
  Eye,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Ban,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
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
import { manufacturingService } from '../../services/manufacturingService'
import { confirmAction, toast } from '../../lib/feedback'
import { formatQuantity } from '../../lib/format'
import { cn } from '../../lib/cn'
import { CreateBomModal } from './CreateBomModal'
import { BomDetailsModal } from './BomDetailsModal'
import type { Bom, BomStatus } from '../../types/manufacturing'
import type { PageResponse } from '../../types/masterData'

const BOM_STATUS_FILTERS: Array<{ id: BomStatus | ''; label: string }> = [
  { id: '', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'INACTIVE', label: 'Inactive' },
]

const STATUS_BADGE: Record<BomStatus, { variant: BadgeVariant; label: string }> = {
  ACTIVE: { variant: 'success', label: 'Active' },
  DRAFT: { variant: 'warning', label: 'Draft' },
  INACTIVE: { variant: 'neutral', label: 'Inactive' },
}

export interface BillOfMaterialsPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
}

export function BillOfMaterialsPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
}: BillOfMaterialsPageProps = {}) {
  const [boms, setBoms] = useState<Bom[]>([])
  const [pageData, setPageData] = useState<PageResponse<Bom> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BomStatus | ''>('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isCreateModalOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsCreateModalOpen = setControlledModalOpen || setInternalModalOpen
  const [editingDraft, setEditingDraft] = useState<Bom | null>(null)
  const [selectedBom, setSelectedBom] = useState<Bom | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const menuContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadBoms = useCallback(
    (page = 0) => {
      manufacturingService
        .getBoms({
          search: search.trim() || undefined,
          status: statusFilter ? statusFilter : undefined,
          page,
          size: pageSize,
          sortBy: 'createdAt',
          direction: 'desc',
        })
        .then((res) => {
          setError(null)
          setBoms(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load bills of materials.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBoms(0)
    }, 0)
    return () => clearTimeout(timer)
  }, [loadBoms])

  const handleActivateBom = async (id: number) => {
    try {
      await manufacturingService.activateBom(id)
      loadBoms(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedBom(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate BOM')
    }
  }

  const handleDeactivateBom = async (id: number) => {
    const ok = await confirmAction({
      title: 'Deactivate this BOM?',
      description: 'It will no longer be available for new production orders.',
      confirmLabel: 'Deactivate BOM',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await manufacturingService.deactivateBom(id)
      loadBoms(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedBom(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate BOM')
    }
  }

  const handleDeleteDraftBom = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete draft BOM?',
      description: 'This draft bill of materials will be permanently deleted.',
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await manufacturingService.deleteDraftBom(id)
      loadBoms(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedBom(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete draft BOM')
    }
  }

  const handleOpenEdit = (bom: Bom) => {
    setIsDetailsModalOpen(false)
    setSelectedBom(null)
    setEditingDraft(bom)
    setIsCreateModalOpen(true)
  }

  const hasActiveFilters = Boolean(search.trim() || statusFilter)
  const clearAllFilters = () => {
    setSearch('')
    setStatusFilter('')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search BOMs..." />

        <div
          className="inline-flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Filter by status"
        >
          {BOM_STATUS_FILTERS.map((opt) => {
            const active = statusFilter === opt.id
            return (
              <button
                key={opt.id || 'all'}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={cn(
                  'h-8 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                  active
                    ? 'bg-ink text-ink-foreground'
                    : 'border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer px-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <div className="w-full" ref={menuContainerRef}>
        {isLoading && boms.length === 0 ? (
          <div className="py-20 text-center rounded-md border border-border bg-card">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">
              Loading bills of materials...
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center rounded-md border border-border bg-card">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true)
                loadBoms(0)
              }}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-border/80 bg-card overflow-visible">
            <Table className="border-0 rounded-none overflow-visible" tableClassName="table-fixed">
              <THead>
                <tr>
                  <TH className="w-[14%]">BOM code</TH>
                  <TH className="w-[32%]">Product</TH>
                  <TH className="w-[14%] text-right">Output qty</TH>
                  <TH className="w-[13%] text-right">Components</TH>
                  <TH className="w-[12%] pl-6">Status</TH>
                  <TH className="w-[15%] px-3 text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {boms.length === 0 ? (
                  <TR>
                    <TD colSpan={6} className="p-0">
                      <TableEmptyState
                        icon={<Layers className="h-5 w-5" />}
                        title="No bills of materials found"
                        description={
                          hasActiveFilters
                            ? 'No bills of materials match your current search or status filter.'
                            : 'Define the materials and quantities required to manufacture a product using "+ Create BOM" above.'
                        }
                        action={
                          hasActiveFilters ? (
                            <Button variant="outline" size="sm" onClick={clearAllFilters}>
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reset filters
                            </Button>
                          ) : undefined
                        }
                      />
                    </TD>
                  </TR>
                ) : (
                  boms.map((bom) => {
                    const badge = STATUS_BADGE[bom.status] ?? {
                      variant: 'neutral',
                      label: bom.status,
                    }

                    return (
                      <TR
                        key={bom.id}
                        clickable
                        onClick={() => {
                          setOpenMenuId(null)
                          setSelectedBom(bom)
                          setIsDetailsModalOpen(true)
                        }}
                      >
                        <TD>
                          <span className="text-ref-link">{bom.bomCode}</span>
                        </TD>

                        <TD>
                          <p className="font-medium truncate">{bom.productName}</p>
                          <p className="text-ref text-muted-foreground">{bom.productCode}</p>
                        </TD>

                        <TD className="text-right tabular-nums font-medium">
                          {formatQuantity(bom.outputQuantity)}{' '}
                          <span className="text-xs font-normal text-muted-foreground uppercase">
                            {bom.unitOfMeasure}
                          </span>
                        </TD>

                        <TD className="text-right tabular-nums font-medium">
                          {bom.totalComponents}
                        </TD>

                        <TD className="pl-6">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TD>

                        <TD className="px-3 text-right whitespace-nowrap">
                          <div
                            className="relative inline-flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {bom.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => handleActivateBom(bom.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                title="Activate BOM"
                              >
                                <PackageCheck className="h-3 w-3 text-muted-foreground" />
                                Activate
                              </button>
                            )}

                            {bom.status === 'INACTIVE' && (
                              <button
                                type="button"
                                onClick={() => handleActivateBom(bom.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer transition-colors"
                                title="Reactivate BOM"
                              >
                                Reactivate
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === bom.id ? null : bom.id))
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                              aria-label="More BOM actions"
                              aria-expanded={openMenuId === bom.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {openMenuId === bom.id && (
                              <div className="absolute right-0 top-full z-40 mt-1 w-40 rounded-md border border-border bg-card py-1 shadow-panel text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    setSelectedBom(bom)
                                    setIsDetailsModalOpen(true)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                  View details
                                </button>
                                {bom.status === 'DRAFT' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null)
                                        handleOpenEdit(bom)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                      Edit draft
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null)
                                        handleDeleteDraftBom(bom.id)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete draft
                                    </button>
                                  </>
                                )}
                                {bom.status === 'ACTIVE' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      handleDeactivateBom(bom.id)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    Deactivate
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </TD>
                      </TR>
                    )
                  })
                )}
              </TBody>
            </Table>

            {pageData && (
              <TablePagination
                page={currentPage}
                totalPages={pageData.totalPages}
                totalElements={pageData.totalElements}
                count={boms.length}
                itemLabel="BOMs"
                onPageChange={(nextPage) => {
                  setIsLoading(true)
                  loadBoms(nextPage)
                }}
              />
            )}
          </div>
        )}
      </div>

      <CreateBomModal
        isOpen={isCreateModalOpen}
        initialDraft={editingDraft}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingDraft(null)
        }}
        onSuccess={() => {
          loadBoms(currentPage)
        }}
      />

      <BomDetailsModal
        isOpen={isDetailsModalOpen}
        bom={selectedBom}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedBom(null)
        }}
        onEdit={handleOpenEdit}
        onActivate={handleActivateBom}
        onDeactivate={handleDeactivateBom}
        onDelete={handleDeleteDraftBom}
      />
    </div>
  )
}
