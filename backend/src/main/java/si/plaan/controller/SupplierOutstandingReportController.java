package si.plaan.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.SupplierOutstandingReportResponse;
import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.entity.InvoicePaymentStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.SupplierOutstandingReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/supplier-outstanding")
@RequiredArgsConstructor
public class SupplierOutstandingReportController {

    private final SupplierOutstandingReportService supplierOutstandingReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<SupplierOutstandingReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) LocalDate invoiceFrom,
            @RequestParam(required = false) LocalDate invoiceTo,
            @RequestParam(required = false) LocalDate dueFrom,
            @RequestParam(required = false) LocalDate dueTo,
            @RequestParam(required = false) InvoicePaymentStatus paymentStatus,
            @RequestParam(required = false) DeliveryScheduleStatus dueStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(ApiResponse.success(supplierOutstandingReportService.getReport(
                userDetails.getOrganizationId(),
                supplierId,
                invoiceFrom,
                invoiceTo,
                dueFrom,
                dueTo,
                paymentStatus,
                dueStatus,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) LocalDate invoiceFrom,
            @RequestParam(required = false) LocalDate invoiceTo,
            @RequestParam(required = false) LocalDate dueFrom,
            @RequestParam(required = false) LocalDate dueTo,
            @RequestParam(required = false) InvoicePaymentStatus paymentStatus,
            @RequestParam(required = false) DeliveryScheduleStatus dueStatus) {

        byte[] csv = supplierOutstandingReportService.exportCsv(
                userDetails.getOrganizationId(),
                supplierId,
                invoiceFrom,
                invoiceTo,
                dueFrom,
                dueTo,
                paymentStatus,
                dueStatus);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("supplier_outstanding.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
