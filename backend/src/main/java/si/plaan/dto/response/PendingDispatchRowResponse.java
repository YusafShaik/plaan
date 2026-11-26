package si.plaan.dto.response;

import si.plaan.entity.DeliveryScheduleStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PendingDispatchRowResponse(
    Long salesOrderId,
    Long salesOrderItemId,
    String orderNumber,
    LocalDate orderDate,
    Long customerId,
    String customerName,
    Long itemId,
    String itemCode,
    String itemName,
    Long warehouseId,
    String warehouseName,
    BigDecimal orderedQuantity,
    BigDecimal dispatchedQuantity,
    BigDecimal pendingQuantity,
    BigDecimal availableStock,
    BigDecimal shortageQuantity,
    BigDecimal canDispatchNow,
    String unitOfMeasure,
    BigDecimal unitPrice,
    BigDecimal pendingValue,
    LocalDate expectedDeliveryDate,
    DeliveryScheduleStatus deliveryStatus,
    Integer daysOverdue,
    boolean readyForDispatch
) {}
