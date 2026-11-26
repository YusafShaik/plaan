package si.plaan.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.PurchaseSummaryReportResponse;
import si.plaan.entity.PurchaseOrderStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.PurchaseSummaryReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/purchase-summary")
@RequiredArgsConstructor
public class PurchaseSummaryReportController {

    private final PurchaseSummaryReportService purchaseSummaryReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<PurchaseSummaryReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) PurchaseOrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.max(1, size),
                Sort.by(Sort.Direction.DESC, "orderDate", "id"));

        return ResponseEntity.ok(ApiResponse.success(purchaseSummaryReportService.getReport(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                supplierId,
                warehouseId,
                status,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) PurchaseOrderStatus status) {

        byte[] csv = purchaseSummaryReportService.exportCsv(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                supplierId,
                warehouseId,
                status);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("purchase_summary.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
