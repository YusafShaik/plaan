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
import si.plaan.dto.response.RejectionReportResponse;
import si.plaan.entity.InspectionType;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.RejectionReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/rejection-report")
@RequiredArgsConstructor
public class RejectionReportController {

    private final RejectionReportService rejectionReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<RejectionReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) InspectionType inspectionType,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long productionOrderId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(ApiResponse.success(rejectionReportService.getReport(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                inspectionType,
                itemId,
                warehouseId,
                supplierId,
                productionOrderId,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) InspectionType inspectionType,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long productionOrderId) {

        byte[] csv = rejectionReportService.exportCsv(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                inspectionType,
                itemId,
                warehouseId,
                supplierId,
                productionOrderId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("rejection_report.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
