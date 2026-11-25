package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.OpeningStockItem;

import java.util.List;

@Repository
public interface OpeningStockItemRepository extends JpaRepository<OpeningStockItem, Long> {
    List<OpeningStockItem> findByOpeningStockId(Long openingStockId);
}
