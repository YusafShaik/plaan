package si.plaan.dto.response;

import java.math.BigDecimal;

public record StockOverviewItemResponse(
        Long itemId,
        String itemCode,
        String itemName,
        Long itemTypeId,
        String itemTypeName,
        Long warehouseId,
        String warehouseCode,
        String warehouseName,
        BigDecimal onHandQuantity,
        BigDecimal pendingInspectionQuantity,
        BigDecimal rejectedQuantity,
        BigDecimal availableQuantity,
        String unitOfMeasure
) {
    /** Constructor used by JPQL stock aggregation (on-hand only). Holds filled later. */
    public StockOverviewItemResponse(
            Long itemId,
            String itemCode,
            String itemName,
            Long itemTypeId,
            String itemTypeName,
            Long warehouseId,
            String warehouseCode,
            String warehouseName,
            BigDecimal onHandQuantity,
            String unitOfMeasure) {
        this(
                itemId,
                itemCode,
                itemName,
                itemTypeId,
                itemTypeName,
                warehouseId,
                warehouseCode,
                warehouseName,
                onHandQuantity,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                onHandQuantity != null ? onHandQuantity : BigDecimal.ZERO,
                unitOfMeasure);
    }
}
