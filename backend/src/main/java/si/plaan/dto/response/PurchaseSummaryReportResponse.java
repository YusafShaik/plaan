package si.plaan.dto.response;

import java.util.List;

public record PurchaseSummaryReportResponse(
    String currency,
    PurchaseSummaryTotalsResponse summary,
    List<PurchaseSummarySupplierBreakdownResponse> bySupplier,
    PageResponse<PurchaseSummaryRowResponse> orders
) {}
