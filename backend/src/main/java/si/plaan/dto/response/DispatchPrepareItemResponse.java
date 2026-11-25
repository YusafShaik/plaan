package si.plaan.dto.response;

import java.math.BigDecimal;

public record DispatchPrepareItemResponse(
    Long salesOrderItemId,
    Long itemId,
    String itemCode,
    String itemName,
    String unitOfMeasure,
    BigDecimal orderedQuantity,
    BigDecimal dispatchedQuantity,
    BigDecimal pendingQuantity,
    BigDecimal onHandQuantity
) {}
