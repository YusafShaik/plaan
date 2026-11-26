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
import si.plaan.dto.request.CreatePurchaseInvoiceRequest;
import si.plaan.dto.request.UpdatePurchaseInvoiceRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.PurchaseInvoiceStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.PurchaseInvoiceService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/finance/purchase-invoices")
@RequiredArgsConstructor
public class PurchaseInvoiceController {

    private final PurchaseInvoiceService purchaseInvoiceService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PurchaseInvoiceResponse>>> getPurchaseInvoices(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) PurchaseInvoiceStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<PurchaseInvoiceResponse> response = purchaseInvoiceService.getPurchaseInvoices(
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
        String nextNumber = purchaseInvoiceService.getNextInvoiceNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<PurchaseInvoiceSummaryResponse>> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        PurchaseInvoiceSummaryResponse summary = purchaseInvoiceService.getSummary(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/eligible-grns")
    public ResponseEntity<ApiResponse<List<EligibleGrnResponse>>> getEligibleGoodsReceipts(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<EligibleGrnResponse> eligible = purchaseInvoiceService.getEligibleGoodsReceipts(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(eligible));
    }

    @GetMapping("/grn-details/{grnId}")
    public ResponseEntity<ApiResponse<EligibleGrnResponse>> getGoodsReceiptDetailsForInvoice(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long grnId) {
        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(userDetails.getOrganizationId(), grnId);
        return ResponseEntity.ok(ApiResponse.success(details));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseInvoiceResponse>> getPurchaseInvoiceById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        PurchaseInvoiceResponse response = purchaseInvoiceService.getPurchaseInvoiceById(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PurchaseInvoiceResponse>> createPurchaseInvoice(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreatePurchaseInvoiceRequest request) {
        PurchaseInvoiceResponse response = purchaseInvoiceService.createPurchaseInvoice(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Purchase invoice created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseInvoiceResponse>> updatePurchaseInvoice(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdatePurchaseInvoiceRequest request) {
        PurchaseInvoiceResponse response = purchaseInvoiceService.updatePurchaseInvoice(userDetails.getOrganizationId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Purchase invoice updated successfully", response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<PurchaseInvoiceResponse>> postPurchaseInvoice(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        PurchaseInvoiceResponse response = purchaseInvoiceService.postPurchaseInvoice(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Purchase invoice posted successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePurchaseInvoice(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        purchaseInvoiceService.deletePurchaseInvoice(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Purchase invoice deleted successfully", null));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        byte[] pdfBytes = purchaseInvoiceService.generateInvoicePdf(userDetails.getOrganizationId(), id);
        PurchaseInvoiceResponse invoice = purchaseInvoiceService.getPurchaseInvoiceById(userDetails.getOrganizationId(), id);
        String filename = (invoice.invoiceNumber() != null ? invoice.invoiceNumber() : ("invoice-" + id)) + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdfBytes.length)
                .body(pdfBytes);
    }

    @GetMapping("/{id}/attachment")
    public ResponseEntity<byte[]> downloadAttachment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        PurchaseInvoiceService.AttachmentData attachment = purchaseInvoiceService.getAttachment(userDetails.getOrganizationId(), id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, si.plaan.util.DownloadHeaders.contentDisposition(attachment.fileName()))
                .contentType(MediaType.parseMediaType(attachment.contentType()))
                .contentLength(attachment.bytes().length)
                .body(attachment.bytes());
    }
}
