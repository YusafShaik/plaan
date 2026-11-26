package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.InspectionTemplate;
import si.plaan.entity.InspectionTemplateStatus;
import si.plaan.entity.InspectionType;

import java.util.Optional;

@Repository
public interface InspectionTemplateRepository
        extends JpaRepository<InspectionTemplate, Long>, JpaSpecificationExecutor<InspectionTemplate> {

    Optional<InspectionTemplate> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndTemplateCodeIgnoreCase(Long organizationId, String templateCode);

    boolean existsByOrganizationIdAndItemIdAndInspectionTypeAndStatus(
            Long organizationId, Long itemId, InspectionType inspectionType, InspectionTemplateStatus status);

    boolean existsByOrganizationIdAndItemIdAndInspectionTypeAndStatusAndIdNot(
            Long organizationId, Long itemId, InspectionType inspectionType, InspectionTemplateStatus status, Long id);

    Optional<InspectionTemplate> findByOrganizationIdAndItemIdAndInspectionTypeAndStatus(
            Long organizationId, Long itemId, InspectionType inspectionType, InspectionTemplateStatus status);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(template_code FROM 4) AS INTEGER)), 0) "
            + "FROM inspection_templates "
            + "WHERE organization_id = :orgId AND template_code ~ '^QT-[0-9]+$'",
            nativeQuery = true)
    int findMaxTemplateNumberByOrganizationId(@Param("orgId") Long orgId);
}
