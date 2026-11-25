package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.ProductionReceipt;
import si.plaan.entity.ProductionReceiptStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductionReceiptRepository extends JpaRepository<ProductionReceipt, Long> {

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(pr.receiptNumber, 4) AS int)), 0) FROM ProductionReceipt pr WHERE pr.organization.id = :orgId AND pr.receiptNumber LIKE 'PR-%'")
    int findMaxReceiptNumberByOrganizationId(@Param("orgId") Long orgId);

    List<ProductionReceipt> findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(Long orgId, Long productionOrderId);

    Optional<ProductionReceipt> findByIdAndOrganizationId(Long id, Long orgId);

    boolean existsByOrganizationIdAndReceiptNumber(Long orgId, String receiptNumber);

    boolean existsByOrganizationIdAndProductionOrderIdAndStatus(Long orgId, Long productionOrderId, ProductionReceiptStatus status);
}
