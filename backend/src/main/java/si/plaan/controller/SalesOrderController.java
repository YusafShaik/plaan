package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import si.plaan.dto.request.CreateSalesOrderRequest;
import si.plaan.dto.request.UpdateSalesOrderRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.SalesOrderResponse;
import si.plaan.dto.response.SalesOrderStockAvailabilityResponse;
import si.plaan.dto.response.SalesOrderSummaryResponse;
import si.plaan.entity.SalesOrderStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.SalesOrderService;

@RestController
@RequestMapping("/api/v1/sales/orders")
@RequiredArgsConstructor
public class SalesOrderController {

    private final SalesOrderService salesOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SalesOrderResponse>>> getSalesOrders(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) SalesOrderStatus status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<SalesOrderResponse> response = salesOrderService.getSalesOrders(
                userDetails.getOrganizationId(),
                search,
                status,
                customerId,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = salesOrderService.getNextSalesOrderNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<SalesOrderSummaryResponse>> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        SalesOrderSummaryResponse summary = salesOrderService.getSummary(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> getSalesOrderById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        SalesOrderResponse response = salesOrderService.getSalesOrderById(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}/stock-availability")
    public ResponseEntity<ApiResponse<SalesOrderStockAvailabilityResponse>> checkStockAvailability(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        SalesOrderStockAvailabilityResponse response = salesOrderService.checkStockAvailability(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SalesOrderResponse>> createSalesOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateSalesOrderRequest request) {
        SalesOrderResponse response = salesOrderService.createSalesOrder(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Sales order created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> updateSalesOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateSalesOrderRequest request) {
        SalesOrderResponse response = salesOrderService.updateSalesOrder(userDetails.getOrganizationId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Sales order updated successfully", response));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> confirmSalesOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        SalesOrderResponse response = salesOrderService.confirmSalesOrder(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Sales order confirmed successfully", response));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> cancelSalesOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        SalesOrderResponse response = salesOrderService.cancelSalesOrder(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Sales order cancelled successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSalesOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        salesOrderService.deleteSalesOrder(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Sales order deleted successfully", null));
    }
}
