package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateMaterialConsumptionRequest;
import si.plaan.dto.request.UpdateMaterialConsumptionRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.MaterialConsumptionResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.entity.MaterialConsumptionStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.MaterialConsumptionService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/manufacturing/material-consumptions")
@RequiredArgsConstructor
public class MaterialConsumptionController {

    private final MaterialConsumptionService materialConsumptionService;

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextConsumptionNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = materialConsumptionService.getNextConsumptionNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/by-production-order/{productionOrderId}")
    public ResponseEntity<ApiResponse<List<MaterialConsumptionResponse>>> getMaterialConsumptionsByProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long productionOrderId) {
        List<MaterialConsumptionResponse> response = materialConsumptionService.getMaterialConsumptionsByProductionOrder(
                userDetails.getOrganizationId(),
                productionOrderId
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MaterialConsumptionResponse>> getMaterialConsumptionById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        MaterialConsumptionResponse response = materialConsumptionService.getMaterialConsumptionById(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MaterialConsumptionResponse>> createMaterialConsumption(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateMaterialConsumptionRequest request) {
        MaterialConsumptionResponse response = materialConsumptionService.createMaterialConsumption(
                userDetails.getOrganizationId(),
                request
        );
        String msg = response.getStatus() == MaterialConsumptionStatus.POSTED
                ? "Material consumption posted successfully"
                : "Draft material consumption saved successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MaterialConsumptionResponse>> updateMaterialConsumption(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateMaterialConsumptionRequest request) {
        MaterialConsumptionResponse response = materialConsumptionService.updateMaterialConsumption(
                userDetails.getOrganizationId(),
                id,
                request
        );
        String msg = response.getStatus() == MaterialConsumptionStatus.POSTED
                ? "Material consumption updated and posted successfully"
                : "Draft material consumption updated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<MaterialConsumptionResponse>> postMaterialConsumption(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        MaterialConsumptionResponse response = materialConsumptionService.postMaterialConsumption(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Material consumption posted successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDraftMaterialConsumption(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        materialConsumptionService.deleteDraftMaterialConsumption(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Draft material consumption deleted successfully", null));
    }
}
