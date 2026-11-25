package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateStockTransferRequest;
import si.plaan.dto.request.UpdateStockTransferRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.StockTransferStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.StockTransferService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory/stock-transfers")
@RequiredArgsConstructor
public class StockTransferController {

    private final StockTransferService stockTransferService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<StockTransferResponse>>> getStockTransfers(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) StockTransferStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<StockTransferResponse> response = stockTransferService.getStockTransfers(
                userDetails.getOrganizationId(),
                search,
                status,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextTransferNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = stockTransferService.getNextTransferNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/warehouse-stock/{warehouseId}")
    public ResponseEntity<ApiResponse<List<ItemOnHandStockResponse>>> getWarehouseStock(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long warehouseId) {
        List<ItemOnHandStockResponse> stock = stockTransferService.getWarehouseStock(
                userDetails.getOrganizationId(),
                warehouseId
        );
        return ResponseEntity.ok(ApiResponse.success(stock));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StockTransferResponse>> getStockTransferById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        StockTransferResponse response = stockTransferService.getStockTransferById(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StockTransferResponse>> createStockTransfer(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateStockTransferRequest request) {
        StockTransferResponse response = stockTransferService.createStockTransfer(
                userDetails.getOrganizationId(),
                request
        );
        return ResponseEntity.ok(ApiResponse.success("Stock transfer created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StockTransferResponse>> updateStockTransfer(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateStockTransferRequest request) {
        StockTransferResponse response = stockTransferService.updateStockTransfer(
                userDetails.getOrganizationId(),
                id,
                request
        );
        return ResponseEntity.ok(ApiResponse.success("Stock transfer updated successfully", response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<StockTransferResponse>> postStockTransfer(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        StockTransferResponse response = stockTransferService.postStockTransfer(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Stock transfer posted successfully", response));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<StockTransferResponse>> cancelStockTransfer(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        StockTransferResponse response = stockTransferService.cancelStockTransfer(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Stock transfer cancelled successfully", response));
    }
}
