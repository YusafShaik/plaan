package si.plaan.dto.response;

public record DashboardProductionOrdersResponse(
        long released,
        long inProgress,
        long completed,
        long closed
) {}
