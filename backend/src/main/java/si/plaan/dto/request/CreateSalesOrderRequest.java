package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.SalesOrderStatus;

import java.time.LocalDate;
import java.util.List;

public record CreateSalesOrderRequest(
    String orderNumber,

    @NotNull(message = "Customer is required")
    Long customerId,

    @NotNull(message = "Dispatch warehouse is required")
    Long dispatchWarehouseId,

    @NotNull(message = "Order date is required")
    LocalDate orderDate,

    LocalDate expectedDeliveryDate,

    String customerPoReference,

    String billingAddress,

    String shippingAddress,

    String notes,

    SalesOrderStatus status,

    @NotEmpty(message = "At least one item is required in the sales order")
    @Valid
    List<SalesOrderItemRequest> items
) {}
