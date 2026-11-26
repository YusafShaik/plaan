package si.plaan.dto.response;

public record MaintenanceHistoryEquipmentBreakdownResponse(
    Long equipmentId,
    String equipmentCode,
    String equipmentName,
    long totalWorkOrders,
    long preventiveCount,
    long breakdownCount
) {}
