package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.MaterialIssue;
import si.plaan.entity.MaterialIssueStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaterialIssueRepository extends JpaRepository<MaterialIssue, Long>, JpaSpecificationExecutor<MaterialIssue> {

    Optional<MaterialIssue> findByIdAndOrganizationId(Long id, Long orgId);

    List<MaterialIssue> findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(Long orgId, Long productionOrderId);

    boolean existsByOrganizationIdAndIssueNumber(Long orgId, String issueNumber);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(mi.issueNumber, 4) AS int)), 0) " +
           "FROM MaterialIssue mi " +
           "WHERE mi.organization.id = :orgId AND mi.issueNumber LIKE 'MI-%'")
    int findMaxIssueNumberByOrganizationId(@Param("orgId") Long orgId);

    @Query("SELECT COUNT(mi) > 0 FROM MaterialIssue mi " +
           "WHERE mi.organization.id = :orgId AND mi.productionOrder.id = :productionOrderId AND mi.status = :status")
    boolean existsByOrganizationIdAndProductionOrderIdAndStatus(
            @Param("orgId") Long orgId,
            @Param("productionOrderId") Long productionOrderId,
            @Param("status") MaterialIssueStatus status
    );
}
