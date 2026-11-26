package si.plaan.dto.response;

import si.plaan.entity.MaintenancePlanStatus;
import si.plaan.entity.MaintenanceScheduleStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record MaintenancePlanResponse(
    Long id,
    String planNumber,
    String planName,
    Long equipmentId,
    String equipmentCode,
    String equipmentName,
    Integer frequencyDays,
    LocalDate firstDueDate,
    LocalDate nextDueDate,
    LocalDate lastCompletedDate,
    String instructions,
    String notes,
    MaintenancePlanStatus status,
    MaintenanceScheduleStatus scheduleStatus,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
