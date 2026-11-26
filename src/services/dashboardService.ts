import { apiClient } from '../lib/api'
import type { DashboardOverview } from '../types/dashboard'

export const dashboardService = {
  getOverview: () =>
    apiClient<DashboardOverview>('/dashboard/overview'),
}
