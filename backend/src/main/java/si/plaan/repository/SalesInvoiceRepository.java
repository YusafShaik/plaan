package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.SalesInvoice;
import si.plaan.entity.SalesInvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalesInvoiceRepository extends JpaRepository<SalesInvoice, Long>, JpaSpecificationExecutor<SalesInvoice> {

    Optional<SalesInvoice> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndInvoiceNumberIgnoreCase(Long organizationId, String invoiceNumber);

    boolean existsByOrganizationIdAndDispatchOrderIdAndStatus(Long organizationId, Long dispatchOrderId, SalesInvoiceStatus status);

    boolean existsByOrganizationIdAndDispatchOrderIdAndStatusAndIdNot(
            Long organizationId, Long dispatchOrderId, SalesInvoiceStatus status, Long id);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndStatus(Long organizationId, SalesInvoiceStatus status);

    @Query("SELECT COALESCE(SUM(si.totalAmount), 0) FROM SalesInvoice si WHERE si.organization.id = :orgId AND si.status = si.plaan.entity.SalesInvoiceStatus.POSTED")
    BigDecimal sumTotalReceivableByOrganizationId(@Param("orgId") Long orgId);

    @Query("""
            SELECT COALESCE(SUM(si.totalAmount), 0) FROM SalesInvoice si
            WHERE si.organization.id = :orgId
              AND si.status = si.plaan.entity.SalesInvoiceStatus.POSTED
              AND si.invoiceDate >= :from
              AND si.invoiceDate <= :to
            """)
    BigDecimal sumPostedTotalBetween(
            @Param("orgId") Long orgId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("""
            SELECT YEAR(si.invoiceDate), MONTH(si.invoiceDate), COALESCE(SUM(si.totalAmount), 0)
            FROM SalesInvoice si
            WHERE si.organization.id = :orgId
              AND si.status = si.plaan.entity.SalesInvoiceStatus.POSTED
              AND si.invoiceDate >= :from
              AND si.invoiceDate <= :to
            GROUP BY YEAR(si.invoiceDate), MONTH(si.invoiceDate)
            """)
    List<Object[]> sumPostedTotalGroupedByMonth(
            @Param("orgId") Long orgId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("SELECT COALESCE(SUM(si.outstandingAmount), 0) FROM SalesInvoice si WHERE si.organization.id = :orgId AND si.status = si.plaan.entity.SalesInvoiceStatus.POSTED")
    BigDecimal sumOutstandingReceivableByOrganizationId(@Param("orgId") Long orgId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) FROM sales_invoices WHERE organization_id = :orgId AND invoice_number ~ '^SI-[0-9]+$'", nativeQuery = true)
    int findMaxInvoiceNumberByOrganizationId(@Param("orgId") Long orgId);

    List<SalesInvoice> findByOrganizationIdAndDispatchOrderId(Long organizationId, Long dispatchOrderId);

    @Query("""
            SELECT si FROM SalesInvoice si
            JOIN FETCH si.customer
            WHERE si.organization.id = :orgId
              AND si.status = si.plaan.entity.SalesInvoiceStatus.POSTED
              AND si.outstandingAmount > 0
            ORDER BY si.invoiceDate DESC, si.id DESC
            """)
    List<SalesInvoice> findPostedOutstandingByOrganizationId(@Param("orgId") Long orgId);
}
