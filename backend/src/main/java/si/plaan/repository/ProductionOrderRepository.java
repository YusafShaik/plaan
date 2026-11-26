package si.plaan.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.ProductionOrder;
import si.plaan.entity.ProductionOrderStatus;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductionOrderRepository extends JpaRepository<ProductionOrder, Long>, JpaSpecificationExecutor<ProductionOrder> {

    Optional<ProductionOrder> findByIdAndOrganizationId(Long id, Long organizationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM ProductionOrder o WHERE o.id = :id AND o.organization.id = :orgId")
    Optional<ProductionOrder> findByIdAndOrganizationIdForUpdate(@Param("id") Long id, @Param("orgId") Long orgId);

    boolean existsByOrganizationIdAndOrderNumber(Long organizationId, String orderNumber);

    boolean existsByOrganizationIdAndBomId(Long organizationId, Long bomId);

    long countByOrganizationIdAndStatus(Long organizationId, ProductionOrderStatus status);

    List<ProductionOrder> findByOrganizationIdAndStatusIn(
            Long organizationId, Collection<ProductionOrderStatus> statuses);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) " +
                   "FROM production_orders " +
                   "WHERE organization_id = :orgId AND order_number ~ '^MO-[0-9]+$'",
           nativeQuery = true)
    int findMaxOrderNumberByOrganizationId(@Param("orgId") Long orgId);
}
