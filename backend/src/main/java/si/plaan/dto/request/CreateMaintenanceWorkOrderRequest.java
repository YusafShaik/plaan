package si.plaan.dto.request;

import jakarta.validation.constraints.NotNull;
import si.plaan.entity.MaintenanceWorkOrderPriority;
import si.plaan.entity.MaintenanceWorkOrderType;

import java.time.LocalDate;
import java.time.LocalTime;

public record CreateMaintenanceWorkOrderRequest(
    String workOrderNumber,
    LocalDate workOrderDate,
    @NotNull(message = "Maintenance type is required")
    MaintenanceWorkOrderType maintenanceType,
    @NotNull(message = "Equipment is required")
    Long equipmentId,
    Long maintenancePlanId,
    MaintenanceWorkOrderPriority priority,
    String assignedTo,
    String problemDescription,
    String notes,
    LocalDate breakdownDate,
    LocalTime breakdownTime
) {}
