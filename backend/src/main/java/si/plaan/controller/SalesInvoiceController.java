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
import si.plaan.dto.request.CreateSalesInvoiceRequest;
import si.plaan.dto.request.UpdateSalesInvoiceRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.SalesInvoiceStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.SalesInvoiceService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/finance/sales-invoices")
@RequiredArgsConstructor
public class SalesInvoiceController {

    private final SalesInvoiceService salesInvoiceService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SalesInvoiceResponse>>> getSalesInvoices(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) SalesInvoiceStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<SalesInvoiceResponse> response = salesInvoiceService.getSalesInvoices(
                userDetails.getOrganizationId(),
                search,
                status,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextInvoiceNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = salesInvoiceService.getNextInvoiceNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<SalesInvoiceSummaryResponse>> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        SalesInvoiceSummaryResponse summary = salesInvoiceService.getSummary(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/eligible-dispatches")
    public ResponseEntity<ApiResponse<List<EligibleDispatchResponse>>> getEligibleDispatches(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<EligibleDispatchResponse> eligible =
                salesInvoiceService.getEligibleDispatches(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(eligible));
    }

    @GetMapping("/dispatch-details/{dispatchId}")
    public ResponseEntity<ApiResponse<EligibleDispatchResponse>> getDispatchDetailsForInvoice(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long dispatchId) {
        EligibleDispatchResponse details = salesInvoiceService.getDispatchDetailsForInvoice(
                userDetails.getOrganizationId(), dispatchId);
        return ResponseEntity.ok(ApiResponse.success(details));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SalesInvoiceResponse>> getSalesInvoiceById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        SalesInvoiceResponse response = salesInvoiceService.getSalesInvoiceById(
                userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SalesInvoiceResponse>> createSalesInvoice(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateSalesInvoiceRequest request) {
        SalesInvoiceResponse response = salesInvoiceService.createSalesInvoice(
                userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Sales invoice created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SalesInvoiceResponse>> updateSalesInvoice(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateSalesInvoiceRequest request) {
        SalesInvoiceResponse response = salesInvoiceService.updateSalesInvoice(
                userDetails.getOrganizationId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Sales invoice updated successfully", response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<SalesInvoiceResponse>> postSalesInvoice(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        SalesInvoiceResponse response = salesInvoiceService.postSalesInvoice(
                userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Sales invoice posted successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSalesInvoice(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        salesInvoiceService.deleteSalesInvoice(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Sales invoice deleted successfully", null));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        byte[] pdfBytes = salesInvoiceService.generateInvoicePdf(userDetails.getOrganizationId(), id);
        SalesInvoiceResponse invoice = salesInvoiceService.getSalesInvoiceById(
                userDetails.getOrganizationId(), id);
        String filename = (invoice.invoiceNumber() != null ? invoice.invoiceNumber() : ("invoice-" + id)) + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdfBytes.length)
                .body(pdfBytes);
    }
}
