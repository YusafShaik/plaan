package si.plaan.dto.response;

import java.util.List;

public record SupplierOutstandingReportResponse(
    String currency,
    SupplierOutstandingTotalsResponse summary,
    List<SupplierOutstandingBreakdownResponse> bySupplier,
    PageResponse<SupplierOutstandingRowResponse> invoices
) {}
