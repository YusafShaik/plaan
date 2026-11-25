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

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryServiceImpl implements InventoryService {

    private final StockMovementRepository stockMovementRepository;
    private final ItemRepository itemRepository;
    private final WarehouseRepository warehouseRepository;

    @Override
    public PageResponse<StockOverviewItemResponse> getStockOverview(
            Long orgId,
            String search,
            Long warehouseId,
            Pageable pageable
    ) {
        log.info("Fetching stock overview for orgId: {}, search: {}, warehouseId: {}", orgId, search, warehouseId);

        List<StockOverviewItemResponse> allAggregated = stockMovementRepository.aggregateStockOverview(orgId);

        List<StockOverviewItemResponse> filtered = allAggregated.stream()
                .filter(item -> {
                    if (warehouseId != null && !item.warehouseId().equals(warehouseId)) {
                        return false;
                    }
                    if (search != null && !search.trim().isEmpty()) {
                        String query = search.trim().toLowerCase();
                        boolean matchName = item.itemName() != null && item.itemName().toLowerCase().contains(query);
                        boolean matchCode = item.itemCode() != null && item.itemCode().toLowerCase().contains(query);
                        if (!matchName && !matchCode) {
                            return false;
                        }
                    }
                    return true;
                })
                .toList();

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

        List<StockOverviewItemResponse> allAggregated = stockMovementRepository.aggregateStockOverview(orgId);

        long itemsInStock = allAggregated.stream()
                .map(StockOverviewItemResponse::itemId)
                .distinct()
                .count();

        long warehousesWithStock = allAggregated.stream()
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

        // If no item is specified, pick the first item that has stock/movements in the organization
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

        // Fetch movements ordered chronologically (movementDate ASC, id ASC)
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
            boolean isIn = sm.getMovementType() == null
                    || sm.getMovementType().toUpperCase().startsWith("INBOUND")
                    || sm.getMovementType().equalsIgnoreCase("OPENING_STOCK")
                    || sm.getMovementType().equalsIgnoreCase("TRANSFER_IN")
                    || sm.getMovementType().equalsIgnoreCase("ADJUSTMENT_IN")
                    || sm.getMovementType().equalsIgnoreCase("MATERIAL_RETURN")
                    || sm.getMovementType().toUpperCase().contains("RETURN")
                    || sm.getMovementType().equalsIgnoreCase("PRODUCTION_RECEIPT");
            BigDecimal qtyIn = isIn ? sm.getQuantity() : null;
            BigDecimal qtyOut = !isIn ? sm.getQuantity() : null;

            if (isIn) {
                balance = balance.add(sm.getQuantity());
                totalIn = totalIn.add(sm.getQuantity());
            } else {
                balance = balance.subtract(sm.getQuantity());
                totalOut = totalOut.add(sm.getQuantity());
            }

            String transactionType = "Purchase Receipt";
            if (sm.getMovementType() != null && sm.getMovementType().equalsIgnoreCase("OPENING_STOCK")) {
                transactionType = "Opening Stock";
            } else if (sm.getMovementType() != null && (sm.getMovementType().equalsIgnoreCase("TRANSFER_IN") || sm.getMovementType().equalsIgnoreCase("TRANSFER_OUT") || sm.getMovementType().toUpperCase().contains("TRANSFER"))) {
                transactionType = "Stock Transfer";
            } else if (sm.getMovementType() != null && (sm.getMovementType().equalsIgnoreCase("ADJUSTMENT_IN") || sm.getMovementType().equalsIgnoreCase("ADJUSTMENT_OUT") || sm.getMovementType().toUpperCase().contains("ADJUSTMENT"))) {
                transactionType = "Stock Adjustment";
            } else if (sm.getMovementType() != null && sm.getMovementType().toUpperCase().contains("ISSUE")) {
                transactionType = "Material Issue";
            } else if (sm.getMovementType() != null && sm.getMovementType().toUpperCase().contains("RETURN")) {
                transactionType = "Material Return";
            } else if (sm.getMovementType() != null && sm.getMovementType().equalsIgnoreCase("PRODUCTION_RECEIPT")) {
                transactionType = "Production Receipt";
            } else if (sm.getMovementType() != null && (sm.getMovementType().equalsIgnoreCase("SALES_DISPATCH") || sm.getMovementType().toUpperCase().contains("DISPATCH"))) {
                transactionType = "Sales Dispatch";
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
                    transactionType,
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
}
