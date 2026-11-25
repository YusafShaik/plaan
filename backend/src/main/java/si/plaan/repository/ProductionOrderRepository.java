package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.ProductionOrder;

import java.util.Optional;

@Repository
public interface ProductionOrderRepository extends JpaRepository<ProductionOrder, Long>, JpaSpecificationExecutor<ProductionOrder> {

    Optional<ProductionOrder> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndOrderNumber(Long organizationId, String orderNumber);

    boolean existsByOrganizationIdAndBomId(Long organizationId, Long bomId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) " +
                   "FROM production_orders " +
                   "WHERE organization_id = :orgId AND order_number ~ '^MO-[0-9]+$'",
           nativeQuery = true)
    int findMaxOrderNumberByOrganizationId(@Param("orgId") Long orgId);
}
