package si.plaan.dto.response;

import si.plaan.entity.EquipmentOperationalStatus;
import si.plaan.entity.EquipmentRecordStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EquipmentResponse(
    Long id,
    String equipmentCode,
    String equipmentName,
    String manufacturer,
    String modelNumber,
    String serialNumber,
    String location,
    LocalDate installationDate,
    String description,
    EquipmentOperationalStatus operationalStatus,
    EquipmentRecordStatus recordStatus,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
