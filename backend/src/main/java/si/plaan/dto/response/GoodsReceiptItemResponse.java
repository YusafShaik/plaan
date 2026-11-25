package si.plaan.dto.response;

import java.math.BigDecimal;

public record GoodsReceiptItemResponse(
    Long id,
    Long purchaseOrderItemId,
    Long itemId,
    String itemCode,
    String itemName,
    String unitOfMeasure,
    BigDecimal orderedQuantity,
    BigDecimal previouslyReceivedQuantity,
    BigDecimal receivedQuantity,
    BigDecimal remainingQuantity
) {}
