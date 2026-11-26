package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.Equipment;
import si.plaan.entity.EquipmentOperationalStatus;
import si.plaan.entity.EquipmentRecordStatus;

import java.util.Optional;

@Repository
public interface EquipmentRepository
        extends JpaRepository<Equipment, Long>, JpaSpecificationExecutor<Equipment> {

    Optional<Equipment> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndEquipmentCodeIgnoreCase(Long organizationId, String equipmentCode);

    boolean existsByOrganizationIdAndEquipmentCodeIgnoreCaseAndIdNot(
            Long organizationId, String equipmentCode, Long id);

    long countByOrganizationIdAndRecordStatus(Long organizationId, EquipmentRecordStatus recordStatus);

    long countByOrganizationIdAndRecordStatusAndOperationalStatus(
            Long organizationId,
            EquipmentRecordStatus recordStatus,
            EquipmentOperationalStatus operationalStatus);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(equipment_code FROM 4) AS INTEGER)), 0) "
            + "FROM equipment "
            + "WHERE organization_id = :orgId AND equipment_code ~ '^EQ-[0-9]+$'",
            nativeQuery = true)
    int findMaxEquipmentNumberByOrganizationId(@Param("orgId") Long orgId);
}
