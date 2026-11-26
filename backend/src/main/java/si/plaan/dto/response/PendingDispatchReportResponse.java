package si.plaan.dto.response;

public record PendingDispatchReportResponse(
    String currency,
    PendingDispatchTotalsResponse summary,
    PageResponse<PendingDispatchRowResponse> lines
) {}
