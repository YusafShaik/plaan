package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateMaterialReturnRequest;
import si.plaan.dto.request.UpdateMaterialReturnRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.MaterialReturnResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.entity.MaterialReturnStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.MaterialReturnService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/manufacturing/material-returns")
@RequiredArgsConstructor
public class MaterialReturnController {

    private final MaterialReturnService materialReturnService;

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextReturnNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = materialReturnService.getNextReturnNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/by-production-order/{productionOrderId}")
    public ResponseEntity<ApiResponse<List<MaterialReturnResponse>>> getMaterialReturnsByProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long productionOrderId) {
        List<MaterialReturnResponse> response = materialReturnService.getMaterialReturnsByProductionOrder(
                userDetails.getOrganizationId(),
                productionOrderId
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MaterialReturnResponse>> getMaterialReturnById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        MaterialReturnResponse response = materialReturnService.getMaterialReturnById(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MaterialReturnResponse>> createMaterialReturn(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateMaterialReturnRequest request) {
        MaterialReturnResponse response = materialReturnService.createMaterialReturn(
                userDetails.getOrganizationId(),
                request
        );
        String msg = response.getStatus() == MaterialReturnStatus.POSTED
                ? "Material return posted successfully"
                : "Draft material return saved successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MaterialReturnResponse>> updateMaterialReturn(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateMaterialReturnRequest request) {
        MaterialReturnResponse response = materialReturnService.updateMaterialReturn(
                userDetails.getOrganizationId(),
                id,
                request
        );
        String msg = response.getStatus() == MaterialReturnStatus.POSTED
                ? "Material return updated and posted successfully"
                : "Draft material return updated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<MaterialReturnResponse>> postMaterialReturn(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        MaterialReturnResponse response = materialReturnService.postMaterialReturn(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Material return posted successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDraftMaterialReturn(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        materialReturnService.deleteDraftMaterialReturn(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Draft material return deleted successfully", null));
    }
}
