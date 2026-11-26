package si.plaan.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.StockLock;

import java.util.Optional;

@Repository
public interface StockLockRepository extends JpaRepository<StockLock, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT s FROM StockLock s
        WHERE s.organization.id = :orgId
          AND s.item.id = :itemId
          AND s.warehouse.id = :warehouseId
        """)
    Optional<StockLock> findForUpdate(
            @Param("orgId") Long orgId,
            @Param("itemId") Long itemId,
            @Param("warehouseId") Long warehouseId);
}
