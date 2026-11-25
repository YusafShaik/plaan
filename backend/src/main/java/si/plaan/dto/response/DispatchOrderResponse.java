package si.plaan.dto.response;

import si.plaan.entity.DispatchOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record DispatchOrderResponse(
    Long id,
    String dispatchNumber,
    Long salesOrderId,
    String salesOrderNumber,
    Long customerId,
    String customerCode,
    String customerName,
    Long dispatchWarehouseId,
    String dispatchWarehouseCode,
    String dispatchWarehouseName,
    LocalDate dispatchDate,
    String shippingAddress,
    String transporterName,
    String vehicleNumber,
    String transportReference,
    String notes,
    DispatchOrderStatus status,
    LocalDateTime postedAt,
    int itemsCount,
    BigDecimal totalQuantityDispatched,
    List<DispatchOrderItemResponse> items,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
