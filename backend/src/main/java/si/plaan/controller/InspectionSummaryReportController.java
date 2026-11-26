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
import si.plaan.dto.response.InspectionSummaryReportResponse;
import si.plaan.entity.InspectionType;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.InspectionSummaryReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/inspection-summary")
@RequiredArgsConstructor
public class InspectionSummaryReportController {

    private final InspectionSummaryReportService inspectionSummaryReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<InspectionSummaryReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) InspectionType inspectionType,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(ApiResponse.success(inspectionSummaryReportService.getReport(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                inspectionType,
                itemId,
                warehouseId,
                status,
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
            @RequestParam(required = false) String status) {

        byte[] csv = inspectionSummaryReportService.exportCsv(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                inspectionType,
                itemId,
                warehouseId,
                status);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("inspection_summary.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
