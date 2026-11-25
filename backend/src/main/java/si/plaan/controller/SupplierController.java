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
import si.plaan.dto.request.CreateSupplierRequest;
import si.plaan.dto.request.UpdateSupplierRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.SupplierResponse;
import si.plaan.dto.response.SupplierSummaryResponse;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.SupplierService;

@RestController
@RequestMapping("/api/v1/master-data/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SupplierResponse>>> getSuppliers(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<SupplierResponse> response = supplierService.getSuppliers(
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
        String nextCode = supplierService.getNextSupplierCode(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextCode)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<SupplierSummaryResponse>> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        SupplierSummaryResponse summary = supplierService.getSummary(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierResponse>> getSupplierById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        SupplierResponse response = supplierService.getSupplierById(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupplierResponse>> createSupplier(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateSupplierRequest request) {
        SupplierResponse response = supplierService.createSupplier(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Supplier created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierResponse>> updateSupplier(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateSupplierRequest request) {
        SupplierResponse response = supplierService.updateSupplier(userDetails.getOrganizationId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Supplier updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<SupplierResponse>> toggleStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        SupplierResponse response = supplierService.toggleStatus(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Supplier status updated successfully", response));
    }
}
