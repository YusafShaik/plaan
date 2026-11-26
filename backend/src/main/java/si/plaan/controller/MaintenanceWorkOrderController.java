package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CompleteMaintenanceWorkOrderRequest;
import si.plaan.dto.request.CreateMaintenanceWorkOrderRequest;
import si.plaan.dto.request.StartMaintenanceWorkOrderRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.EquipmentMaintenanceHistoryItemResponse;
import si.plaan.dto.response.MaintenanceWorkOrderResponse;
import si.plaan.dto.response.MaintenanceWorkOrderSummaryResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.MaintenanceWorkOrderStatus;
import si.plaan.entity.MaintenanceWorkOrderType;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.MaintenanceWorkOrderService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/maintenance/work-orders")
@RequiredArgsConstructor
public class MaintenanceWorkOrderController {

    private final MaintenanceWorkOrderService workOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<MaintenanceWorkOrderResponse>>> list(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) MaintenanceWorkOrderStatus status,
            @RequestParam(required = false) MaintenanceWorkOrderType type,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "workOrderDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        return ResponseEntity.ok(ApiResponse.success(workOrderService.getWorkOrders(
                userDetails.getOrganizationId(), search, status, type, equipmentId, pageable)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<MaintenanceWorkOrderSummaryResponse>> summary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                workOrderService.getSummary(userDetails.getOrganizationId())));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> nextNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                new NextCodeResponse(workOrderService.getNextWorkOrderNumber(userDetails.getOrganizationId()))));
    }

    @GetMapping("/history/by-equipment/{equipmentId}")
    public ResponseEntity<ApiResponse<List<EquipmentMaintenanceHistoryItemResponse>>> history(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long equipmentId) {
        return ResponseEntity.ok(ApiResponse.success(
                workOrderService.getHistoryByEquipment(userDetails.getOrganizationId(), equipmentId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MaintenanceWorkOrderResponse>> getById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                workOrderService.getById(userDetails.getOrganizationId(), id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MaintenanceWorkOrderResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateMaintenanceWorkOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Maintenance work order created",
                workOrderService.create(userDetails.getOrganizationId(), request)));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<MaintenanceWorkOrderResponse>> start(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @RequestBody(required = false) StartMaintenanceWorkOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Maintenance started",
                workOrderService.start(userDetails.getOrganizationId(), id,
                        request != null ? request : new StartMaintenanceWorkOrderRequest(null, null))));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<MaintenanceWorkOrderResponse>> complete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody CompleteMaintenanceWorkOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Maintenance completed",
                workOrderService.complete(userDetails.getOrganizationId(), id, request)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<MaintenanceWorkOrderResponse>> cancel(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Work order cancelled",
                workOrderService.cancel(userDetails.getOrganizationId(), id)));
    }
}
