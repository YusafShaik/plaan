package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateMaintenancePlanRequest;
import si.plaan.dto.request.UpdateMaintenancePlanRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.MaintenancePlanResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.MaintenancePlanStatus;
import si.plaan.entity.MaintenanceScheduleStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.MaintenancePlanService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/maintenance/plans")
@RequiredArgsConstructor
public class MaintenancePlanController {

    private final MaintenancePlanService maintenancePlanService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<MaintenancePlanResponse>>> list(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) MaintenancePlanStatus status,
            @RequestParam(required = false) MaintenanceScheduleStatus scheduleStatus,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "nextDueDate") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        Sort sort = "desc".equalsIgnoreCase(direction) ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        return ResponseEntity.ok(ApiResponse.success(maintenancePlanService.getPlans(
                userDetails.getOrganizationId(), search, status, scheduleStatus, equipmentId, pageable)));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> nextNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                new NextCodeResponse(maintenancePlanService.getNextPlanNumber(userDetails.getOrganizationId()))));
    }

    @GetMapping("/by-equipment/{equipmentId}")
    public ResponseEntity<ApiResponse<List<MaintenancePlanResponse>>> byEquipment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long equipmentId) {
        return ResponseEntity.ok(ApiResponse.success(
                maintenancePlanService.getPlansByEquipment(userDetails.getOrganizationId(), equipmentId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MaintenancePlanResponse>> getById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                maintenancePlanService.getById(userDetails.getOrganizationId(), id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MaintenancePlanResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateMaintenancePlanRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Maintenance plan created",
                maintenancePlanService.create(userDetails.getOrganizationId(), request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MaintenancePlanResponse>> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateMaintenancePlanRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Maintenance plan updated",
                maintenancePlanService.update(userDetails.getOrganizationId(), id, request)));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<MaintenancePlanResponse>> activate(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Maintenance plan activated",
                maintenancePlanService.activate(userDetails.getOrganizationId(), id)));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<MaintenancePlanResponse>> deactivate(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Maintenance plan deactivated",
                maintenancePlanService.deactivate(userDetails.getOrganizationId(), id)));
    }
}
