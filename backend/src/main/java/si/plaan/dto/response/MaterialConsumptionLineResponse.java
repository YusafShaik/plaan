package si.plaan.dto.response;

import java.math.BigDecimal;

public record MaterialConsumptionLineResponse(
    Long productionOrderItemId,
    Long materialId,
    String materialCode,
    String materialName,
    BigDecimal requiredQuantity,
    BigDecimal issuedQuantity,
    BigDecimal consumedQuantity,
    BigDecimal returnedQuantity,
    BigDecimal remainingQuantity,
    String unitOfMeasure,
    boolean unreconciled
) {}
