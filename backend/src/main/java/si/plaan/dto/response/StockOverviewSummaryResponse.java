package si.plaan.dto.response;

public record StockOverviewSummaryResponse(
        long itemsInStock,
        long warehousesWithStock,
        long totalStockRecords
) {}
