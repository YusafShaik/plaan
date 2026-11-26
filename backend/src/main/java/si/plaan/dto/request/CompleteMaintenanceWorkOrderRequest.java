package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record CompleteMaintenanceWorkOrderRequest(
    @NotBlank(message = "Work performed is required")
    String workPerformed,
    @NotNull(message = "Completion date is required")
    LocalDate completionDate,
    @NotNull(message = "Completion time is required")
    LocalTime completionTime,
    @NotNull(message = "Machine operational confirmation is required")
    Boolean machineOperational,
    String remarks
) {}
