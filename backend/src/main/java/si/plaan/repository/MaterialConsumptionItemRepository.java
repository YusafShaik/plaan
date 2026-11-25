package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.MaterialConsumptionItem;

import java.util.List;

@Repository
public interface MaterialConsumptionItemRepository extends JpaRepository<MaterialConsumptionItem, Long> {

    List<MaterialConsumptionItem> findByMaterialConsumptionId(Long materialConsumptionId);
}
