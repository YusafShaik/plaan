package si.plaan.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record StockMovementResponse(
    Long id,
    String referenceNumber,
    Long goodsReceiptId,
    String grnNumber,
    Long purchaseOrderId,
    String poNumber,
    Long itemId,
    String itemCode,
    String itemName,
    Long warehouseId,
    String warehouseCode,
    String warehouseName,
    String movementType,
    BigDecimal quantity,
    String unitOfMeasure,
    LocalDate movementDate,
    LocalDateTime createdAt
) {}
