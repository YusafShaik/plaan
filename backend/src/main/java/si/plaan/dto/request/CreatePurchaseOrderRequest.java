package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.PurchaseOrderStatus;

import java.time.LocalDate;
import java.util.List;

public record CreatePurchaseOrderRequest(
    String poNumber,

    @NotNull(message = "Supplier is required")
    Long supplierId,

    @NotNull(message = "Receiving warehouse is required")
    Long receivingWarehouseId,

    @NotNull(message = "Order date is required")
    LocalDate orderDate,

    LocalDate expectedDeliveryDate,

    String notes,

    PurchaseOrderStatus status,

    @NotEmpty(message = "At least one item is required in the purchase order")
    @Valid
    List<PurchaseOrderItemRequest> items
) {}
