package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.StockLedgerResponse;
import si.plaan.dto.response.StockOverviewItemResponse;
import si.plaan.dto.response.StockOverviewSummaryResponse;

import java.util.List;

public interface InventoryService {

    /**
     * Filtered stock rows (item × warehouse) using posted movements + quality holds.
     * Includes previously stocked combinations even when on-hand is currently zero.
     */
    List<StockOverviewItemResponse> listStockOverview(
            Long orgId,
            String search,
            Long warehouseId,
            Long itemTypeId,
            String stockStatus
    );

    PageResponse<StockOverviewItemResponse> getStockOverview(
            Long orgId,
            String search,
            Long warehouseId,
            Long itemTypeId,
            String stockStatus,
            Pageable pageable
    );

    StockOverviewSummaryResponse getStockOverviewSummary(Long orgId);

    StockLedgerResponse getStockLedger(Long orgId, Long itemId, Long warehouseId);
}
