package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.MaterialConsumption;
import si.plaan.entity.MaterialConsumptionStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaterialConsumptionRepository extends JpaRepository<MaterialConsumption, Long>, JpaSpecificationExecutor<MaterialConsumption> {

    Optional<MaterialConsumption> findByIdAndOrganizationId(Long id, Long orgId);

    List<MaterialConsumption> findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(Long orgId, Long productionOrderId);

    boolean existsByOrganizationIdAndConsumptionNumber(Long orgId, String consumptionNumber);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(mc.consumptionNumber, 4) AS int)), 0) " +
           "FROM MaterialConsumption mc " +
           "WHERE mc.organization.id = :orgId AND mc.consumptionNumber LIKE 'MC-%'")
    int findMaxConsumptionNumberByOrganizationId(@Param("orgId") Long orgId);

    @Query("SELECT COUNT(mc) > 0 FROM MaterialConsumption mc " +
           "WHERE mc.organization.id = :orgId AND mc.productionOrder.id = :productionOrderId AND mc.status = :status")
    boolean existsByOrganizationIdAndProductionOrderIdAndStatus(
            @Param("orgId") Long orgId,
            @Param("productionOrderId") Long productionOrderId,
            @Param("status") MaterialConsumptionStatus status
    );
}
