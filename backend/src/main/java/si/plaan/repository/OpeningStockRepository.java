package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.OpeningStock;

import java.util.Optional;

@Repository
public interface OpeningStockRepository extends JpaRepository<OpeningStock, Long>, JpaSpecificationExecutor<OpeningStock> {

    Optional<OpeningStock> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndOpeningStockNumber(Long organizationId, String openingStockNumber);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(opening_stock_number FROM 4) AS INTEGER)), 0) " +
                   "FROM opening_stocks " +
                   "WHERE organization_id = :orgId AND opening_stock_number ~ '^OS-[0-9]+$'",
           nativeQuery = true)
    int findMaxOpeningStockNumberByOrganizationId(@Param("orgId") Long orgId);
}
