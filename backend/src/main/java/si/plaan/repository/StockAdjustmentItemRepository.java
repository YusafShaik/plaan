package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.StockAdjustmentItem;

import java.util.List;

@Repository
public interface StockAdjustmentItemRepository extends JpaRepository<StockAdjustmentItem, Long> {

    List<StockAdjustmentItem> findByStockAdjustmentIdOrderByCreatedAtAsc(Long stockAdjustmentId);
}
