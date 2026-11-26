package si.plaan.dto.response;

import si.plaan.entity.InspectionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record RejectionReportRowResponse(
    Long id,
    InspectionType inspectionType,
    String inspectionNumber,
    LocalDate completionDate,
    Long itemId,
    String itemCode,
    String itemName,
    Long warehouseId,
    String warehouseName,
    Long supplierId,
    String supplierName,
    Long productionOrderId,
    String productionOrderNumber,
    String sourceReference,
    BigDecimal inspectedQuantity,
    BigDecimal acceptedQuantity,
    BigDecimal rejectedQuantity,
    String unitOfMeasure,
    BigDecimal rejectionRate,
    String remarks,
    List<String> failedParameters,
    String inspectedByName
) {}
