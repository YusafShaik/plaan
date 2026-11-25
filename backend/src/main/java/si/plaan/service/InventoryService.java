package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.StockLedgerResponse;
import si.plaan.dto.response.StockOverviewItemResponse;
import si.plaan.dto.response.StockOverviewSummaryResponse;

public interface InventoryService {

    PageResponse<StockOverviewItemResponse> getStockOverview(
            Long orgId,
            String search,
            Long warehouseId,
            Pageable pageable
    );

    StockOverviewSummaryResponse getStockOverviewSummary(Long orgId);

    StockLedgerResponse getStockLedger(Long orgId, Long itemId, Long warehouseId);
}
