package si.plaan.dto.response;

import java.math.BigDecimal;

public record DispatchOrderItemResponse(
    Long id,
    Long salesOrderItemId,
    Long itemId,
    String itemCode,
    String itemName,
    String unitOfMeasure,
    BigDecimal orderedQuantity,
    BigDecimal previouslyDispatchedQuantity,
    BigDecimal dispatchQuantity,
    BigDecimal remainingQuantity
) {}
