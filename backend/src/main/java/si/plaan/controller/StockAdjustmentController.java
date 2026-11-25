package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateStockAdjustmentRequest;
import si.plaan.dto.request.UpdateStockAdjustmentRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.StockAdjustmentStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.StockAdjustmentService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory/stock-adjustments")
@RequiredArgsConstructor
public class StockAdjustmentController {

    private final StockAdjustmentService stockAdjustmentService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<StockAdjustmentResponse>>> getStockAdjustments(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) StockAdjustmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<StockAdjustmentResponse> response = stockAdjustmentService.getStockAdjustments(
                userDetails.getOrganizationId(),
                search,
                status,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextAdjustmentNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = stockAdjustmentService.getNextAdjustmentNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/warehouse-stock/{warehouseId}")
    public ResponseEntity<ApiResponse<List<ItemOnHandStockResponse>>> getWarehouseStock(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long warehouseId) {
        List<ItemOnHandStockResponse> stock = stockAdjustmentService.getWarehouseStock(
                userDetails.getOrganizationId(),
                warehouseId
        );
        return ResponseEntity.ok(ApiResponse.success(stock));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StockAdjustmentResponse>> getStockAdjustmentById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        StockAdjustmentResponse response = stockAdjustmentService.getStockAdjustmentById(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StockAdjustmentResponse>> createStockAdjustment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateStockAdjustmentRequest request) {
        StockAdjustmentResponse response = stockAdjustmentService.createStockAdjustment(
                userDetails.getOrganizationId(),
                request
        );
        return ResponseEntity.ok(ApiResponse.success("Stock adjustment created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StockAdjustmentResponse>> updateStockAdjustment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateStockAdjustmentRequest request) {
        StockAdjustmentResponse response = stockAdjustmentService.updateStockAdjustment(
                userDetails.getOrganizationId(),
                id,
                request
        );
        return ResponseEntity.ok(ApiResponse.success("Stock adjustment updated successfully", response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<StockAdjustmentResponse>> postStockAdjustment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        StockAdjustmentResponse response = stockAdjustmentService.postStockAdjustment(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Stock adjustment posted successfully", response));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<StockAdjustmentResponse>> cancelStockAdjustment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        StockAdjustmentResponse response = stockAdjustmentService.cancelStockAdjustment(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Stock adjustment cancelled successfully", response));
    }
}
