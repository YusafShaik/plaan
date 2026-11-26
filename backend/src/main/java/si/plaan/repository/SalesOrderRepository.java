package si.plaan.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.SalesOrder;
import si.plaan.entity.SalesOrderStatus;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long>, JpaSpecificationExecutor<SalesOrder> {

    Optional<SalesOrder> findByIdAndOrganizationId(Long id, Long organizationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SalesOrder s WHERE s.id = :id AND s.organization.id = :orgId")
    Optional<SalesOrder> findByIdAndOrganizationIdForUpdate(@Param("id") Long id, @Param("orgId") Long orgId);

    boolean existsByOrganizationIdAndOrderNumberIgnoreCase(Long organizationId, String orderNumber);

    boolean existsByOrganizationIdAndCustomerId(Long organizationId, Long customerId);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndStatus(Long organizationId, SalesOrderStatus status);

    List<SalesOrder> findByOrganizationIdAndStatusInOrderByCreatedAtDesc(Long organizationId, Collection<SalesOrderStatus> statuses);

    @Query("SELECT COALESCE(SUM(so.totalAmount), 0) FROM SalesOrder so WHERE so.organization.id = :orgId AND so.status <> si.plaan.entity.SalesOrderStatus.CANCELLED")
    BigDecimal sumTotalValueByOrganizationId(@Param("orgId") Long orgId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) FROM sales_orders WHERE organization_id = :orgId AND order_number ~ '^SO-[0-9]+$'", nativeQuery = true)
    int findMaxSalesOrderNumberByOrganizationId(@Param("orgId") Long orgId);
}
