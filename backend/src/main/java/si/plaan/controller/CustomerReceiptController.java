package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateCustomerReceiptRequest;
import si.plaan.dto.request.UpdateCustomerReceiptRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.CustomerReceiptStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.CustomerReceiptService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/finance/customer-receipts")
@RequiredArgsConstructor
public class CustomerReceiptController {

    private final CustomerReceiptService customerReceiptService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CustomerReceiptResponse>>> getReceipts(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CustomerReceiptStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);
        return ResponseEntity.ok(ApiResponse.success(
                customerReceiptService.getReceipts(userDetails.getOrganizationId(), search, status, pageable)));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextReceiptNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                new NextCodeResponse(customerReceiptService.getNextReceiptNumber(userDetails.getOrganizationId()))));
    }

    @GetMapping("/eligible-invoices")
    public ResponseEntity<ApiResponse<List<EligibleSalesInvoiceResponse>>> getEligibleInvoices(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                customerReceiptService.getEligibleInvoices(userDetails.getOrganizationId())));
    }

    @GetMapping("/invoice-details/{invoiceId}")
    public ResponseEntity<ApiResponse<EligibleSalesInvoiceResponse>> getInvoiceDetails(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long invoiceId) {
        return ResponseEntity.ok(ApiResponse.success(
                customerReceiptService.getInvoiceDetailsForReceipt(userDetails.getOrganizationId(), invoiceId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerReceiptResponse>> getReceiptById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                customerReceiptService.getReceiptById(userDetails.getOrganizationId(), id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerReceiptResponse>> createReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateCustomerReceiptRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Customer receipt created successfully",
                customerReceiptService.createReceipt(userDetails.getOrganizationId(), request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerReceiptResponse>> updateReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateCustomerReceiptRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Customer receipt updated successfully",
                customerReceiptService.updateReceipt(userDetails.getOrganizationId(), id, request)));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<CustomerReceiptResponse>> postReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Customer receipt posted successfully",
                customerReceiptService.postReceipt(userDetails.getOrganizationId(), id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        customerReceiptService.deleteReceipt(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Customer receipt deleted successfully", null));
    }
}
