package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.StockLedgerEntryResponse;
import si.plaan.dto.response.StockLedgerResponse;
import si.plaan.dto.response.StockOverviewItemResponse;
import si.plaan.dto.response.StockOverviewSummaryResponse;
import si.plaan.entity.Item;
import si.plaan.entity.StockMovement;
import si.plaan.entity.Warehouse;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.repository.WarehouseRepository;
import si.plaan.service.InventoryService;
import si.plaan.service.StockAvailabilityService;
import si.plaan.service.support.StockMovementSupport;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryServiceImpl implements InventoryService {

    public static final String STOCK_STATUS_AVAILABLE = "AVAILABLE";
    public static final String STOCK_STATUS_NO_AVAILABLE = "NO_AVAILABLE_STOCK";
    public static final String STOCK_STATUS_QUALITY_HOLD = "QUALITY_HOLD";

    private final StockMovementRepository stockMovementRepository;
    private final ItemRepository itemRepository;
    private final WarehouseRepository warehouseRepository;
    private final StockAvailabilityService stockAvailabilityService;

    @Override
    public List<StockOverviewItemResponse> listStockOverview(
            Long orgId,
            String search,
            Long warehouseId,
            Long itemTypeId,
            String stockStatus
    ) {
        log.info("Listing stock overview for orgId: {}, search: {}, warehouseId: {}, itemTypeId: {}, stockStatus: {}",
                orgId, search, warehouseId, itemTypeId, stockStatus);

        List<StockOverviewItemResponse> allAggregated = enrichWithHolds(
                stockMovementRepository.aggregateStockOverview(orgId), orgId);

        String normalizedStatus = stockStatus != null ? stockStatus.trim().toUpperCase(Locale.ROOT) : null;
        if (normalizedStatus != null
                && !normalizedStatus.isEmpty()
                && !STOCK_STATUS_AVAILABLE.equals(normalizedStatus)
                && !STOCK_STATUS_NO_AVAILABLE.equals(normalizedStatus)
                && !STOCK_STATUS_QUALITY_HOLD.equals(normalizedStatus)) {
            throw new IllegalArgumentException(
                    "Stock status must be AVAILABLE, NO_AVAILABLE_STOCK, or QUALITY_HOLD");
        }

        return allAggregated.stream()
                .filter(item -> matchesFilters(item, search, warehouseId, itemTypeId, normalizedStatus))
                .toList();
    }

    @Override
    public PageResponse<StockOverviewItemResponse> getStockOverview(
            Long orgId,
            String search,
            Long warehouseId,
            Long itemTypeId,
            String stockStatus,
            Pageable pageable
    ) {
        List<StockOverviewItemResponse> filtered = listStockOverview(
                orgId, search, warehouseId, itemTypeId, stockStatus);

        Pageable effectivePageable = pageable != null ? pageable : PageRequest.of(0, Math.max(filtered.size(), 1));
        int pageSize = effectivePageable.getPageSize() > 0 ? effectivePageable.getPageSize() : 10;
        int pageNumber = Math.max(0, effectivePageable.getPageNumber());
        int fromIndex = Math.min(pageNumber * pageSize, filtered.size());
        int toIndex = Math.min(fromIndex + pageSize, filtered.size());

        List<StockOverviewItemResponse> pageContent = filtered.subList(fromIndex, toIndex);
        PageImpl<StockOverviewItemResponse> page = new PageImpl<>(pageContent, effectivePageable, filtered.size());
        return PageResponse.from(page);
    }

    @Override
    public StockOverviewSummaryResponse getStockOverviewSummary(Long orgId) {
        log.info("Fetching stock overview summary for orgId: {}", orgId);

        List<StockOverviewItemResponse> allAggregated = enrichWithHolds(
                stockMovementRepository.aggregateStockOverview(orgId), orgId);

        long itemsInStock = allAggregated.stream()
                .filter(i -> positive(i.onHandQuantity()))
                .map(StockOverviewItemResponse::itemId)
                .distinct()
                .count();

        long warehousesWithStock = allAggregated.stream()
                .filter(i -> positive(i.onHandQuantity()))
                .map(StockOverviewItemResponse::warehouseId)
                .distinct()
                .count();

        return new StockOverviewSummaryResponse(
                itemsInStock,
                warehousesWithStock,
                allAggregated.size()
        );
    }

    @Override
    public StockLedgerResponse getStockLedger(Long orgId, Long itemId, Long warehouseId) {
        log.info("Fetching stock ledger for orgId: {}, itemId: {}, warehouseId: {}", orgId, itemId, warehouseId);

        if (itemId == null) {
            List<StockOverviewItemResponse> stock = stockMovementRepository.aggregateStockOverview(orgId);
            if (!stock.isEmpty()) {
                itemId = stock.get(0).itemId();
            } else {
                List<StockMovement> anyMovements = stockMovementRepository.findStockLedgerMovements(orgId, null, warehouseId);
                if (!anyMovements.isEmpty()) {
                    itemId = anyMovements.get(0).getItem().getId();
                }
            }
        }

        if (itemId == null) {
            return new StockLedgerResponse(
                    null, null, null, warehouseId, "All warehouses", null,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, List.of()
            );
        }

        List<StockMovement> movements = stockMovementRepository.findStockLedgerMovements(orgId, itemId, warehouseId);

        String itemCode = null;
        String itemName = null;
        String uom = null;

        if (!movements.isEmpty()) {
            Item firstItem = movements.get(0).getItem();
            itemCode = firstItem.getItemCode();
            itemName = firstItem.getName();
            uom = firstItem.getUnitOfMeasure();
        } else {
            Item item = itemRepository.findByIdAndOrganizationId(itemId, orgId).orElse(null);
            if (item != null) {
                itemCode = item.getItemCode();
                itemName = item.getName();
                uom = item.getUnitOfMeasure();
            }
        }

        String warehouseName = "All warehouses";
        if (warehouseId != null) {
            Warehouse wh = warehouseRepository.findByIdAndOrganizationId(warehouseId, orgId).orElse(null);
            if (wh != null) {
                warehouseName = wh.getName();
            }
        }

        BigDecimal balance = BigDecimal.ZERO;
        BigDecimal totalIn = BigDecimal.ZERO;
        BigDecimal totalOut = BigDecimal.ZERO;

        List<StockLedgerEntryResponse> entries = new ArrayList<>();
        for (StockMovement sm : movements) {
            boolean isIn = StockMovementSupport.isIncoming(sm.getMovementType());
            BigDecimal qtyIn = isIn ? sm.getQuantity() : null;
            BigDecimal qtyOut = !isIn ? sm.getQuantity() : null;

            if (isIn) {
                balance = balance.add(sm.getQuantity());
                totalIn = totalIn.add(sm.getQuantity());
            } else {
                balance = balance.subtract(sm.getQuantity());
                totalOut = totalOut.add(sm.getQuantity());
            }

            entries.add(new StockLedgerEntryResponse(
                    sm.getId(),
                    sm.getMovementDate(),
                    sm.getReferenceNumber(),
                    sm.getGoodsReceipt() != null ? sm.getGoodsReceipt().getId() : null,
                    sm.getOpeningStock() != null ? sm.getOpeningStock().getId() : null,
                    sm.getStockTransfer() != null ? sm.getStockTransfer().getId() : null,
                    sm.getStockAdjustment() != null ? sm.getStockAdjustment().getId() : null,
                    sm.getMaterialIssue() != null ? sm.getMaterialIssue().getId() : null,
                    sm.getMaterialReturn() != null ? sm.getMaterialReturn().getId() : null,
                    sm.getProductionReceipt() != null ? sm.getProductionReceipt().getId() : null,
                    StockMovementSupport.displayLabel(sm.getMovementType()),
                    sm.getItem().getItemCode(),
                    sm.getItem().getName(),
                    sm.getWarehouse().getWarehouseCode(),
                    sm.getWarehouse().getName(),
                    qtyIn,
                    qtyOut,
                    balance,
                    sm.getUnitOfMeasure(),
                    sm.getCreatedAt()
            ));
        }

        return new StockLedgerResponse(
                itemId,
                itemCode,
                itemName,
                warehouseId,
                warehouseName,
                uom,
                totalIn,
                totalOut,
                balance,
                entries.size(),
                entries
        );
    }

    private boolean matchesFilters(
            StockOverviewItemResponse item,
            String search,
            Long warehouseId,
            Long itemTypeId,
            String stockStatus) {
        if (warehouseId != null && !item.warehouseId().equals(warehouseId)) {
            return false;
        }
        if (itemTypeId != null && (item.itemTypeId() == null || !item.itemTypeId().equals(itemTypeId))) {
            return false;
        }
        if (search != null && !search.trim().isEmpty()) {
            String query = search.trim().toLowerCase(Locale.ROOT);
            boolean matchName = item.itemName() != null && item.itemName().toLowerCase(Locale.ROOT).contains(query);
            boolean matchCode = item.itemCode() != null && item.itemCode().toLowerCase(Locale.ROOT).contains(query);
            if (!matchName && !matchCode) {
                return false;
            }
        }
        if (stockStatus == null || stockStatus.isEmpty()) {
            return true;
        }
        return switch (stockStatus) {
            case STOCK_STATUS_AVAILABLE -> positive(item.availableQuantity());
            case STOCK_STATUS_NO_AVAILABLE -> !positive(item.availableQuantity());
            case STOCK_STATUS_QUALITY_HOLD ->
                    positive(item.pendingInspectionQuantity()) || positive(item.rejectedQuantity());
            default -> true;
        };
    }

    private List<StockOverviewItemResponse> enrichWithHolds(
            List<StockOverviewItemResponse> rows, Long orgId) {
        Map<String, BigDecimal[]> holds = stockAvailabilityService.getHoldsMap(orgId);
        List<StockOverviewItemResponse> enriched = new ArrayList<>(rows.size());
        for (StockOverviewItemResponse row : rows) {
            BigDecimal[] hold = holds.getOrDefault(
                    row.itemId() + ":" + row.warehouseId(),
                    new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            BigDecimal pending = hold[0] != null ? hold[0] : BigDecimal.ZERO;
            BigDecimal rejected = hold[1] != null ? hold[1] : BigDecimal.ZERO;
            BigDecimal onHand = row.onHandQuantity() != null ? row.onHandQuantity() : BigDecimal.ZERO;
            BigDecimal available = onHand.subtract(pending).subtract(rejected);
            if (available.compareTo(BigDecimal.ZERO) < 0) {
                available = BigDecimal.ZERO;
            }
            enriched.add(new StockOverviewItemResponse(
                    row.itemId(),
                    row.itemCode(),
                    row.itemName(),
                    row.itemTypeId(),
                    row.itemTypeName(),
                    row.warehouseId(),
                    row.warehouseCode(),
                    row.warehouseName(),
                    onHand,
                    pending,
                    rejected,
                    available,
                    row.unitOfMeasure()));
        }
        return enriched;
    }

    private static boolean positive(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) > 0;
    }
}
