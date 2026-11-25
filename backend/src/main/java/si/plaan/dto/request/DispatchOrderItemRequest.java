package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record DispatchOrderItemRequest(
    @NotNull(message = "Sales order item ID is required")
    Long salesOrderItemId,

    @NotNull(message = "Item ID is required")
    Long itemId,

    @NotNull(message = "Dispatch quantity is required")
    @DecimalMin(value = "0.0", message = "Dispatch quantity must be non-negative")
    BigDecimal dispatchQuantity
) {}
