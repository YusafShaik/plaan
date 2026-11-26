package si.plaan.dto.response;

import si.plaan.entity.MaintenanceWorkOrderType;

import java.time.LocalDate;

public record EquipmentMaintenanceHistoryItemResponse(
    Long workOrderId,
    String workOrderNumber,
    LocalDate date,
    String activity,
    MaintenanceWorkOrderType type,
    Integer durationMinutes
) {}
