package si.plaan.dto.response;

import si.plaan.entity.GoodsReceiptStatus;
import si.plaan.entity.PurchaseOrderStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record GoodsReceiptResponse(
    Long id,
    String grnNumber,
    Long purchaseOrderId,
    String poNumber,
    PurchaseOrderStatus poStatus,
    Long supplierId,
    String supplierCode,
    String supplierName,
    Long warehouseId,
    String warehouseCode,
    String warehouseName,
    LocalDate receiptDate,
    String deliveryNoteNumber,
    String notes,
    GoodsReceiptStatus status,
    int itemsCount,
    List<GoodsReceiptItemResponse> items,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
