package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.GoodsReceiptItem;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface GoodsReceiptItemRepository extends JpaRepository<GoodsReceiptItem, Long> {

    @Query("SELECT COALESCE(SUM(gri.receivedQuantity), 0) FROM GoodsReceiptItem gri WHERE gri.purchaseOrderItem.id = :poItemId AND gri.goodsReceipt.status = 'POSTED'")
    BigDecimal sumPostedReceivedQuantityByPoItemId(@Param("poItemId") Long poItemId);

    @Query("""
            SELECT gri.purchaseOrderItem.id, COALESCE(SUM(gri.receivedQuantity), 0)
            FROM GoodsReceiptItem gri
            WHERE gri.goodsReceipt.status = si.plaan.entity.GoodsReceiptStatus.POSTED
              AND gri.purchaseOrderItem.id IN :poItemIds
            GROUP BY gri.purchaseOrderItem.id
            """)
    List<Object[]> sumPostedReceivedQuantityByPoItemIds(@Param("poItemIds") java.util.Collection<Long> poItemIds);

    List<GoodsReceiptItem> findByGoodsReceiptId(Long goodsReceiptId);
}
