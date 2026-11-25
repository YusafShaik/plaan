package si.plaan.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.DispatchOrder;
import si.plaan.entity.DispatchOrderStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface DispatchOrderRepository extends JpaRepository<DispatchOrder, Long>, JpaSpecificationExecutor<DispatchOrder> {

    Optional<DispatchOrder> findByIdAndOrganizationId(Long id, Long organizationId);

    @Query("SELECT d FROM DispatchOrder d LEFT JOIN FETCH d.items WHERE d.id = :id AND d.organization.id = :orgId")
    Optional<DispatchOrder> findByIdAndOrganizationIdWithItems(@Param("id") Long id, @Param("orgId") Long orgId);

    List<DispatchOrder> findByOrganizationIdAndSalesOrderIdOrderByCreatedAtDesc(Long organizationId, Long salesOrderId);

    boolean existsBySalesOrderIdAndStatus(Long salesOrderId, DispatchOrderStatus status);

    @Query("SELECT MAX(d.dispatchNumber) FROM DispatchOrder d WHERE d.organization.id = :orgId AND d.dispatchNumber LIKE 'DO-%'")
    String findMaxDispatchNumberByOrganizationId(@Param("orgId") Long orgId);

    Page<DispatchOrder> findByOrganizationId(Long organizationId, Pageable pageable);
}
