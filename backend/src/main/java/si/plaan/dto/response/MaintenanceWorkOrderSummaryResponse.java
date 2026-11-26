package si.plaan.dto.response;

public record MaintenanceWorkOrderSummaryResponse(
    long openCount,
    long inProgressCount,
    long completedCount,
    long cancelledCount
) {}
