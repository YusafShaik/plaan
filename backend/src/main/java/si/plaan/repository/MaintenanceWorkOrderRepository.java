package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.MaintenanceWorkOrder;
import si.plaan.entity.MaintenanceWorkOrderStatus;
import si.plaan.entity.MaintenanceWorkOrderType;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceWorkOrderRepository
        extends JpaRepository<MaintenanceWorkOrder, Long>, JpaSpecificationExecutor<MaintenanceWorkOrder> {

    Optional<MaintenanceWorkOrder> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndWorkOrderNumberIgnoreCase(Long organizationId, String workOrderNumber);

    boolean existsByOrganizationIdAndMaintenancePlanIdAndStatusIn(
            Long organizationId, Long maintenancePlanId, Collection<MaintenanceWorkOrderStatus> statuses);

    boolean existsByOrganizationIdAndEquipmentIdAndStatusIn(
            Long organizationId, Long equipmentId, Collection<MaintenanceWorkOrderStatus> statuses);

    long countByOrganizationIdAndStatus(Long organizationId, MaintenanceWorkOrderStatus status);

    List<MaintenanceWorkOrder> findByOrganizationIdAndEquipmentIdAndStatusOrderByActualEndAtDesc(
            Long organizationId, Long equipmentId, MaintenanceWorkOrderStatus status);

    @Query("""
            SELECT wo FROM MaintenanceWorkOrder wo
            JOIN FETCH wo.maintenancePlan
            WHERE wo.organization.id = :orgId
              AND wo.maintenancePlan IS NOT NULL
              AND wo.status IN :statuses
            """)
    List<MaintenanceWorkOrder> findByOrganizationIdAndStatusInAndMaintenancePlanNotNull(
            @Param("orgId") Long orgId,
            @Param("statuses") Collection<MaintenanceWorkOrderStatus> statuses);

    @Query("""
            SELECT wo FROM MaintenanceWorkOrder wo
            JOIN FETCH wo.equipment
            LEFT JOIN FETCH wo.rootBreakdownWorkOrder
            WHERE wo.organization.id = :orgId
              AND wo.maintenanceType = si.plaan.entity.MaintenanceWorkOrderType.BREAKDOWN
              AND wo.status <> si.plaan.entity.MaintenanceWorkOrderStatus.CANCELLED
            """)
    List<MaintenanceWorkOrder> findActiveBreakdownWorkOrders(@Param("orgId") Long orgId);

    List<MaintenanceWorkOrder> findByOrganizationIdAndEquipmentIdAndMaintenanceTypeAndStatusIn(
            Long organizationId,
            Long equipmentId,
            MaintenanceWorkOrderType maintenanceType,
            Collection<MaintenanceWorkOrderStatus> statuses);

    List<MaintenanceWorkOrder> findByOrganizationIdAndEquipmentIdAndMaintenanceTypeAndStatus(
            Long organizationId,
            Long equipmentId,
            MaintenanceWorkOrderType maintenanceType,
            MaintenanceWorkOrderStatus status);

    List<MaintenanceWorkOrder> findByOrganizationIdAndRootBreakdownWorkOrderId(
            Long organizationId, Long rootBreakdownWorkOrderId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 5) AS INTEGER)), 0) "
            + "FROM maintenance_work_orders "
            + "WHERE organization_id = :orgId AND work_order_number ~ '^MWO-[0-9]+$'",
            nativeQuery = true)
    int findMaxWorkOrderNumberByOrganizationId(@Param("orgId") Long orgId);
}
