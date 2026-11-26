package si.plaan.dto.response;

public record MaintenanceHistoryTotalsResponse(
    long completedWorkOrders,
    long preventiveMaintenance,
    long breakdownWorkOrders,
    long totalDurationMinutes
) {}
