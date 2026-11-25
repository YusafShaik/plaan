package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PurchaseOrderItemRequest(
    @NotNull(message = "Item is required")
    Long itemId,

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.001", message = "Quantity must be greater than 0")
    BigDecimal quantity,

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.00", message = "Unit price must be positive")
    BigDecimal unitPrice
) {}
