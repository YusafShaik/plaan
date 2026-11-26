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
import si.plaan.dto.response.MaterialConsumptionReportResponse;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.MaterialConsumptionReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/material-consumption")
@RequiredArgsConstructor
public class MaterialConsumptionReportController {

    private final MaterialConsumptionReportService materialConsumptionReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<MaterialConsumptionReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long productionOrderId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long materialId,
            @RequestParam(required = false) Long sourceWarehouseId,
            @RequestParam(required = false) ProductionOrderStatus status,
            @RequestParam(required = false) Boolean unreconciledOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(ApiResponse.success(materialConsumptionReportService.getReport(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                productionOrderId,
                productId,
                materialId,
                sourceWarehouseId,
                status,
                unreconciledOnly,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long productionOrderId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long materialId,
            @RequestParam(required = false) Long sourceWarehouseId,
            @RequestParam(required = false) ProductionOrderStatus status,
            @RequestParam(required = false) Boolean unreconciledOnly) {

        byte[] csv = materialConsumptionReportService.exportCsv(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                productionOrderId,
                productId,
                materialId,
                sourceWarehouseId,
                status,
                unreconciledOnly);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("material_consumption.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
