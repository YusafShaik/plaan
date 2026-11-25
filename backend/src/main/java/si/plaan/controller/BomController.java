package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateBomRequest;
import si.plaan.dto.request.UpdateBomRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.BomResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.BomStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.BomService;

@RestController
@RequestMapping("/api/v1/manufacturing/boms")
@RequiredArgsConstructor
public class BomController {

    private final BomService bomService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BomResponse>>> getBoms(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) BomStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<BomResponse> response = bomService.getBoms(
                userDetails.getOrganizationId(),
                search,
                status,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-code")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextBomCode(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextCode = bomService.getNextBomCode(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextCode)));
    }

    @GetMapping("/active-for-product/{productId}")
    public ResponseEntity<ApiResponse<BomResponse>> getActiveBomForProduct(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long productId) {
        BomResponse response = bomService.getActiveBomForProduct(
                userDetails.getOrganizationId(),
                productId
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BomResponse>> getBomById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        BomResponse response = bomService.getBomById(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BomResponse>> createBom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateBomRequest request) {
        BomResponse response = bomService.createBom(
                userDetails.getOrganizationId(),
                request
        );
        return ResponseEntity.ok(ApiResponse.success("BOM created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BomResponse>> updateBom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateBomRequest request) {
        BomResponse response = bomService.updateBom(
                userDetails.getOrganizationId(),
                id,
                request
        );
        return ResponseEntity.ok(ApiResponse.success("BOM updated successfully", response));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<BomResponse>> activateBom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        BomResponse response = bomService.activateBom(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("BOM activated successfully", response));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<BomResponse>> deactivateBom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        BomResponse response = bomService.deactivateBom(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("BOM deactivated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDraftBom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        bomService.deleteDraftBom(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Draft BOM deleted successfully", null));
    }
}
