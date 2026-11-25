package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.PurchaseOrder;
import si.plaan.entity.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long>, JpaSpecificationExecutor<PurchaseOrder> {

    Optional<PurchaseOrder> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndPoNumberIgnoreCase(Long organizationId, String poNumber);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndStatus(Long organizationId, PurchaseOrderStatus status);

    List<PurchaseOrder> findByOrganizationIdAndStatusInOrderByCreatedAtDesc(Long organizationId, Collection<PurchaseOrderStatus> statuses);

    @Query("SELECT COALESCE(SUM(po.totalAmount), 0) FROM PurchaseOrder po WHERE po.organization.id = :orgId AND po.status <> si.plaan.entity.PurchaseOrderStatus.CANCELLED")
    BigDecimal sumTotalValueByOrganizationId(@Param("orgId") Long orgId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 4) AS INTEGER)), 0) FROM purchase_orders WHERE organization_id = :orgId AND po_number ~ '^PO-[0-9]+$'", nativeQuery = true)
    int findMaxPoNumberByOrganizationId(@Param("orgId") Long orgId);
}
