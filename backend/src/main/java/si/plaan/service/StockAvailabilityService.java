package si.plaan.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.entity.FinishedGoodsInspectionStatus;
import si.plaan.entity.IncomingInspectionStatus;
import si.plaan.repository.FinishedGoodsInspectionRepository;
import si.plaan.repository.IncomingInspectionRepository;
import si.plaan.repository.StockMovementRepository;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Available for use = On Hand − Pending Inspection − Rejected.
 * Pending/rejected include both Incoming (IQC) and Finished Goods (FGI) holds.
 * On-hand remains the stock movement ledger (receipts still post full quantity).
 */
@Service
@RequiredArgsConstructor
public class StockAvailabilityService {

    private final StockMovementRepository stockMovementRepository;
    private final IncomingInspectionRepository incomingInspectionRepository;
    private final FinishedGoodsInspectionRepository finishedGoodsInspectionRepository;

    @Transactional(readOnly = true)
    public BigDecimal getOnHand(Long orgId, Long itemId, Long warehouseId) {
        BigDecimal onHand = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgId, itemId, warehouseId);
        return onHand != null ? onHand : BigDecimal.ZERO;
    }

    @Transactional(readOnly = true)
    public BigDecimal getPendingInspection(Long orgId, Long itemId, Long warehouseId) {
        BigDecimal iqc = incomingInspectionRepository.sumReceivedForStatuses(
                orgId, itemId, warehouseId,
                List.of(IncomingInspectionStatus.PENDING, IncomingInspectionStatus.DRAFT));
        BigDecimal fgi = finishedGoodsInspectionRepository.sumReceivedForStatuses(
                orgId, itemId, warehouseId,
                List.of(FinishedGoodsInspectionStatus.PENDING, FinishedGoodsInspectionStatus.DRAFT));
        return nullToZero(iqc).add(nullToZero(fgi));
    }

    @Transactional(readOnly = true)
    public BigDecimal getRejected(Long orgId, Long itemId, Long warehouseId) {
        BigDecimal iqc = incomingInspectionRepository.sumRejectedCompleted(orgId, itemId, warehouseId);
        BigDecimal fgi = finishedGoodsInspectionRepository.sumRejectedCompleted(orgId, itemId, warehouseId);
        return nullToZero(iqc).add(nullToZero(fgi));
    }

    @Transactional(readOnly = true)
    public BigDecimal getAvailable(Long orgId, Long itemId, Long warehouseId) {
        BigDecimal available = getOnHand(orgId, itemId, warehouseId)
                .subtract(getPendingInspection(orgId, itemId, warehouseId))
                .subtract(getRejected(orgId, itemId, warehouseId));
        return available.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : available;
    }

    /** Map key: itemId + ":" + warehouseId → [pending, rejected] */
    @Transactional(readOnly = true)
    public Map<String, BigDecimal[]> getHoldsMap(Long orgId) {
        Map<String, BigDecimal[]> map = new HashMap<>();
        mergeHolds(map, incomingInspectionRepository.sumHoldsByItemAndWarehouse(orgId));
        mergeHolds(map, finishedGoodsInspectionRepository.sumHoldsByItemAndWarehouse(orgId));
        return map;
    }

    private void mergeHolds(Map<String, BigDecimal[]> map, List<Object[]> rows) {
        for (Object[] row : rows) {
            Long itemId = (Long) row[0];
            Long warehouseId = (Long) row[1];
            BigDecimal pending = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            BigDecimal rejected = row[3] != null ? (BigDecimal) row[3] : BigDecimal.ZERO;
            String key = itemId + ":" + warehouseId;
            BigDecimal[] existing = map.getOrDefault(key, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            map.put(key, new BigDecimal[]{
                    existing[0].add(pending),
                    existing[1].add(rejected)
            });
        }
    }

    private static BigDecimal nullToZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
