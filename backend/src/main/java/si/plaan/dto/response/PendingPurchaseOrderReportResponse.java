package si.plaan.dto.response;

public record PendingPurchaseOrderReportResponse(
    String currency,
    PendingPurchaseOrderTotalsResponse summary,
    PageResponse<PendingPurchaseOrderRowResponse> lines
) {}
