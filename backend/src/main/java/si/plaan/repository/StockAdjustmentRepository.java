package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.StockAdjustment;

import java.util.Optional;

@Repository
public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Long>, JpaSpecificationExecutor<StockAdjustment> {

    Optional<StockAdjustment> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndAdjustmentNumber(Long organizationId, String adjustmentNumber);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(adjustment_number FROM 4) AS INTEGER)), 0) " +
                   "FROM stock_adjustments " +
                   "WHERE organization_id = :orgId AND adjustment_number ~ '^SA-[0-9]+$'",
           nativeQuery = true)
    int findMaxAdjustmentNumberByOrganizationId(@Param("orgId") Long orgId);
}
