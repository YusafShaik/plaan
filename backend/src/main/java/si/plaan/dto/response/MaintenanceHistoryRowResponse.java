package si.plaan.dto.response;

import si.plaan.entity.MaintenanceWorkOrderPriority;
import si.plaan.entity.MaintenanceWorkOrderType;

import java.time.LocalDateTime;

public record MaintenanceHistoryRowResponse(
    Long workOrderId,
    String workOrderNumber,
    Long equipmentId,
    String equipmentCode,
    String equipmentName,
    MaintenanceWorkOrderType maintenanceType,
    Long maintenancePlanId,
    String maintenancePlanName,
    MaintenanceWorkOrderPriority priority,
    String technician,
    LocalDateTime actualStartAt,
    LocalDateTime actualEndAt,
    Integer durationMinutes,
    String workPerformed,
    Boolean machineOperational,
    String completionRemarks
) {}
