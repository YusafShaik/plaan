package si.plaan.dto.response;

public record WarehouseSummaryResponse(
    long totalWarehouses,
    long activeWarehouses,
    long inactiveWarehouses
) {}
