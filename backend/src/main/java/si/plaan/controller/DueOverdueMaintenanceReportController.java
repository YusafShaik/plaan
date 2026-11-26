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
import si.plaan.dto.response.DueOverdueMaintenanceReportResponse;
import si.plaan.entity.MaintenanceScheduleStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.DueOverdueMaintenanceReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/due-overdue-maintenance")
@RequiredArgsConstructor
public class DueOverdueMaintenanceReportController {

    private final DueOverdueMaintenanceReportService dueOverdueMaintenanceReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<DueOverdueMaintenanceReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) MaintenanceScheduleStatus dueStatus,
            @RequestParam(required = false) LocalDate nextDueFrom,
            @RequestParam(required = false) LocalDate nextDueTo,
            @RequestParam(required = false) String workOrderStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(ApiResponse.success(dueOverdueMaintenanceReportService.getReport(
                userDetails.getOrganizationId(),
                equipmentId,
                dueStatus,
                nextDueFrom,
                nextDueTo,
                workOrderStatus,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) MaintenanceScheduleStatus dueStatus,
            @RequestParam(required = false) LocalDate nextDueFrom,
            @RequestParam(required = false) LocalDate nextDueTo,
            @RequestParam(required = false) String workOrderStatus) {

        byte[] csv = dueOverdueMaintenanceReportService.exportCsv(
                userDetails.getOrganizationId(),
                equipmentId,
                dueStatus,
                nextDueFrom,
                nextDueTo,
                workOrderStatus);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("due_overdue_maintenance.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
