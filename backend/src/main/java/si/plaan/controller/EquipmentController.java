package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateEquipmentRequest;
import si.plaan.dto.request.UpdateEquipmentRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.EquipmentResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.EquipmentOperationalStatus;
import si.plaan.entity.EquipmentRecordStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.EquipmentService;

@RestController
@RequestMapping("/api/v1/maintenance/equipment")
@RequiredArgsConstructor
public class EquipmentController {

    private final EquipmentService equipmentService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<EquipmentResponse>>> list(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) EquipmentOperationalStatus operationalStatus,
            @RequestParam(required = false) EquipmentRecordStatus recordStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        return ResponseEntity.ok(ApiResponse.success(equipmentService.getEquipment(
                userDetails.getOrganizationId(), search, operationalStatus, recordStatus, pageable)));
    }

    @GetMapping("/next-code")
    public ResponseEntity<ApiResponse<NextCodeResponse>> nextCode(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                new NextCodeResponse(equipmentService.getNextEquipmentCode(userDetails.getOrganizationId()))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EquipmentResponse>> getById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                equipmentService.getById(userDetails.getOrganizationId(), id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<EquipmentResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateEquipmentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Equipment registered",
                equipmentService.create(userDetails.getOrganizationId(), request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EquipmentResponse>> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateEquipmentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Equipment updated",
                equipmentService.update(userDetails.getOrganizationId(), id, request)));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<EquipmentResponse>> activate(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Equipment activated",
                equipmentService.activate(userDetails.getOrganizationId(), id)));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<EquipmentResponse>> deactivate(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Equipment deactivated",
                equipmentService.deactivate(userDetails.getOrganizationId(), id)));
    }
}
