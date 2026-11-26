package si.plaan.dto.response;

public record EquipmentDowntimeTotalsResponse(
    long totalBreakdownEvents,
    long totalDowntimeMinutes,
    long restoredEvents,
    long ongoingBreakdowns
) {}
