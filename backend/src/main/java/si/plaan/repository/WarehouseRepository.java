package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.Warehouse;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Long>, JpaSpecificationExecutor<Warehouse> {

    Optional<Warehouse> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndWarehouseCodeIgnoreCase(Long organizationId, String warehouseCode);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndActive(Long organizationId, boolean active);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(warehouse_code FROM 4) AS INTEGER)), 0) FROM warehouses WHERE organization_id = :orgId AND warehouse_code ~ '^WH-[0-9]+$'", nativeQuery = true)
    int findMaxWarehouseNumberByOrganizationId(@Param("orgId") Long orgId);
}
