package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.PurchaseInvoice;
import si.plaan.entity.PurchaseInvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice, Long>, JpaSpecificationExecutor<PurchaseInvoice> {

    Optional<PurchaseInvoice> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndInvoiceNumberIgnoreCase(Long organizationId, String invoiceNumber);

    boolean existsByOrganizationIdAndGoodsReceiptIdAndStatus(Long organizationId, Long goodsReceiptId, PurchaseInvoiceStatus status);

    boolean existsByOrganizationIdAndGoodsReceiptIdAndStatusAndIdNot(Long organizationId, Long goodsReceiptId, PurchaseInvoiceStatus status, Long id);

    boolean existsByOrganizationIdAndSupplierIdAndSupplierInvoiceNumberIgnoreCase(Long organizationId, Long supplierId, String supplierInvoiceNumber);

    boolean existsByOrganizationIdAndSupplierIdAndSupplierInvoiceNumberIgnoreCaseAndIdNot(Long organizationId, Long supplierId, String supplierInvoiceNumber, Long id);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndStatus(Long organizationId, PurchaseInvoiceStatus status);

    @Query("SELECT COALESCE(SUM(pi.totalAmount), 0) FROM PurchaseInvoice pi WHERE pi.organization.id = :orgId AND pi.status = si.plaan.entity.PurchaseInvoiceStatus.POSTED")
    BigDecimal sumTotalPayableByOrganizationId(@Param("orgId") Long orgId);

    @Query("""
            SELECT COALESCE(SUM(pi.totalAmount), 0) FROM PurchaseInvoice pi
            WHERE pi.organization.id = :orgId
              AND pi.status = si.plaan.entity.PurchaseInvoiceStatus.POSTED
              AND pi.invoiceDate >= :from
              AND pi.invoiceDate <= :to
            """)
    BigDecimal sumPostedTotalBetween(
            @Param("orgId") Long orgId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("""
            SELECT YEAR(pi.invoiceDate), MONTH(pi.invoiceDate), COALESCE(SUM(pi.totalAmount), 0)
            FROM PurchaseInvoice pi
            WHERE pi.organization.id = :orgId
              AND pi.status = si.plaan.entity.PurchaseInvoiceStatus.POSTED
              AND pi.invoiceDate >= :from
              AND pi.invoiceDate <= :to
            GROUP BY YEAR(pi.invoiceDate), MONTH(pi.invoiceDate)
            """)
    List<Object[]> sumPostedTotalGroupedByMonth(
            @Param("orgId") Long orgId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("SELECT COALESCE(SUM(pi.outstandingAmount), 0) FROM PurchaseInvoice pi WHERE pi.organization.id = :orgId AND pi.status = si.plaan.entity.PurchaseInvoiceStatus.POSTED")
    BigDecimal sumOutstandingPayableByOrganizationId(@Param("orgId") Long orgId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) FROM purchase_invoices WHERE organization_id = :orgId AND invoice_number ~ '^PI-[0-9]+$'", nativeQuery = true)
    int findMaxInvoiceNumberByOrganizationId(@Param("orgId") Long orgId);

    List<PurchaseInvoice> findByOrganizationIdAndGoodsReceiptId(Long organizationId, Long goodsReceiptId);

    @Query("""
            SELECT pi FROM PurchaseInvoice pi
            JOIN FETCH pi.supplier
            WHERE pi.organization.id = :orgId
              AND pi.status = si.plaan.entity.PurchaseInvoiceStatus.POSTED
              AND pi.outstandingAmount > 0
            ORDER BY pi.invoiceDate DESC, pi.id DESC
            """)
    List<PurchaseInvoice> findPostedOutstandingByOrganizationId(@Param("orgId") Long orgId);
}
