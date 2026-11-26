package si.plaan.dto.response;

import java.math.BigDecimal;

public record EligibleDispatchItemResponse(
    Long dispatchOrderItemId,
    Long salesOrderItemId,
    Long itemId,
    String itemCode,
    String itemName,
    String unitOfMeasure,
    BigDecimal quantity,
    BigDecimal unitPrice,
    BigDecimal lineAmount
) {}
