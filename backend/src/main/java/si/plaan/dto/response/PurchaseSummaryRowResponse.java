package si.plaan.dto.response;

import si.plaan.entity.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PurchaseSummaryRowResponse(
    Long id,
    String poNumber,
    LocalDate orderDate,
    Long supplierId,
    String supplierName,
    Long warehouseId,
    String warehouseName,
    LocalDate expectedDeliveryDate,
    BigDecimal orderValue,
    PurchaseOrderStatus status
) {}
