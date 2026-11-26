package si.plaan.dto.response;

import java.time.LocalDate;
import java.util.List;

public record DashboardOverviewResponse(
        String currency,
        String periodLabel,
        LocalDate periodFrom,
        LocalDate periodTo,
        DashboardMetricsResponse metrics,
        List<DashboardTrendMonthResponse> trend,
        DashboardProductionOrdersResponse productionOrders,
        DashboardEquipmentStatusResponse equipmentStatus,
        DashboardAttentionResponse attention
) {}
