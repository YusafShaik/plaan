package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.MaterialReturn;
import si.plaan.entity.MaterialReturnStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaterialReturnRepository extends JpaRepository<MaterialReturn, Long>, JpaSpecificationExecutor<MaterialReturn> {

    Optional<MaterialReturn> findByIdAndOrganizationId(Long id, Long orgId);

    List<MaterialReturn> findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(Long orgId, Long productionOrderId);

    boolean existsByOrganizationIdAndReturnNumber(Long orgId, String returnNumber);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(mr.returnNumber, 4) AS int)), 0) " +
           "FROM MaterialReturn mr " +
           "WHERE mr.organization.id = :orgId AND mr.returnNumber LIKE 'MR-%'")
    int findMaxReturnNumberByOrganizationId(@Param("orgId") Long orgId);

    @Query("SELECT COUNT(mr) > 0 FROM MaterialReturn mr " +
           "WHERE mr.organization.id = :orgId AND mr.productionOrder.id = :productionOrderId AND mr.status = :status")
    boolean existsByOrganizationIdAndProductionOrderIdAndStatus(
            @Param("orgId") Long orgId,
            @Param("productionOrderId") Long productionOrderId,
            @Param("status") MaterialReturnStatus status
    );
}
