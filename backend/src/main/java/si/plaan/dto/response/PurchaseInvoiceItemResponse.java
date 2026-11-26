package si.plaan.dto.response;

import java.math.BigDecimal;

public record PurchaseInvoiceItemResponse(
    Long id,
    Long goodsReceiptItemId,
    Long itemId,
    String itemCode,
    String itemName,
    String unitOfMeasure,
    BigDecimal quantity,
    BigDecimal unitPrice,
    BigDecimal lineAmount
) {}
