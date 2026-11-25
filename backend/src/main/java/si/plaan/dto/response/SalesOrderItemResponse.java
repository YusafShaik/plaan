package si.plaan.dto.response;

import java.math.BigDecimal;

public record SalesOrderItemResponse(
    Long id,
    Long itemId,
    String itemCode,
    String itemName,
    String unitOfMeasure,
    BigDecimal orderedQuantity,
    BigDecimal unitPrice,
    BigDecimal lineAmount,
    BigDecimal dispatchedQuantity,
    BigDecimal pendingQuantity
) {
    public SalesOrderItemResponse(
            Long id,
            Long itemId,
            String itemCode,
            String itemName,
            String unitOfMeasure,
            BigDecimal orderedQuantity,
            BigDecimal unitPrice,
            BigDecimal lineAmount
    ) {
        this(id, itemId, itemCode, itemName, unitOfMeasure, orderedQuantity, unitPrice, lineAmount,
                BigDecimal.ZERO, orderedQuantity != null ? orderedQuantity : BigDecimal.ZERO);
    }
}
