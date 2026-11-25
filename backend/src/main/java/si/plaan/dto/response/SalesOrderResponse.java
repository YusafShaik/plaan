package si.plaan.dto.response;

import si.plaan.entity.SalesOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record SalesOrderResponse(
    Long id,
    String orderNumber,
    Long customerId,
    String customerCode,
    String customerName,
    Long dispatchWarehouseId,
    String warehouseCode,
    String warehouseName,
    LocalDate orderDate,
    LocalDate expectedDeliveryDate,
    String customerPoReference,
    String billingAddress,
    String shippingAddress,
    String notes,
    SalesOrderStatus status,
    BigDecimal totalAmount,
    String currency,
    int itemsCount,
    List<SalesOrderItemResponse> items,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
