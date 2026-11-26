package si.plaan.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StockMovementsRowResponse(
    Long id,
    LocalDate movementDate,
    Long itemId,
    String itemCode,
    String itemName,
    Long warehouseId,
    String warehouseCode,
    String warehouseName,
    String movementType,
    String movementTypeLabel,
    String referenceNumber,
    Long goodsReceiptId,
    Long openingStockId,
    Long stockTransferId,
    Long stockAdjustmentId,
    Long materialIssueId,
    Long materialReturnId,
    Long productionReceiptId,
    Long dispatchOrderId,
    BigDecimal quantityIn,
    BigDecimal quantityOut,
    BigDecimal runningBalance,
    String unitOfMeasure,
    boolean openingBalanceRow
) {}
