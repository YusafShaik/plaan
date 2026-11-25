package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreatePurchaseOrderRequest;
import si.plaan.dto.request.UpdatePurchaseOrderRequest;
import si.plaan.dto.request.UpdatePurchaseOrderStatusRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.PurchaseOrderResponse;
import si.plaan.dto.response.PurchaseOrderSummaryResponse;
import si.plaan.entity.PurchaseOrderStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.PurchaseOrderService;

@RestController
@RequestMapping("/api/v1/procurement/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PurchaseOrderResponse>>> getPurchaseOrders(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) PurchaseOrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<PurchaseOrderResponse> response = purchaseOrderService.getPurchaseOrders(
                userDetails.getOrganizationId(),
                search,
                status,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextPoNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = purchaseOrderService.getNextPoNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<PurchaseOrderSummaryResponse>> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        PurchaseOrderSummaryResponse summary = purchaseOrderService.getSummary(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> getPurchaseOrderById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        PurchaseOrderResponse response = purchaseOrderService.getPurchaseOrderById(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> createPurchaseOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreatePurchaseOrderRequest request) {
        PurchaseOrderResponse response = purchaseOrderService.createPurchaseOrder(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Purchase order created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> updatePurchaseOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePurchaseOrderRequest request) {
        PurchaseOrderResponse response = purchaseOrderService.updatePurchaseOrder(userDetails.getOrganizationId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Purchase order updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> updateStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePurchaseOrderStatusRequest request) {
        PurchaseOrderResponse response = purchaseOrderService.updateStatus(userDetails.getOrganizationId(), id, request.status());
        return ResponseEntity.ok(ApiResponse.success("Purchase order status updated successfully", response));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPurchaseOrderPdf(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        byte[] pdfBytes = purchaseOrderService.generatePurchaseOrderPdf(userDetails.getOrganizationId(), id);
        PurchaseOrderResponse po = purchaseOrderService.getPurchaseOrderById(userDetails.getOrganizationId(), id);
        String filename = (po.poNumber() != null ? po.poNumber() : ("po-" + id)) + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdfBytes.length)
                .body(pdfBytes);
    }
}
