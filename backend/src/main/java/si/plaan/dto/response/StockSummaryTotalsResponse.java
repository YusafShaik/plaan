package si.plaan.dto.response;

public record StockSummaryTotalsResponse(
    long itemsInStock,
    long itemsWithNoAvailableStock,
    long itemsPendingQc,
    long itemsWithRejections
) {}
