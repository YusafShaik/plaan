package si.plaan.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.entity.Item;
import si.plaan.entity.Organization;
import si.plaan.entity.StockLock;
import si.plaan.entity.Warehouse;
import si.plaan.repository.StockLockRepository;

/**
 * Serializes stock check-then-write for one item×warehouse within a transaction.
 */
@Service
@RequiredArgsConstructor
public class StockLockService {

    private final StockLockRepository stockLockRepository;

    @Transactional
    public void lockItemWarehouse(Organization org, Item item, Warehouse warehouse) {
        Long orgId = org.getId();
        Long itemId = item.getId();
        Long warehouseId = warehouse.getId();

        if (stockLockRepository.findForUpdate(orgId, itemId, warehouseId).isPresent()) {
            return;
        }

        try {
            stockLockRepository.saveAndFlush(StockLock.builder()
                    .organization(org)
                    .item(item)
                    .warehouse(warehouse)
                    .build());
        } catch (DataIntegrityViolationException ignored) {
            // Concurrent insert won — fall through to lock the existing row
        }

        stockLockRepository.findForUpdate(orgId, itemId, warehouseId)
                .orElseThrow(() -> new IllegalStateException(
                        "Failed to acquire stock lock for item " + itemId + " warehouse " + warehouseId));
    }
}
