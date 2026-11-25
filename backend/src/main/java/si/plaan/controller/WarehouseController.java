package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.UpdateWarehouseRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.dto.response.WarehouseSummaryResponse;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.WarehouseService;

@RestController
@RequestMapping("/api/v1/master-data/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<WarehouseResponse>>> getWarehouses(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<WarehouseResponse> response = warehouseService.getWarehouses(
                userDetails.getOrganizationId(),
                search,
                active,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-code")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextCode(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextCode = warehouseService.getNextWarehouseCode(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextCode)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<WarehouseSummaryResponse>> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        WarehouseSummaryResponse summary = warehouseService.getSummary(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WarehouseResponse>> getWarehouseById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        WarehouseResponse response = warehouseService.getWarehouseById(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WarehouseResponse>> createWarehouse(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateWarehouseRequest request) {
        WarehouseResponse response = warehouseService.createWarehouse(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Warehouse created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WarehouseResponse>> updateWarehouse(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateWarehouseRequest request) {
        WarehouseResponse response = warehouseService.updateWarehouse(userDetails.getOrganizationId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Warehouse updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<WarehouseResponse>> toggleStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        WarehouseResponse response = warehouseService.toggleStatus(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Warehouse status updated successfully", response));
    }
}
