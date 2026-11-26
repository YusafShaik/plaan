package si.plaan.dto.response;

import si.plaan.entity.DeliveryScheduleStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PendingPurchaseOrderRowResponse(
    Long purchaseOrderId,
    Long purchaseOrderItemId,
    String poNumber,
    LocalDate orderDate,
    Long supplierId,
    String supplierName,
    Long itemId,
    String itemCode,
    String itemName,
    Long warehouseId,
    String warehouseName,
    BigDecimal orderedQuantity,
    BigDecimal receivedQuantity,
    BigDecimal pendingQuantity,
    String unitOfMeasure,
    BigDecimal unitPrice,
    BigDecimal pendingValue,
    LocalDate expectedDeliveryDate,
    DeliveryScheduleStatus deliveryStatus,
    Integer daysOverdue
) {}
