package si.plaan.dto.response;

import si.plaan.entity.InspectionType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InspectionSummaryRowResponse(
    Long id,
    InspectionType inspectionType,
    String inspectionNumber,
    LocalDate inspectionDate,
    Long itemId,
    String itemCode,
    String itemName,
    Long warehouseId,
    String warehouseCode,
    String warehouseName,
    String sourceReference,
    BigDecimal inspectionQuantity,
    BigDecimal acceptedQuantity,
    BigDecimal rejectedQuantity,
    String unitOfMeasure,
    BigDecimal acceptanceRate,
    BigDecimal rejectionRate,
    String inspectedByName,
    String status
) {}
