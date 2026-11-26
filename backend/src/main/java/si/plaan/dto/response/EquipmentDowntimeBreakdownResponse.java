package si.plaan.dto.response;

public record EquipmentDowntimeBreakdownResponse(
    Long equipmentId,
    String equipmentCode,
    String equipmentName,
    long downtimeMinutes,
    long eventCount
) {}
