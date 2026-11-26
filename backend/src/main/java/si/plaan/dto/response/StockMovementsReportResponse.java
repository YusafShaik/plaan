package si.plaan.dto.response;

public record StockMovementsReportResponse(
    StockMovementsSummaryResponse summary,
    PageResponse<StockMovementsRowResponse> movements
) {}
