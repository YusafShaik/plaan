package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;
import si.plaan.entity.EquipmentOperationalStatus;
import si.plaan.entity.EquipmentRecordStatus;

import java.time.LocalDate;

public record CreateEquipmentRequest(
    String equipmentCode,
    @NotBlank(message = "Equipment name is required")
    String equipmentName,
    String manufacturer,
    String modelNumber,
    String serialNumber,
    String location,
    LocalDate installationDate,
    String description,
    EquipmentOperationalStatus operationalStatus,
    EquipmentRecordStatus recordStatus
) {}
