package si.plaan.dto.response;

import java.time.LocalDateTime;

public record EquipmentDowntimeRowResponse(
    Long rootWorkOrderId,
    String workOrderNumber,
    Long equipmentId,
    String equipmentCode,
    String equipmentName,
    LocalDateTime breakdownAt,
    LocalDateTime maintenanceStartAt,
    LocalDateTime restorationAt,
    Integer downtimeMinutes,
    Integer downtimeInPeriodMinutes,
    String breakdownDescription,
    String restorationStatus
) {}
