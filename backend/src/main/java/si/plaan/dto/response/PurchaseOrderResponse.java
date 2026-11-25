package si.plaan.dto.response;

import si.plaan.entity.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseOrderResponse(
    Long id,
    String poNumber,
    Long supplierId,
    String supplierCode,
    String supplierName,
    Long receivingWarehouseId,
    String warehouseCode,
    String warehouseName,
    LocalDate orderDate,
    LocalDate expectedDeliveryDate,
    String notes,
    PurchaseOrderStatus status,
    BigDecimal totalAmount,
    String currency,
    int itemsCount,
    List<PurchaseOrderItemResponse> items,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
