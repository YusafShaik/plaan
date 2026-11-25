package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.StockTransfer;

import java.util.Optional;

@Repository
public interface StockTransferRepository extends JpaRepository<StockTransfer, Long>, JpaSpecificationExecutor<StockTransfer> {

    Optional<StockTransfer> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndTransferNumber(Long organizationId, String transferNumber);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(transfer_number FROM 4) AS INTEGER)), 0) " +
                   "FROM stock_transfers " +
                   "WHERE organization_id = :orgId AND transfer_number ~ '^ST-[0-9]+$'",
           nativeQuery = true)
    int findMaxTransferNumberByOrganizationId(@Param("orgId") Long orgId);
}
