package si.plaan.dto.response;

import java.math.BigDecimal;

public record PoLineItemForGrnResponse(
    Long purchaseOrderItemId,
    Long itemId,
    String itemCode,
    String itemName,
    String unitOfMeasure,
    BigDecimal orderedQuantity,
    BigDecimal previouslyReceivedQuantity,
    BigDecimal remainingQuantity
) {}
