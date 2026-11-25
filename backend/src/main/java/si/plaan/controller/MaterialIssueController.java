package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateMaterialIssueRequest;
import si.plaan.dto.request.UpdateMaterialIssueRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.MaterialIssueResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.MaterialIssueStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.MaterialIssueService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/manufacturing/material-issues")
@RequiredArgsConstructor
public class MaterialIssueController {

    private final MaterialIssueService materialIssueService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<MaterialIssueResponse>>> getMaterialIssues(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long productionOrderId,
            @RequestParam(required = false) MaterialIssueStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<MaterialIssueResponse> response = materialIssueService.getMaterialIssues(
                userDetails.getOrganizationId(),
                productionOrderId,
                status,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextMaterialIssueNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = materialIssueService.getNextMaterialIssueNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MaterialIssueResponse>> getMaterialIssueById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        MaterialIssueResponse response = materialIssueService.getMaterialIssueById(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/by-production-order/{productionOrderId}")
    public ResponseEntity<ApiResponse<List<MaterialIssueResponse>>> getMaterialIssuesByProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long productionOrderId) {
        List<MaterialIssueResponse> response = materialIssueService.getMaterialIssuesByProductionOrder(
                userDetails.getOrganizationId(),
                productionOrderId
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MaterialIssueResponse>> createMaterialIssue(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateMaterialIssueRequest request) {
        MaterialIssueResponse response = materialIssueService.createMaterialIssue(
                userDetails.getOrganizationId(),
                request
        );
        String msg = response.getStatus() == MaterialIssueStatus.POSTED
                ? "Material issue posted successfully"
                : "Draft material issue saved successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MaterialIssueResponse>> updateMaterialIssue(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateMaterialIssueRequest request) {
        MaterialIssueResponse response = materialIssueService.updateMaterialIssue(
                userDetails.getOrganizationId(),
                id,
                request
        );
        String msg = response.getStatus() == MaterialIssueStatus.POSTED
                ? "Material issue updated and posted successfully"
                : "Draft material issue updated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<MaterialIssueResponse>> postMaterialIssue(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        MaterialIssueResponse response = materialIssueService.postMaterialIssue(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Material issue posted successfully. Inventory movements recorded.", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDraftMaterialIssue(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        materialIssueService.deleteDraftMaterialIssue(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Draft material issue deleted successfully", null));
    }
}
