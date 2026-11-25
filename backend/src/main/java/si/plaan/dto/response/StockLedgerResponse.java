package si.plaan.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record StockLedgerResponse(
        Long itemId,
        String itemCode,
        String itemName,
        Long warehouseId,
        String warehouseName,
        String unitOfMeasure,
        BigDecimal totalIn,
        BigDecimal totalOut,
        BigDecimal closingBalance,
        long totalMovements,
        List<StockLedgerEntryResponse> movements
) {}
