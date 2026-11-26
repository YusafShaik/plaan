package si.plaan.dto.response;

import si.plaan.entity.MaintenanceScheduleStatus;
import si.plaan.entity.MaintenanceWorkOrderStatus;

import java.time.LocalDate;

public record DueOverdueMaintenanceRowResponse(
    Long maintenancePlanId,
    String planNumber,
    Long equipmentId,
    String equipmentCode,
    String equipmentName,
    String planName,
    Integer frequencyDays,
    LocalDate lastCompletedDate,
    LocalDate nextDueDate,
    MaintenanceScheduleStatus dueStatus,
    Integer daysOverdue,
    Long workOrderId,
    String workOrderNumber,
    MaintenanceWorkOrderStatus workOrderStatus
) {}
