package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record GoodsReceiptItemRequest(
    @NotNull(message = "Purchase order item ID is required")
    Long purchaseOrderItemId,
    @NotNull(message = "Item ID is required")
    Long itemId,
    @NotNull(message = "Received quantity is required")
    @DecimalMin(value = "0.0", message = "Received quantity must be non-negative")
    BigDecimal receivedQuantity
) {}
