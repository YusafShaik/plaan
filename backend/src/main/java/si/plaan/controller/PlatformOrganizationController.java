package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import si.plaan.dto.request.CreateOrganizationRequest;
import si.plaan.dto.request.UpdateOrganizationStatusRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.OrganizationResponse;
import si.plaan.service.PlatformOrganizationService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/platform/organizations")
@RequiredArgsConstructor
public class PlatformOrganizationController {

    private final PlatformOrganizationService platformOrganizationService;

    @GetMapping
    @PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<List<OrganizationResponse>>> getAllOrganizations() {
        List<OrganizationResponse> organizations = platformOrganizationService.getAllOrganizations();
        return ResponseEntity.ok(ApiResponse.success(organizations));
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<OrganizationResponse>> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request) {
        OrganizationResponse response = platformOrganizationService.createOrganization(request);
        return ResponseEntity.ok(ApiResponse.success("Organization created successfully", response));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<OrganizationResponse>> updateOrganizationStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrganizationStatusRequest request) {
        OrganizationResponse response = platformOrganizationService.updateOrganizationStatus(id, request);
        return ResponseEntity.ok(ApiResponse.success("Organization status updated successfully", response));
    }
}
