package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.BomItem;

import java.util.List;

@Repository
public interface BomItemRepository extends JpaRepository<BomItem, Long> {

    List<BomItem> findByBomId(Long bomId);
}
