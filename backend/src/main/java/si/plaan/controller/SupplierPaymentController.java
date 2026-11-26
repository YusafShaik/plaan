package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateSupplierPaymentRequest;
import si.plaan.dto.request.UpdateSupplierPaymentRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.SupplierPaymentStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.SupplierPaymentService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/finance/supplier-payments")
@RequiredArgsConstructor
public class SupplierPaymentController {

    private final SupplierPaymentService supplierPaymentService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SupplierPaymentResponse>>> getPayments(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) SupplierPaymentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        return ResponseEntity.ok(ApiResponse.success(
                supplierPaymentService.getPayments(
                        userDetails.getOrganizationId(), search, status, pageable)));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextPaymentNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String next = supplierPaymentService.getNextPaymentNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(next)));
    }

    @GetMapping("/eligible-invoices")
    public ResponseEntity<ApiResponse<List<EligiblePurchaseInvoiceResponse>>> getEligibleInvoices(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                supplierPaymentService.getEligibleInvoices(userDetails.getOrganizationId())));
    }

    @GetMapping("/invoice-details/{invoiceId}")
    public ResponseEntity<ApiResponse<EligiblePurchaseInvoiceResponse>> getInvoiceDetails(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long invoiceId) {
        return ResponseEntity.ok(ApiResponse.success(
                supplierPaymentService.getInvoiceDetailsForPayment(
                        userDetails.getOrganizationId(), invoiceId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierPaymentResponse>> getPaymentById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                supplierPaymentService.getPaymentById(userDetails.getOrganizationId(), id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupplierPaymentResponse>> createPayment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateSupplierPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Supplier payment created successfully",
                supplierPaymentService.createPayment(userDetails.getOrganizationId(), request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierPaymentResponse>> updatePayment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateSupplierPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Supplier payment updated successfully",
                supplierPaymentService.updatePayment(userDetails.getOrganizationId(), id, request)));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<SupplierPaymentResponse>> postPayment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Supplier payment posted successfully",
                supplierPaymentService.postPayment(userDetails.getOrganizationId(), id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePayment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        supplierPaymentService.deletePayment(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Supplier payment deleted successfully", null));
    }
}
