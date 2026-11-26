package si.plaan.dto.response;

import java.time.LocalDate;
import java.util.List;

public record MaintenanceHistoryReportResponse(
    String currency,
    LocalDate fromDate,
    LocalDate toDate,
    MaintenanceHistoryTotalsResponse summary,
    List<MaintenanceHistoryEquipmentBreakdownResponse> byEquipment,
    List<String> technicians,
    PageResponse<MaintenanceHistoryRowResponse> workOrders
) {}
