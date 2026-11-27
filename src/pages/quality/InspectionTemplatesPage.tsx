import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit,
  Eye,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, RefLink } from '../../components/ui/Table'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Alert } from '../../components/ui/Alert'
import { CreateInspectionTemplateModal } from './CreateInspectionTemplateModal'
import { InspectionTemplateDetailsModal } from './InspectionTemplateDetailsModal'
import { qualityService } from '../../services/qualityService'
import type {
  InspectionTemplate,
  InspectionTemplateStatus,
  InspectionType,
} from '../../types/quality'
import type { PageResponse } from '../../types/masterData'

const TYPE_LABEL: Record<InspectionType, string> = {
  INCOMING: 'Incoming',
  FINISHED_GOODS: 'Finished Goods',
}

export function InspectionTemplatesPage() {
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])
  const [pageData, setPageData] = useState<PageResponse<InspectionTemplate> | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InspectionTemplateStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<InspectionType | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [templateToEdit, setTemplateToEdit] = useState<InspectionTemplate | null>(null)
  const [selected, setSelected] = useState<InspectionTemplate | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const load = useCallback(
    (page = 0) => {
      setIsLoading(true)
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
    const timer = setTimeout(() => load(0), 250)
    return () => clearTimeout(timer)
  }, [load])

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this draft template?')) return
    try {
      await qualityService.deleteDraftTemplate(id)
      load(currentPage)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  const openDetails = (template: InspectionTemplate) => {
    setSelected(template)
    setIsDetailsOpen(true)
  }

  const hasFilters = Boolean(search || statusFilter || typeFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border/80 bg-secondary pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>
          <NativeSelect
            dense
            className="w-auto min-w-[9rem]"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as InspectionType | '')}
          >
            <option value="">All Types</option>
            <option value="INCOMING">Incoming</option>
            <option value="FINISHED_GOODS">Finished Goods</option>
          </NativeSelect>
          <NativeSelect
            dense
            className="w-auto min-w-[8.5rem]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InspectionTemplateStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </NativeSelect>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setTypeFilter('')
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
            setTemplateToEdit(null)
            setIsCreateOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <Table className="border-0 rounded-none shadow-none bg-transparent">
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Item</TH>
              <TH>Inspection Type</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && templates.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-16 text-center text-muted-foreground">
                  Loading templates...
                </TD>
              </TR>
            ) : templates.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No templates found.</p>
                    <p className="text-xs text-muted-foreground">
                      Define quality checks for an item before running inspections.
                    </p>
                  </div>
                </TD>
              </TR>
            ) : (
              templates.map((template) => (
                <TR
                  key={template.id}
                  className="cursor-pointer"
                  onClick={() => openDetails(template)}
                >
                  <TD>
                    <RefLink>{template.templateCode}</RefLink>
                  </TD>
                  <TD>
                    <div className="text-sm font-medium text-foreground">{template.itemName}</div>
                    <div className="text-xs text-muted-foreground">{template.templateName}</div>
                  </TD>
                  <TD>
                    {TYPE_LABEL[template.inspectionType]}
                  </TD>
                  <TD>
                    {template.status === 'ACTIVE' ? (
                      <Badge variant="success">Active</Badge>
                    ) : template.status === 'DRAFT' ? (
                      <Badge variant="warning">Draft</Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <div
                      className="inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="View"
                        onClick={() => openDetails(template)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {template.status === 'DRAFT' && (
                        <>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => {
                              setTemplateToEdit(template)
                              setIsCreateOpen(true)
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => handleDelete(template.id)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        {pageData && pageData.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/80">
            <p className="text-xs text-muted-foreground">
              Page {pageData.page + 1} of {pageData.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 0}
                onClick={() => load(currentPage - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= pageData.totalPages - 1}
                onClick={() => load(currentPage + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
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
