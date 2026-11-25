package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.Supplier;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long>, JpaSpecificationExecutor<Supplier> {

    Optional<Supplier> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndSupplierCodeIgnoreCase(Long organizationId, String supplierCode);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndActive(Long organizationId, boolean active);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(supplier_code FROM 5) AS INTEGER)), 0) FROM suppliers WHERE organization_id = :orgId AND supplier_code ~ '^SUP-[0-9]+$'", nativeQuery = true)
    int findMaxSupplierNumberByOrganizationId(@Param("orgId") Long orgId);
}
