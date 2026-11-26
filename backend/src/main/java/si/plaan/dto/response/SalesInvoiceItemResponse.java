package si.plaan.dto.response;

import java.math.BigDecimal;

public record SalesInvoiceItemResponse(
    Long id,
    Long dispatchOrderItemId,
    Long itemId,
    String itemCode,
    String itemName,
    String unitOfMeasure,
    BigDecimal quantity,
    BigDecimal unitPrice,
    BigDecimal lineAmount
) {}
