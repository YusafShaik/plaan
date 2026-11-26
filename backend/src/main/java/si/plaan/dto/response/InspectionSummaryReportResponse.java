package si.plaan.dto.response;

import java.util.List;

public record InspectionSummaryReportResponse(
    InspectionSummaryTotalsResponse summary,
    List<InspectionSummaryItemPerformanceResponse> byItem,
    PageResponse<InspectionSummaryRowResponse> inspections
) {}
