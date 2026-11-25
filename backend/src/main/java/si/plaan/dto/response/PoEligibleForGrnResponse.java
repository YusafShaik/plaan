package si.plaan.dto.response;

import si.plaan.entity.PurchaseOrderStatus;

import java.time.LocalDate;
import java.util.List;

public record PoEligibleForGrnResponse(
    Long id,
    String poNumber,
    PurchaseOrderStatus status,
    Long supplierId,
    String supplierCode,
    String supplierName,
    Long warehouseId,
    String warehouseCode,
    String warehouseName,
    LocalDate orderDate,
    LocalDate expectedDeliveryDate,
    List<PoLineItemForGrnResponse> items
) {}
