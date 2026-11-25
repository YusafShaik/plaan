package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.Bom;
import si.plaan.entity.BomStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface BomRepository extends JpaRepository<Bom, Long>, JpaSpecificationExecutor<Bom> {

    Optional<Bom> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndBomCode(Long organizationId, String bomCode);

    boolean existsByOrganizationIdAndProductIdAndStatus(Long organizationId, Long productId, BomStatus status);

    boolean existsByOrganizationIdAndProductIdAndStatusAndIdNot(Long organizationId, Long productId, BomStatus status, Long id);

    Optional<Bom> findByOrganizationIdAndProductIdAndStatus(Long organizationId, Long productId, BomStatus status);

    List<Bom> findByOrganizationIdAndProductId(Long organizationId, Long productId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(bom_code FROM 5) AS INTEGER)), 0) " +
                   "FROM boms " +
                   "WHERE organization_id = :orgId AND bom_code ~ '^BOM-[0-9]+$'",
           nativeQuery = true)
    int findMaxBomNumberByOrganizationId(@Param("orgId") Long orgId);
}
