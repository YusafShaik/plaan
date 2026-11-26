package si.plaan.dto.response;

public record StockSummaryReportResponse(
    StockSummaryTotalsResponse summary,
    PageResponse<StockOverviewItemResponse> rows
) {}
