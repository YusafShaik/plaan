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
import si.plaan.dto.response.PendingPurchaseOrderReportResponse;
import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.PendingPurchaseOrderReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/pending-purchase-orders")
@RequiredArgsConstructor
public class PendingPurchaseOrderReportController {

    private final PendingPurchaseOrderReportService pendingPurchaseOrderReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<PendingPurchaseOrderReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) DeliveryScheduleStatus deliveryStatus,
            @RequestParam(required = false) LocalDate expectedFrom,
            @RequestParam(required = false) LocalDate expectedTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(ApiResponse.success(pendingPurchaseOrderReportService.getReport(
                userDetails.getOrganizationId(),
                supplierId,
                itemId,
                warehouseId,
                deliveryStatus,
                expectedFrom,
                expectedTo,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) DeliveryScheduleStatus deliveryStatus,
            @RequestParam(required = false) LocalDate expectedFrom,
            @RequestParam(required = false) LocalDate expectedTo) {

        byte[] csv = pendingPurchaseOrderReportService.exportCsv(
                userDetails.getOrganizationId(),
                supplierId,
                itemId,
                warehouseId,
                deliveryStatus,
                expectedFrom,
                expectedTo);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("pending_purchase_orders.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
