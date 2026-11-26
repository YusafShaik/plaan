package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PurchaseInvoiceItemRequest(
    @NotNull(message = "Goods receipt item ID is required")
    Long goodsReceiptItemId,
    @NotNull(message = "Item ID is required")
    Long itemId,
    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.00", message = "Unit price cannot be negative")
    BigDecimal unitPrice
) {}
