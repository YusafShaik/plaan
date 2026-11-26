package si.plaan.dto.response;

public record DueOverdueMaintenanceReportResponse(
    String currency,
    DueOverdueMaintenanceTotalsResponse summary,
    PageResponse<DueOverdueMaintenanceRowResponse> plans
) {}
