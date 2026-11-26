package si.plaan.dto.response;

import java.time.LocalDate;
import java.util.List;

public record EquipmentDowntimeReportResponse(
    String currency,
    LocalDate fromDate,
    LocalDate toDate,
    EquipmentDowntimeTotalsResponse summary,
    List<EquipmentDowntimeBreakdownResponse> byEquipment,
    PageResponse<EquipmentDowntimeRowResponse> events
) {}
