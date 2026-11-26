package si.plaan.dto.response;

public record MaterialConsumptionReportResponse(
    MaterialConsumptionTotalsResponse summary,
    PageResponse<MaterialConsumptionGroupResponse> orders
) {}
