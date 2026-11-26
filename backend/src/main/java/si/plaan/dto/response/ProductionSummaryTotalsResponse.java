package si.plaan.dto.response;

public record ProductionSummaryTotalsResponse(
    long productionOrders,
    long released,
    long inProgress,
    long completedOrClosed
) {}
