package si.plaan.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import si.plaan.dto.response.*;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.InventoryService;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping("/stock-overview")
    public ResponseEntity<ApiResponse<PageResponse<StockOverviewItemResponse>>> getStockOverview(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "itemCode") String sortBy,
            @RequestParam(defaultValue = "asc") String direction
    ) {
        Sort sort = "desc".equalsIgnoreCase(direction) ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<StockOverviewItemResponse> response = inventoryService.getStockOverview(
                userDetails.getOrganizationId(),
                search,
                warehouseId,
                null,
                null,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/stock-overview/summary")
    public ResponseEntity<ApiResponse<StockOverviewSummaryResponse>> getStockOverviewSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        StockOverviewSummaryResponse summary = inventoryService.getStockOverviewSummary(
                userDetails.getOrganizationId()
        );

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/stock-ledger")
    public ResponseEntity<ApiResponse<StockLedgerResponse>> getStockLedger(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) Long warehouseId
    ) {
        StockLedgerResponse response = inventoryService.getStockLedger(
                userDetails.getOrganizationId(),
                itemId,
                warehouseId
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
