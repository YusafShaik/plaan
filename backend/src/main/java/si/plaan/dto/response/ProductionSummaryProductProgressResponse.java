package si.plaan.dto.response;

import java.math.BigDecimal;

public record ProductionSummaryProductProgressResponse(
    Long productId,
    String productCode,
    String productName,
    BigDecimal plannedQuantity,
    BigDecimal producedQuantity,
    BigDecimal pendingQuantity,
    BigDecimal completionPercent,
    String unitOfMeasure
) {}
