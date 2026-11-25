import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Pencil,
  Trash2,
  PackageCheck,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { manufacturingService } from '../../services/manufacturingService'
import { CreateBomModal } from './CreateBomModal'
import { BomDetailsModal } from './BomDetailsModal'
import type { Bom, BomStatus } from '../../types/manufacturing'
import type { PageResponse } from '../../types/masterData'

export function BillOfMaterialsPage() {
  const [boms, setBoms] = useState<Bom[]>([])
  const [pageData, setPageData] = useState<PageResponse<Bom> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BomStatus | ''>('')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState<Bom | null>(null)
  const [selectedBom, setSelectedBom] = useState<Bom | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

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
          setError(err instanceof Error ? err.message : 'Failed to load Bill of Materials.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, pageSize]
  )

  useEffect(() => {
    loadBoms(0)
  }, [loadBoms])

  const handleActivateBom = async (id: number) => {
    try {
      await manufacturingService.activateBom(id)
      loadBoms(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedBom(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to activate BOM')
    }
  }

  const handleDeactivateBom = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this BOM? It will no longer be available for new Production Orders.')) return
    try {
      await manufacturingService.deactivateBom(id)
      loadBoms(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedBom(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate BOM')
    }
  }

  const handleDeleteDraftBom = async (id: number) => {
    if (!confirm('Are you sure you want to delete this draft BOM?')) return
    try {
      await manufacturingService.deleteDraftBom(id)
      loadBoms(currentPage)
      setIsDetailsModalOpen(false)
      setSelectedBom(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete draft BOM')
    }
  }

  const handleOpenEdit = (bom: Bom) => {
    setIsDetailsModalOpen(false)
    setSelectedBom(null)
    setEditingDraft(bom)
    setIsCreateModalOpen(true)
  }

  const formatQuantity = (qty: number) => {
    if (qty % 1 === 0) {
      return qty.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
    return qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
  }

  return (
    <div className="space-y-4">
      {/* 1. Toolbar matching reference design: Search, Status Filter, + Create BOM */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-64 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search BOMs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Status Filter */}
          <NativeSelect
            dense
            className="w-auto min-w-[9.5rem]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BomStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="INACTIVE">Inactive</option>
          </NativeSelect>

          {(search || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ml-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        {/* Right side: + Create BOM button */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={() => {
              setEditingDraft(null)
              setIsCreateModalOpen(true)
            }}
            className="flex h-10 items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create BOM</span>
          </Button>
        </div>
      </div>

      {/* 2. BOM Table matching screenshot (uploaded_media_0_1795538672466.png) */}
      <div className="w-full">
        {isLoading && boms.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-xs text-muted-foreground">Loading Bill of Materials...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
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
        ) : boms.length === 0 ? (
          <div className="py-16 text-center rounded-md border border-border/80 bg-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <Layers className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No Bill of Materials found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              A Bill of Materials defines which materials and how much of each material are required to manufacture a product.
            </p>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First BOM</span>
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>BOM code</TH>
                  <TH>Product</TH>
                  <TH>Output qty</TH>
                  <TH className="text-center">Components</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {boms.map((bom) => (
                  <TR
                    key={bom.id}
                    clickable
                    onClick={() => {
                      setSelectedBom(bom)
                      setIsDetailsModalOpen(true)
                    }}
                  >
                    <TD>
                      <span className="text-ref-link">{bom.bomCode}</span>
                    </TD>

                    <TD>
                      <p className="font-medium">{bom.productName}</p>
                      <p className="text-[11px] text-ref text-muted-foreground">
                        {bom.productCode}
                      </p>
                    </TD>

                    <TD className="font-mono font-medium">
                      {formatQuantity(bom.outputQuantity)} {bom.unitOfMeasure}
                    </TD>

                    <TD className="text-center font-mono">
                      <span className="font-medium">{bom.totalComponents}</span>
                    </TD>

                    <TD>
                      {bom.status === 'ACTIVE' && (
                        <Badge variant="success">Active</Badge>
                      )}
                      {bom.status === 'DRAFT' && (
                        <Badge variant="warning">Draft</Badge>
                      )}
                      {bom.status === 'INACTIVE' && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </TD>

                    <TD
                      className="text-right space-x-1.5 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {bom.status === 'DRAFT' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(bom)}
                            className="h-8 px-2.5 text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleActivateBom(bom.id)}
                            className="h-8 px-2.5 text-xs bg-success text-success-foreground hover:opacity-90 cursor-pointer inline-flex items-center gap-1"
                          >
                            <PackageCheck className="h-3 w-3" />
                            <span>Activate</span>
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraftBom(bom.id)}
                            className="text-xs text-destructive hover:underline cursor-pointer ml-1 p-1"
                            title="Delete draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : bom.status === 'ACTIVE' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivateBom(bom.id)}
                            className="h-8 px-2.5 text-xs text-warning border-warning/30 hover:bg-warning/10 cursor-pointer"
                          >
                            Deactivate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBom(bom)
                              setIsDetailsModalOpen(true)
                            }}
                            className="h-8 px-2.5 text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivateBom(bom.id)}
                            className="h-8 px-2.5 text-xs text-success border-success/30 hover:bg-success/10 cursor-pointer"
                          >
                            Reactivate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBom(bom)
                              setIsDetailsModalOpen(true)
                            }}
                            className="h-8 px-2.5 text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </Button>
                        </>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            {/* Pagination footer */}
            {pageData && pageData.totalPages > 1 && (
              <div className="flex items-center justify-between border border-t-0 border-border/80 rounded-b-md bg-card px-4 py-3 text-xs text-muted-foreground">
                <span>
                  Showing {boms.length} of {pageData.totalElements} BOMs
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsLoading(true)
                      loadBoms(currentPage - 1)
                    }}
                    disabled={currentPage === 0}
                    className="h-8 gap-1 text-xs cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </Button>
                  <span className="px-2 text-foreground font-medium">
                    Page {pageData.page + 1} of {pageData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsLoading(true)
                      loadBoms(currentPage + 1)
                    }}
                    disabled={currentPage >= pageData.totalPages - 1}
                    className="h-8 gap-1 text-xs cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit BOM Popup Modal */}
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

      {/* BOM Details Modal */}
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
