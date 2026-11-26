package si.plaan.service;

import si.plaan.dto.response.DashboardOverviewResponse;

public interface DashboardService {

    DashboardOverviewResponse getOverview(Long orgId);
}
