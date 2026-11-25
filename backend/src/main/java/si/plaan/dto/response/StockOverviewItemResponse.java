package si.plaan.dto.response;

import java.math.BigDecimal;

public record StockOverviewItemResponse(
        Long itemId,
        String itemCode,
        String itemName,
        Long warehouseId,
        String warehouseCode,
        String warehouseName,
        BigDecimal onHandQuantity,
        String unitOfMeasure
) {}
