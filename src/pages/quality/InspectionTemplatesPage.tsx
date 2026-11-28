import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  Edit,
  Eye,
  MoreHorizontal,
  Power,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
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
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Alert } from '../../components/ui/Alert'
import { CreateInspectionTemplateModal } from './CreateInspectionTemplateModal'
import { InspectionTemplateDetailsModal } from './InspectionTemplateDetailsModal'
import { qualityService } from '../../services/qualityService'
import { confirmAction, toast } from '../../lib/feedback'
import { cn } from '../../lib/cn'
import type {
  InspectionTemplate,
  InspectionTemplateStatus,
  InspectionType,
} from '../../types/quality'
import type { PageResponse } from '../../types/masterData'

const TYPE_LABEL: Record<InspectionType, string> = {
  INCOMING: 'Incoming',
  FINISHED_GOODS: 'Finished goods',
}

const STATUS_FILTERS: { value: InspectionTemplateStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INACTIVE', label: 'Inactive' },
]

export interface InspectionTemplatesPageProps {
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
}

export function InspectionTemplatesPage({
  isModalOpen: controlledModalOpen,
  setIsModalOpen: setControlledModalOpen,
}: InspectionTemplatesPageProps = {}) {
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])
  const [pageData, setPageData] = useState<PageResponse<InspectionTemplate> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InspectionTemplateStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<InspectionType | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isCreateOpen =
    controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsCreateOpen = setControlledModalOpen || setInternalModalOpen
  const [templateToEdit, setTemplateToEdit] = useState<InspectionTemplate | null>(null)
  const [selected, setSelected] = useState<InspectionTemplate | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const load = useCallback(
    (page = 0) => {
      setError(null)
      qualityService
        .getTemplates({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          inspectionType: typeFilter || undefined,
          page,
          size: pageSize,
        })
        .then((res) => {
          setTemplates(res.content)
          setPageData(res)
          setCurrentPage(res.page)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load templates.')
          setIsLoading(false)
        })
    },
    [search, statusFilter, typeFilter, pageSize]
  )

  useEffect(() => {
    const timer = setTimeout(() => load(0), 200)
    return () => clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (openMenuId === null) return
    const handleOutside = () => setOpenMenuId(null)
    window.addEventListener('click', handleOutside)
    return () => window.removeEventListener('click', handleOutside)
  }, [openMenuId])

  const handleActivate = async (template: InspectionTemplate) => {
    setOpenMenuId(null)
    setProcessingId(template.id)
    try {
      await qualityService.activateTemplate(template.id)
      toast.success(`Template ${template.templateCode} activated`)
      load(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate template.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeactivate = async (template: InspectionTemplate) => {
    setOpenMenuId(null)
    const ok = await confirmAction({
      title: 'Deactivate template?',
      description: `${template.templateCode} will no longer be used for new inspections.`,
      confirmLabel: 'Deactivate',
      variant: 'destructive',
    })
    if (!ok) return
    setProcessingId(template.id)
    try {
      await qualityService.deactivateTemplate(template.id)
      toast.success(`Template ${template.templateCode} deactivated`)
      load(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate template.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (template: InspectionTemplate) => {
    setOpenMenuId(null)
    const ok = await confirmAction({
      title: 'Delete draft template?',
      description: `Draft template ${template.templateCode} will be permanently deleted.`,
      confirmLabel: 'Delete draft',
      variant: 'destructive',
    })
    if (!ok) return
    setProcessingId(template.id)
    try {
      await qualityService.deleteDraftTemplate(template.id)
      toast.success(`Draft template ${template.templateCode} deleted`)
      load(currentPage)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template.')
    } finally {
      setProcessingId(null)
    }
  }

  const openDetails = (template: InspectionTemplate) => {
    setOpenMenuId(null)
    setSelected(template)
    setIsDetailsOpen(true)
  }

  const hasFilters = Boolean(search || statusFilter || typeFilter)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setTypeFilter('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search templates..."
          />
          <NativeSelect
            dense
            className="w-auto min-w-[9rem]"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as InspectionType | '')}
          >
            <option value="">All types</option>
            <option value="INCOMING">Incoming</option>
            <option value="FINISHED_GOODS">Finished goods</option>
          </NativeSelect>
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
              <TH className="w-[12%]">Code</TH>
              <TH className="w-[34%]">Item</TH>
              <TH className="w-[16%]">Inspection type</TH>
              <TH className="w-[11%] text-right">Parameters</TH>
              <TH className="w-[12%] pl-6">Status</TH>
              <TH className="w-[15%] px-3 text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && templates.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-16 text-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-foreground" />
                  Loading templates...
                </TD>
              </TR>
            ) : templates.length === 0 ? (
              <TR>
                <TD colSpan={6} className="p-0">
                  <TableEmptyState
                    icon={<ClipboardList className="h-5 w-5" />}
                    title="No templates found"
                    description={
                      hasFilters
                        ? 'No inspection templates match your current search or filters.'
                        : 'Define quality checks for an item using "+ New template" above.'
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
              templates.map((template) => {
                const isBusy = processingId === template.id
                const paramCount = template.parametersCount ?? template.parameters?.length ?? 0

                return (
                  <TR
                    key={template.id}
                    clickable
                    onClick={() => openDetails(template)}
                  >
                    <TD>
                      <span className="text-ref-link">{template.templateCode}</span>
                    </TD>
                    <TD>
                      <p className="font-medium text-foreground truncate">{template.itemName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {template.templateName}
                      </p>
                    </TD>
                    <TD className="text-foreground">{TYPE_LABEL[template.inspectionType]}</TD>
                    <TD className="text-right tabular-nums font-medium">{paramCount}</TD>
                    <TD className="pl-6">
                      {template.status === 'ACTIVE' ? (
                        <Badge variant="success">Active</Badge>
                      ) : template.status === 'DRAFT' ? (
                        <Badge variant="neutral">Draft</Badge>
                      ) : (
                        <Badge variant="neutral">Inactive</Badge>
                      )}
                    </TD>
                    <TD className="px-3 text-right">
                      <div
                        className="relative inline-flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {template.status === 'DRAFT' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handleActivate(template)}
                          >
                            {isBusy ? '...' : 'Activate'}
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId(openMenuId === template.id ? null : template.id)
                          }
                          aria-label="Template actions"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openMenuId === template.id && (
                          <div className="absolute right-0 top-9 z-40 w-44 rounded-md border border-border bg-card shadow-md py-1 text-left">
                            <button
                              type="button"
                              onClick={() => openDetails(template)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              View details
                            </button>
                            {template.status === 'DRAFT' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    setTemplateToEdit(template)
                                    setIsCreateOpen(true)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                  Edit draft
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleActivate(template)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  Activate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(template)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete draft
                                </button>
                              </>
                            )}
                            {template.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => void handleDeactivate(template)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Power className="h-3.5 w-3.5" />
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
            count={templates.length}
            itemLabel="templates"
            onPageChange={(nextPage) => load(nextPage)}
          />
        )}
      </div>

      <CreateInspectionTemplateModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setTemplateToEdit(null)
        }}
        onSuccess={() => load(currentPage)}
        templateToEdit={templateToEdit}
      />

      <InspectionTemplateDetailsModal
        isOpen={isDetailsOpen}
        template={selected}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelected(null)
        }}
        onEdit={(t) => {
          setTemplateToEdit(t)
          setIsCreateOpen(true)
        }}
        onChanged={() => load(currentPage)}
      />
    </div>
  )
}
