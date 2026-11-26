package si.plaan.dto.response;

import si.plaan.entity.MaintenanceWorkOrderPriority;
import si.plaan.entity.MaintenanceWorkOrderStatus;
import si.plaan.entity.MaintenanceWorkOrderType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record MaintenanceWorkOrderResponse(
    Long id,
    String workOrderNumber,
    LocalDate workOrderDate,
    MaintenanceWorkOrderType maintenanceType,
    MaintenanceWorkOrderStatus status,
    MaintenanceWorkOrderPriority priority,
    Long equipmentId,
    String equipmentCode,
    String equipmentName,
    Long maintenancePlanId,
    String planNumber,
    String planName,
    String activityName,
    String assignedTo,
    String problemDescription,
    String instructions,
    String notes,
    LocalDate breakdownDate,
    LocalTime breakdownTime,
    Long rootBreakdownWorkOrderId,
    LocalDateTime actualStartAt,
    LocalDateTime actualEndAt,
    String workPerformed,
    String completionRemarks,
    Boolean machineOperational,
    Integer durationMinutes,
    Integer downtimeMinutes,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
