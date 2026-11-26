package si.plaan.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.MaintenancePlanStatus;

import java.time.LocalDate;

public record UpdateMaintenancePlanRequest(
    @NotBlank(message = "Plan name is required")
    String planName,
    @NotNull(message = "Equipment is required")
    Long equipmentId,
    @NotNull(message = "Frequency is required")
    @Min(value = 1, message = "Frequency must be greater than zero")
    Integer frequencyDays,
    @NotNull(message = "First due date is required")
    LocalDate firstDueDate,
    @NotBlank(message = "Maintenance instructions are required")
    String instructions,
    String notes,
    @NotNull(message = "Status is required")
    MaintenancePlanStatus status
) {}
