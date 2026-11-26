package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateInspectionTemplateRequest;
import si.plaan.dto.request.UpdateInspectionTemplateRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.InspectionTemplateResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.InspectionTemplateStatus;
import si.plaan.entity.InspectionType;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.InspectionTemplateService;

@RestController
@RequestMapping("/api/v1/quality/inspection-templates")
@RequiredArgsConstructor
public class InspectionTemplateController {

    private final InspectionTemplateService inspectionTemplateService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<InspectionTemplateResponse>>> list(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) InspectionTemplateStatus status,
            @RequestParam(required = false) InspectionType inspectionType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        return ResponseEntity.ok(ApiResponse.success(inspectionTemplateService.getTemplates(
                userDetails.getOrganizationId(), search, status, inspectionType, pageable)));
    }

    @GetMapping("/next-code")
    public ResponseEntity<ApiResponse<NextCodeResponse>> nextCode(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                new NextCodeResponse(inspectionTemplateService.getNextTemplateCode(userDetails.getOrganizationId()))));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<InspectionTemplateResponse>> getActive(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long itemId,
            @RequestParam InspectionType inspectionType) {
        return ResponseEntity.ok(ApiResponse.success(
                inspectionTemplateService.getActiveForItemAndType(
                        userDetails.getOrganizationId(), itemId, inspectionType)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InspectionTemplateResponse>> getById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                inspectionTemplateService.getById(userDetails.getOrganizationId(), id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<InspectionTemplateResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateInspectionTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Inspection template created",
                inspectionTemplateService.create(userDetails.getOrganizationId(), request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<InspectionTemplateResponse>> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateInspectionTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Inspection template updated",
                inspectionTemplateService.update(userDetails.getOrganizationId(), id, request)));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<InspectionTemplateResponse>> activate(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Inspection template activated",
                inspectionTemplateService.activate(userDetails.getOrganizationId(), id)));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<InspectionTemplateResponse>> deactivate(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Inspection template deactivated",
                inspectionTemplateService.deactivate(userDetails.getOrganizationId(), id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        inspectionTemplateService.deleteDraft(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Draft inspection template deleted", null));
    }
}
