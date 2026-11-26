package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.IncomingInspection;
import si.plaan.entity.IncomingInspectionStatus;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface IncomingInspectionRepository
        extends JpaRepository<IncomingInspection, Long>, JpaSpecificationExecutor<IncomingInspection> {

    Optional<IncomingInspection> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndGoodsReceiptItemId(Long organizationId, Long goodsReceiptItemId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(inspection_number FROM 5) AS INTEGER)), 0) "
            + "FROM incoming_inspections "
            + "WHERE organization_id = :orgId AND inspection_number ~ '^IQC-[0-9]+$'",
            nativeQuery = true)
    int findMaxInspectionNumberByOrganizationId(@Param("orgId") Long orgId);

    @Query("""
        SELECT COALESCE(SUM(i.receivedQuantity), 0) FROM IncomingInspection i
        WHERE i.organization.id = :orgId
          AND i.item.id = :itemId
          AND i.warehouse.id = :warehouseId
          AND i.status IN :statuses
        """)
    BigDecimal sumReceivedForStatuses(
            @Param("orgId") Long orgId,
            @Param("itemId") Long itemId,
            @Param("warehouseId") Long warehouseId,
            @Param("statuses") Collection<IncomingInspectionStatus> statuses);

    @Query("""
        SELECT COALESCE(SUM(i.rejectedQuantity), 0) FROM IncomingInspection i
        WHERE i.organization.id = :orgId
          AND i.item.id = :itemId
          AND i.warehouse.id = :warehouseId
          AND i.status = si.plaan.entity.IncomingInspectionStatus.COMPLETED
          AND i.rejectedQuantity IS NOT NULL
        """)
    BigDecimal sumRejectedCompleted(
            @Param("orgId") Long orgId,
            @Param("itemId") Long itemId,
            @Param("warehouseId") Long warehouseId);

    @Query("""
        SELECT i.item.id, i.warehouse.id,
               COALESCE(SUM(CASE WHEN i.status IN (
                   si.plaan.entity.IncomingInspectionStatus.PENDING,
                   si.plaan.entity.IncomingInspectionStatus.DRAFT)
                 THEN i.receivedQuantity ELSE 0 END), 0),
               COALESCE(SUM(CASE WHEN i.status = si.plaan.entity.IncomingInspectionStatus.COMPLETED
                 THEN COALESCE(i.rejectedQuantity, 0) ELSE 0 END), 0)
        FROM IncomingInspection i
        WHERE i.organization.id = :orgId
        GROUP BY i.item.id, i.warehouse.id
        """)
    List<Object[]> sumHoldsByItemAndWarehouse(@Param("orgId") Long orgId);
}
