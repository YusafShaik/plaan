export interface OrganizationItem {
  id: number
  name: string
  slug: string
  country: string | null
  baseCurrency: string | null
  timeZone: string | null
  active: boolean
  adminName: string
  adminEmail: string
  createdAt: string
}

export interface CreateOrganizationPayload {
  organizationName: string
  country: string
  baseCurrency: string
  timeZone: string
  adminFullName: string
  adminEmail: string
}
