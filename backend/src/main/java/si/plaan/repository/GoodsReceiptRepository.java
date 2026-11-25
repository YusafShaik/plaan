package si.plaan.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.GoodsReceipt;
import si.plaan.entity.GoodsReceiptStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long>, JpaSpecificationExecutor<GoodsReceipt> {

    Optional<GoodsReceipt> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndGrnNumberIgnoreCase(Long organizationId, String grnNumber);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndStatus(Long organizationId, GoodsReceiptStatus status);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(grn_number FROM 5) AS INTEGER)), 0) FROM goods_receipts WHERE organization_id = :orgId AND grn_number ~ '^GRN-[0-9]+$'", nativeQuery = true)
    int findMaxGrnNumberByOrganizationId(@Param("orgId") Long orgId);

    List<GoodsReceipt> findByPurchaseOrderIdAndStatus(Long purchaseOrderId, GoodsReceiptStatus status);
}
