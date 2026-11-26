package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.MaintenancePlan;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenancePlanRepository
        extends JpaRepository<MaintenancePlan, Long>, JpaSpecificationExecutor<MaintenancePlan> {

    Optional<MaintenancePlan> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndPlanNumberIgnoreCase(Long organizationId, String planNumber);

    List<MaintenancePlan> findByOrganizationIdAndEquipmentIdOrderByNextDueDateAsc(
            Long organizationId, Long equipmentId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(plan_number FROM 4) AS INTEGER)), 0) "
            + "FROM maintenance_plans "
            + "WHERE organization_id = :orgId AND plan_number ~ '^MP-[0-9]+$'",
            nativeQuery = true)
    int findMaxPlanNumberByOrganizationId(@Param("orgId") Long orgId);
}
