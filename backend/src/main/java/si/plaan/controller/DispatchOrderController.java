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
import si.plaan.dto.request.CreateDispatchOrderRequest;
import si.plaan.dto.request.UpdateDispatchOrderRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.DispatchOrderResponse;
import si.plaan.dto.response.DispatchPrepareResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.DispatchOrderStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.DispatchOrderService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dispatch/orders")
@RequiredArgsConstructor
public class DispatchOrderController {

    private final DispatchOrderService dispatchOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DispatchOrderResponse>>> getDispatchOrders(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) DispatchOrderStatus status,
            @RequestParam(required = false) Long salesOrderId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<DispatchOrderResponse> response = dispatchOrderService.getDispatchOrders(
                userDetails.getOrganizationId(),
                search,
                status,
                salesOrderId,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = dispatchOrderService.getNextDispatchNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/prepare")
    public ResponseEntity<ApiResponse<DispatchPrepareResponse>> prepareDispatch(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long salesOrderId) {
        DispatchPrepareResponse response = dispatchOrderService.prepareDispatchForSalesOrder(
                userDetails.getOrganizationId(), salesOrderId
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/by-sales-order/{salesOrderId}")
    public ResponseEntity<ApiResponse<List<DispatchOrderResponse>>> getBySalesOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long salesOrderId) {
        List<DispatchOrderResponse> response = dispatchOrderService.getDispatchOrdersBySalesOrder(
                userDetails.getOrganizationId(), salesOrderId
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DispatchOrderResponse>> getDispatchOrderById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        DispatchOrderResponse response = dispatchOrderService.getDispatchOrderById(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DispatchOrderResponse>> createDispatchOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateDispatchOrderRequest request) {
        DispatchOrderResponse response = dispatchOrderService.createDispatchOrder(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Dispatch order created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DispatchOrderResponse>> updateDispatchOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateDispatchOrderRequest request) {
        DispatchOrderResponse response = dispatchOrderService.updateDispatchOrder(userDetails.getOrganizationId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Dispatch order updated successfully", response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<DispatchOrderResponse>> postDispatchOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        DispatchOrderResponse response = dispatchOrderService.postDispatchOrder(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Dispatch order posted successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDispatchOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        dispatchOrderService.deleteDispatchOrder(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Dispatch order deleted successfully", null));
    }
}
