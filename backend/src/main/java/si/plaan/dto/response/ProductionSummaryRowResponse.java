package si.plaan.dto.response;

import si.plaan.entity.ProductionOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProductionSummaryRowResponse(
    Long id,
    String orderNumber,
    LocalDate orderDate,
    Long productId,
    String productCode,
    String productName,
    BigDecimal plannedQuantity,
    BigDecimal producedQuantity,
    BigDecimal pendingQuantity,
    String unitOfMeasure,
    BigDecimal completionPercent,
    LocalDate plannedCompletionDate,
    ProductionOrderStatus status
) {}
