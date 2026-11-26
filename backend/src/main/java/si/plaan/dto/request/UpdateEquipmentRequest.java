package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.EquipmentOperationalStatus;
import si.plaan.entity.EquipmentRecordStatus;

import java.time.LocalDate;

public record UpdateEquipmentRequest(
    @NotBlank(message = "Equipment name is required")
    String equipmentName,
    String manufacturer,
    String modelNumber,
    String serialNumber,
    String location,
    LocalDate installationDate,
    String description,
    @NotNull(message = "Operational status is required")
    EquipmentOperationalStatus operationalStatus,
    @NotNull(message = "Record status is required")
    EquipmentRecordStatus recordStatus
) {}
