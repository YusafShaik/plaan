package si.plaan.dto.response;

import si.plaan.entity.InspectionType;

import java.math.BigDecimal;

public record InspectionSummaryItemPerformanceResponse(
    Long itemId,
    String itemCode,
    String itemName,
    InspectionType inspectionType,
    BigDecimal inspectedQuantity,
    BigDecimal acceptedQuantity,
    BigDecimal rejectedQuantity,
    BigDecimal acceptanceRate,
    BigDecimal rejectionRate,
    String unitOfMeasure
) {}
