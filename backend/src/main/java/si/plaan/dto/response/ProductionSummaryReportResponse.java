package si.plaan.dto.response;

import java.util.List;

public record ProductionSummaryReportResponse(
    ProductionSummaryTotalsResponse summary,
    List<ProductionSummaryProductProgressResponse> byProduct,
    PageResponse<ProductionSummaryRowResponse> orders
) {}
