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
import si.plaan.dto.response.EquipmentDowntimeReportResponse;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.EquipmentDowntimeReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/equipment-downtime")
@RequiredArgsConstructor
public class EquipmentDowntimeReportController {

    private final EquipmentDowntimeReportService equipmentDowntimeReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<EquipmentDowntimeReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) String restorationStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(ApiResponse.success(equipmentDowntimeReportService.getReport(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                equipmentId,
                restorationStatus,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) String restorationStatus) {

        byte[] csv = equipmentDowntimeReportService.exportCsv(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                equipmentId,
                restorationStatus);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("equipment_downtime.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
