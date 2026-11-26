package si.plaan.dto.response;

import java.util.List;

public record CustomerOutstandingReportResponse(
    String currency,
    CustomerOutstandingTotalsResponse summary,
    List<CustomerOutstandingBreakdownResponse> byCustomer,
    PageResponse<CustomerOutstandingRowResponse> invoices
) {}
