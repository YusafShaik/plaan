package si.plaan.dto.response;

import si.plaan.entity.IncomingInspectionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record IncomingInspectionResponse(
    Long id,
    String inspectionNumber,
    Long goodsReceiptId,
    String grnNumber,
    Long goodsReceiptItemId,
    Long supplierId,
    String supplierCode,
    String supplierName,
    Long itemId,
    String itemCode,
    String itemName,
    Long warehouseId,
    String warehouseCode,
    String warehouseName,
    BigDecimal receivedQuantity,
    String unitOfMeasure,
    Long templateId,
    String templateCode,
    String templateName,
    LocalDate inspectionDate,
    BigDecimal acceptedQuantity,
    BigDecimal rejectedQuantity,
    String remarks,
    Long inspectedById,
    String inspectedByName,
    IncomingInspectionStatus status,
    List<IncomingInspectionParameterResponse> parameters,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
