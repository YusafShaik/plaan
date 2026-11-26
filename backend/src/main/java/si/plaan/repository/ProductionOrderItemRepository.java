package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import si.plaan.entity.ProductionOrderItem;

import java.util.List;

@Repository
public interface ProductionOrderItemRepository
        extends JpaRepository<ProductionOrderItem, Long>, JpaSpecificationExecutor<ProductionOrderItem> {

    List<ProductionOrderItem> findByProductionOrderId(Long productionOrderId);
}
