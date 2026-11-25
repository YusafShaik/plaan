package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateOpeningStockRequest;
import si.plaan.dto.request.UpdateOpeningStockRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.OpeningStockResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.OpeningStockStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.OpeningStockService;

@RestController
@RequestMapping("/api/v1/inventory/opening-stock")
@RequiredArgsConstructor
public class OpeningStockController {

    private final OpeningStockService openingStockService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OpeningStockResponse>>> getOpeningStocks(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) OpeningStockStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<OpeningStockResponse> response = openingStockService.getOpeningStocks(
                userDetails.getOrganizationId(),
                search,
                status,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextOpeningStockNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = openingStockService.getNextOpeningStockNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OpeningStockResponse>> getOpeningStockById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        OpeningStockResponse response = openingStockService.getOpeningStockById(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OpeningStockResponse>> createOpeningStock(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateOpeningStockRequest request) {
        OpeningStockResponse response = openingStockService.createOpeningStock(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Opening stock created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OpeningStockResponse>> updateOpeningStock(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateOpeningStockRequest request) {
        OpeningStockResponse response = openingStockService.updateOpeningStock(userDetails.getOrganizationId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Opening stock updated successfully", response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<OpeningStockResponse>> postOpeningStock(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        OpeningStockResponse response = openingStockService.postOpeningStock(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Opening stock posted successfully", response));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OpeningStockResponse>> cancelOpeningStock(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        OpeningStockResponse response = openingStockService.cancelOpeningStock(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Opening stock cancelled successfully", response));
    }
}
