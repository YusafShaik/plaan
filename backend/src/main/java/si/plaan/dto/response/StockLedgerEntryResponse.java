package si.plaan.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record StockLedgerEntryResponse(
        Long id,
        LocalDate date,
        String referenceNumber,
        Long goodsReceiptId,
        Long openingStockId,
        Long stockTransferId,
        Long stockAdjustmentId,
        Long materialIssueId,
        Long materialReturnId,
        Long productionReceiptId,
        String transactionType,
        String itemCode,
        String itemName,
        String warehouseCode,
        String warehouseName,
        BigDecimal quantityIn,
        BigDecimal quantityOut,
        BigDecimal runningBalance,
        String unitOfMeasure,
        LocalDateTime createdAt
) {
    public StockLedgerEntryResponse(
            Long id,
            LocalDate date,
            String referenceNumber,
            Long goodsReceiptId,
            Long openingStockId,
            Long stockTransferId,
            Long stockAdjustmentId,
            Long materialIssueId,
            Long materialReturnId,
            String transactionType,
            String itemCode,
            String itemName,
            String warehouseCode,
            String warehouseName,
            BigDecimal quantityIn,
            BigDecimal quantityOut,
            BigDecimal runningBalance,
            String unitOfMeasure,
            LocalDateTime createdAt
    ) {
        this(id, date, referenceNumber, goodsReceiptId, openingStockId, stockTransferId,
                stockAdjustmentId, materialIssueId, materialReturnId, null, transactionType, itemCode, itemName,
                warehouseCode, warehouseName, quantityIn, quantityOut, runningBalance, unitOfMeasure, createdAt);
    }

    public StockLedgerEntryResponse(
            Long id,
            LocalDate date,
            String referenceNumber,
            Long goodsReceiptId,
            Long openingStockId,
            Long stockTransferId,
            Long stockAdjustmentId,
            Long materialIssueId,
            String transactionType,
            String itemCode,
            String itemName,
            String warehouseCode,
            String warehouseName,
            BigDecimal quantityIn,
            BigDecimal quantityOut,
            BigDecimal runningBalance,
            String unitOfMeasure,
            LocalDateTime createdAt
    ) {
        this(id, date, referenceNumber, goodsReceiptId, openingStockId, stockTransferId,
                stockAdjustmentId, materialIssueId, null, null, transactionType, itemCode, itemName,
                warehouseCode, warehouseName, quantityIn, quantityOut, runningBalance, unitOfMeasure, createdAt);
    }
}
