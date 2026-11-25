package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.dto.response.StockOverviewItemResponse;
import si.plaan.entity.StockMovement;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long>, JpaSpecificationExecutor<StockMovement> {

    List<StockMovement> findByPurchaseOrderIdOrderByCreatedAtDesc(Long purchaseOrderId);

    List<StockMovement> findByGoodsReceiptIdOrderByCreatedAtDesc(Long goodsReceiptId);

    List<StockMovement> findByOpeningStockIdOrderByCreatedAtDesc(Long openingStockId);

    List<StockMovement> findByStockTransferIdOrderByCreatedAtDesc(Long stockTransferId);

    List<StockMovement> findByStockAdjustmentIdOrderByCreatedAtDesc(Long stockAdjustmentId);

    List<StockMovement> findByMaterialIssueIdOrderByCreatedAtDesc(Long materialIssueId);

    List<StockMovement> findByMaterialReturnIdOrderByCreatedAtDesc(Long materialReturnId);

    List<StockMovement> findByProductionReceiptIdOrderByCreatedAtDesc(Long productionReceiptId);

    List<StockMovement> findByDispatchOrderIdOrderByCreatedAtDesc(Long dispatchOrderId);

    @Query("SELECT new si.plaan.dto.response.StockOverviewItemResponse(" +
           "sm.item.id, sm.item.itemCode, sm.item.name, " +
           "sm.warehouse.id, sm.warehouse.warehouseCode, sm.warehouse.name, " +
           "SUM(CASE WHEN sm.movementType LIKE 'OUTBOUND%' OR sm.movementType = 'TRANSFER_OUT' OR sm.movementType = 'ADJUSTMENT_OUT' OR sm.movementType = 'MATERIAL_ISSUE' OR sm.movementType LIKE '%ISSUE%' OR sm.movementType = 'SALES_DISPATCH' OR sm.movementType LIKE '%DISPATCH%' THEN -sm.quantity ELSE sm.quantity END), " +
           "sm.item.unitOfMeasure) " +
           "FROM StockMovement sm " +
           "LEFT JOIN sm.goodsReceipt gr " +
           "LEFT JOIN sm.openingStock os " +
           "LEFT JOIN sm.stockTransfer st " +
           "LEFT JOIN sm.stockAdjustment sa " +
           "LEFT JOIN sm.materialIssue mi " +
           "LEFT JOIN sm.materialReturn mr " +
           "LEFT JOIN sm.productionReceipt pr " +
           "LEFT JOIN sm.dispatchOrder do " +
           "WHERE sm.organization.id = :orgId " +
           "  AND ((gr IS NOT NULL AND gr.status = si.plaan.entity.GoodsReceiptStatus.POSTED) " +
           "       OR (os IS NOT NULL AND os.status = si.plaan.entity.OpeningStockStatus.POSTED) " +
           "       OR (st IS NOT NULL AND st.status = si.plaan.entity.StockTransferStatus.POSTED) " +
           "       OR (sa IS NOT NULL AND sa.status = si.plaan.entity.StockAdjustmentStatus.POSTED) " +
           "       OR (mi IS NOT NULL AND mi.status = si.plaan.entity.MaterialIssueStatus.POSTED) " +
           "       OR (mr IS NOT NULL AND mr.status = si.plaan.entity.MaterialReturnStatus.POSTED) " +
           "       OR (pr IS NOT NULL AND pr.status = si.plaan.entity.ProductionReceiptStatus.POSTED) " +
           "       OR (do IS NOT NULL AND do.status = si.plaan.entity.DispatchOrderStatus.POSTED)) " +
           "GROUP BY sm.item.id, sm.item.itemCode, sm.item.name, " +
           "         sm.warehouse.id, sm.warehouse.warehouseCode, sm.warehouse.name, " +
           "         sm.item.unitOfMeasure " +
           "HAVING SUM(CASE WHEN sm.movementType LIKE 'OUTBOUND%' OR sm.movementType = 'TRANSFER_OUT' OR sm.movementType = 'ADJUSTMENT_OUT' OR sm.movementType = 'MATERIAL_ISSUE' OR sm.movementType LIKE '%ISSUE%' OR sm.movementType = 'SALES_DISPATCH' OR sm.movementType LIKE '%DISPATCH%' THEN -sm.quantity ELSE sm.quantity END) > 0 " +
           "ORDER BY sm.item.itemCode ASC, sm.warehouse.warehouseCode ASC")
    List<StockOverviewItemResponse> aggregateStockOverview(@Param("orgId") Long orgId);

    @Query("SELECT sm FROM StockMovement sm " +
           "JOIN FETCH sm.item i " +
           "JOIN FETCH sm.warehouse w " +
           "LEFT JOIN FETCH sm.goodsReceipt gr " +
           "LEFT JOIN FETCH sm.openingStock os " +
           "LEFT JOIN FETCH sm.stockTransfer st " +
           "LEFT JOIN FETCH sm.stockAdjustment sa " +
           "LEFT JOIN FETCH sm.materialIssue mi " +
           "LEFT JOIN FETCH sm.materialReturn mr " +
           "LEFT JOIN FETCH sm.productionReceipt pr " +
           "LEFT JOIN FETCH sm.dispatchOrder do " +
           "WHERE sm.organization.id = :orgId " +
           "  AND ((gr IS NOT NULL AND gr.status = si.plaan.entity.GoodsReceiptStatus.POSTED) " +
           "       OR (os IS NOT NULL AND os.status = si.plaan.entity.OpeningStockStatus.POSTED) " +
           "       OR (st IS NOT NULL AND st.status = si.plaan.entity.StockTransferStatus.POSTED) " +
           "       OR (sa IS NOT NULL AND sa.status = si.plaan.entity.StockAdjustmentStatus.POSTED) " +
           "       OR (mi IS NOT NULL AND mi.status = si.plaan.entity.MaterialIssueStatus.POSTED) " +
           "       OR (mr IS NOT NULL AND mr.status = si.plaan.entity.MaterialReturnStatus.POSTED) " +
           "       OR (pr IS NOT NULL AND pr.status = si.plaan.entity.ProductionReceiptStatus.POSTED) " +
           "       OR (do IS NOT NULL AND do.status = si.plaan.entity.DispatchOrderStatus.POSTED)) " +
           "  AND (:itemId IS NULL OR sm.item.id = :itemId) " +
           "  AND (:warehouseId IS NULL OR sm.warehouse.id = :warehouseId) " +
           "ORDER BY sm.movementDate ASC, sm.id ASC")
    List<StockMovement> findStockLedgerMovements(
            @Param("orgId") Long orgId,
            @Param("itemId") Long itemId,
            @Param("warehouseId") Long warehouseId
    );

    @Query("SELECT COUNT(sm) > 0 FROM StockMovement sm " +
           "LEFT JOIN sm.goodsReceipt gr " +
           "LEFT JOIN sm.openingStock os " +
           "LEFT JOIN sm.stockTransfer st " +
           "LEFT JOIN sm.stockAdjustment sa " +
           "LEFT JOIN sm.materialIssue mi " +
           "LEFT JOIN sm.materialReturn mr " +
           "LEFT JOIN sm.productionReceipt pr " +
           "LEFT JOIN sm.dispatchOrder do " +
           "WHERE sm.organization.id = :orgId " +
           "  AND sm.item.id = :itemId " +
           "  AND sm.warehouse.id = :warehouseId " +
           "  AND ((gr IS NOT NULL AND gr.status = si.plaan.entity.GoodsReceiptStatus.POSTED) " +
           "       OR (os IS NOT NULL AND os.status = si.plaan.entity.OpeningStockStatus.POSTED) " +
           "       OR (st IS NOT NULL AND st.status = si.plaan.entity.StockTransferStatus.POSTED) " +
           "       OR (sa IS NOT NULL AND sa.status = si.plaan.entity.StockAdjustmentStatus.POSTED) " +
           "       OR (mi IS NOT NULL AND mi.status = si.plaan.entity.MaterialIssueStatus.POSTED) " +
           "       OR (mr IS NOT NULL AND mr.status = si.plaan.entity.MaterialReturnStatus.POSTED) " +
           "       OR (pr IS NOT NULL AND pr.status = si.plaan.entity.ProductionReceiptStatus.POSTED) " +
           "       OR (do IS NOT NULL AND do.status = si.plaan.entity.DispatchOrderStatus.POSTED))")
    boolean existsPostedMovementForItemAndWarehouse(
            @Param("orgId") Long orgId,
            @Param("itemId") Long itemId,
            @Param("warehouseId") Long warehouseId
    );

    @Query("SELECT COALESCE(SUM(CASE WHEN sm.movementType LIKE 'OUTBOUND%' OR sm.movementType = 'TRANSFER_OUT' OR sm.movementType = 'ADJUSTMENT_OUT' OR sm.movementType = 'MATERIAL_ISSUE' OR sm.movementType LIKE '%ISSUE%' OR sm.movementType = 'SALES_DISPATCH' OR sm.movementType LIKE '%DISPATCH%' THEN -sm.quantity ELSE sm.quantity END), 0) " +
           "FROM StockMovement sm " +
           "LEFT JOIN sm.goodsReceipt gr " +
           "LEFT JOIN sm.openingStock os " +
           "LEFT JOIN sm.stockTransfer st " +
           "LEFT JOIN sm.stockAdjustment sa " +
           "LEFT JOIN sm.materialIssue mi " +
           "LEFT JOIN sm.materialReturn mr " +
           "LEFT JOIN sm.productionReceipt pr " +
           "LEFT JOIN sm.dispatchOrder do " +
           "WHERE sm.organization.id = :orgId " +
           "  AND sm.item.id = :itemId " +
           "  AND sm.warehouse.id = :warehouseId " +
           "  AND ((gr IS NOT NULL AND gr.status = si.plaan.entity.GoodsReceiptStatus.POSTED) " +
           "       OR (os IS NOT NULL AND os.status = si.plaan.entity.OpeningStockStatus.POSTED) " +
           "       OR (st IS NOT NULL AND st.status = si.plaan.entity.StockTransferStatus.POSTED) " +
           "       OR (sa IS NOT NULL AND sa.status = si.plaan.entity.StockAdjustmentStatus.POSTED) " +
           "       OR (mi IS NOT NULL AND mi.status = si.plaan.entity.MaterialIssueStatus.POSTED) " +
           "       OR (mr IS NOT NULL AND mr.status = si.plaan.entity.MaterialReturnStatus.POSTED) " +
           "       OR (pr IS NOT NULL AND pr.status = si.plaan.entity.ProductionReceiptStatus.POSTED) " +
           "       OR (do IS NOT NULL AND do.status = si.plaan.entity.DispatchOrderStatus.POSTED))")
    BigDecimal getCurrentStockForItemAndWarehouse(
            @Param("orgId") Long orgId,
            @Param("itemId") Long itemId,
            @Param("warehouseId") Long warehouseId
    );
}
