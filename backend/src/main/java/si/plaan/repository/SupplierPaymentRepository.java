package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.SupplierPayment;
import si.plaan.entity.SupplierPaymentStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierPaymentRepository extends JpaRepository<SupplierPayment, Long>, JpaSpecificationExecutor<SupplierPayment> {

    Optional<SupplierPayment> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndPaymentNumberIgnoreCase(Long organizationId, String paymentNumber);

    List<SupplierPayment> findByOrganizationIdAndPurchaseInvoiceIdAndStatusOrderByPaymentDateAscIdAsc(
            Long organizationId, Long purchaseInvoiceId, SupplierPaymentStatus status);

    @Query("SELECT COALESCE(SUM(sp.amount), 0) FROM SupplierPayment sp WHERE sp.organization.id = :orgId AND sp.purchaseInvoice.id = :invoiceId AND sp.status = si.plaan.entity.SupplierPaymentStatus.POSTED")
    BigDecimal sumPostedAmountByInvoice(@Param("orgId") Long orgId, @Param("invoiceId") Long invoiceId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 5) AS INTEGER)), 0) FROM supplier_payments WHERE organization_id = :orgId AND payment_number ~ '^PAY-[0-9]+$'", nativeQuery = true)
    int findMaxPaymentNumberByOrganizationId(@Param("orgId") Long orgId);
}
