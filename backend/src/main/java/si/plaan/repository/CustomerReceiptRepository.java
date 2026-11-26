package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.CustomerReceipt;
import si.plaan.entity.CustomerReceiptStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerReceiptRepository extends JpaRepository<CustomerReceipt, Long>, JpaSpecificationExecutor<CustomerReceipt> {

    Optional<CustomerReceipt> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndReceiptNumberIgnoreCase(Long organizationId, String receiptNumber);

    List<CustomerReceipt> findByOrganizationIdAndSalesInvoiceIdAndStatusOrderByReceiptDateAscIdAsc(
            Long organizationId, Long salesInvoiceId, CustomerReceiptStatus status);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 5) AS INTEGER)), 0) FROM customer_receipts WHERE organization_id = :orgId AND receipt_number ~ '^REC-[0-9]+$'", nativeQuery = true)
    int findMaxReceiptNumberByOrganizationId(@Param("orgId") Long orgId);
}
