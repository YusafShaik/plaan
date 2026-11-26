package si.plaan.dto.response;

public record DueOverdueMaintenanceTotalsResponse(
    long maintenancePlans,
    long overdue,
    long dueToday,
    long upcoming
) {}
