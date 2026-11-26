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
import si.plaan.dto.response.MaintenanceHistoryReportResponse;
import si.plaan.entity.MaintenanceWorkOrderType;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.MaintenanceHistoryReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/maintenance-history")
@RequiredArgsConstructor
public class MaintenanceHistoryReportController {

    private final MaintenanceHistoryReportService maintenanceHistoryReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<MaintenanceHistoryReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) MaintenanceWorkOrderType maintenanceType,
            @RequestParam(required = false) String technician,
            @RequestParam(required = false) Boolean machineOperational,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(ApiResponse.success(maintenanceHistoryReportService.getReport(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                equipmentId,
                maintenanceType,
                technician,
                machineOperational,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) MaintenanceWorkOrderType maintenanceType,
            @RequestParam(required = false) String technician,
            @RequestParam(required = false) Boolean machineOperational) {

        byte[] csv = maintenanceHistoryReportService.exportCsv(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                equipmentId,
                maintenanceType,
                technician,
                machineOperational);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("maintenance_history.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
