package si.plaan.dto.response;

import java.math.BigDecimal;

public record EligibleGrnItemResponse(
    Long goodsReceiptItemId,
    Long purchaseOrderItemId,
    Long itemId,
    String itemCode,
    String itemName,
    String unitOfMeasure,
    BigDecimal quantity,
    BigDecimal defaultUnitPrice,
    BigDecimal lineAmount
) {}
