package si.plaan.dto.response;

import si.plaan.entity.FinishedGoodsInspectionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record FinishedGoodsInspectionResponse(
    Long id,
    String inspectionNumber,
    Long productionOrderId,
    String productionOrderNumber,
    Long productionReceiptId,
    String productionReceiptNumber,
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
    FinishedGoodsInspectionStatus status,
    List<FinishedGoodsInspectionParameterResponse> parameters,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
