import { useEffect, useState, useMemo, useCallback } from 'react'
import { Plus, Power, Building2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { SearchInput } from '../../components/ui/Input'
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table'
import { KpiCard, KpiCardGrid } from '../../components/ui/KpiCard'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { CreateOrganizationModal } from './CreateOrganizationModal'
import { platformService } from '../../services/platformService'
import { toast } from '../../lib/feedback'
import type { OrganizationItem, CreateOrganizationPayload } from '../../types/platform'

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setIsLoading(true)
    setError(null)
    platformService
      .getOrganizations()
      .then((data) => {
        setOrganizations(data)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load organizations.')
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    let isMounted = true
    platformService
      .getOrganizations()
      .then((data) => {
        if (isMounted) {
          setOrganizations(data)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load organizations.')
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleCreate = async (payload: CreateOrganizationPayload) => {
    const created = await platformService.createOrganization(payload)
    setOrganizations((prev) => [created, ...prev])
  }

  const handleToggleStatus = async (org: OrganizationItem) => {
    setTogglingId(org.id)
    try {
      const updated = await platformService.updateStatus(org.id, !org.active)
      setOrganizations((prev) =>
        prev.map((item) => (item.id === org.id ? updated : item))
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update organization status.')
    } finally {
      setTogglingId(null)
    }
  }

  const filteredOrgs = useMemo(() => {
    if (!searchQuery.trim()) return organizations
    const query = searchQuery.toLowerCase()
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(query) ||
        org.slug.toLowerCase().includes(query) ||
        org.adminEmail.toLowerCase().includes(query) ||
        (org.country && org.country.toLowerCase().includes(query))
    )
  }, [organizations, searchQuery])

  const stats = useMemo(() => {
    const total = organizations.length
    const active = organizations.filter((o) => o.active).length
    const suspended = total - active
    return { total, active, suspended }
  }, [organizations])

  return (
    <ContentCanvas className="space-y-8 pt-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Organizations
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Tenant workspaces and access.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Organization
        </Button>
      </div>

      <KpiCardGrid columns={3}>
        <KpiCard label="Total workspaces" value={stats.total} />
        <KpiCard label="Active" value={stats.active} />
        <KpiCard label="Suspended" value={stats.suspended} />
      </KpiCardGrid>

      {/* 3. Search Bar */}
      <div className="flex items-center gap-3">
        <SearchInput
          placeholder="Search organizations or admin..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="max-w-sm"
        />
      </div>

      {/* 4. Organizations Table */}
      <div className="rounded-md border border-border bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading workspaces...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive flex flex-col items-center gap-2">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadData}>
              Retry
            </Button>
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
            <h3 className="mt-3 text-sm font-semibold text-card-foreground">
              No organizations found
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery ? 'Try adjusting your search query.' : 'Get started by creating your first customer organization.'}
            </p>
          </div>
        ) : (
          <Table className="border-0 rounded-none shadow-none bg-transparent">
              <THead>
                <tr>
                  <TH className="px-6">Organization</TH>
                  <TH className="px-6">Location & Currency</TH>
                  <TH className="px-6">Admin Contact</TH>
                  <TH className="px-6">Status</TH>
                  <TH className="px-6 text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {filteredOrgs.map((org) => (
                  <TR key={org.id}>
                    <TD className="px-6 py-4">
                      <div className="font-medium text-card-foreground">
                        {org.name}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                        slug: {org.slug}
                      </div>
                    </TD>

                    <TD className="px-6 py-4 text-xs">
                      <div className="text-card-foreground font-medium">
                        {org.country || 'Global'}
                      </div>
                      <div className="text-foreground mt-0.5">
                        {org.baseCurrency || 'USD'} · {org.timeZone || 'UTC'}
                      </div>
                    </TD>

                    <TD className="px-6 py-4 text-xs">
                      <div className="font-medium text-card-foreground">
                        {org.adminName}
                      </div>
                      <div className="text-foreground mt-0.5">
                        {org.adminEmail}
                      </div>
                    </TD>

                    <TD className="px-6 py-4">
                      {org.active ? (
                        <Badge variant="brand">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Suspended</Badge>
                      )}
                    </TD>

                    <TD className="px-6 py-4 text-right">
                      <Button
                        variant={org.active ? 'outline' : 'secondary'}
                        size="sm"
                        disabled={togglingId === org.id}
                        onClick={() => handleToggleStatus(org)}
                        className={`text-xs gap-1.5 ${
                          org.active ? 'hover:text-destructive' : 'text-brand-deep hover:opacity-90'
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        <span>{org.active ? 'Suspend' : 'Activate'}</span>
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
        )}
      </div>

      {/* 5. Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
      />
    </ContentCanvas>
  )
}
