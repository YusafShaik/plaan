import { apiClient } from '../lib/api'
import type { OrganizationItem, CreateOrganizationPayload } from '../types/platform'

export const platformService = {
  getOrganizations: async (): Promise<OrganizationItem[]> => {
    return apiClient<OrganizationItem[]>('/platform/organizations')
  },

  createOrganization: async (
    payload: CreateOrganizationPayload
  ): Promise<OrganizationItem> => {
    return apiClient<OrganizationItem>('/platform/organizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateStatus: async (
    id: number,
    active: boolean
  ): Promise<OrganizationItem> => {
    return apiClient<OrganizationItem>(`/platform/organizations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    })
  },
}
