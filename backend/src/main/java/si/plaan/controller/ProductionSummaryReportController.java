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
import si.plaan.dto.response.ProductionSummaryReportResponse;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.ProductionSummaryReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/production-summary")
@RequiredArgsConstructor
public class ProductionSummaryReportController {

    private final ProductionSummaryReportService productionSummaryReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<ProductionSummaryReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long sourceWarehouseId,
            @RequestParam(required = false) Long finishedGoodsWarehouseId,
            @RequestParam(required = false) ProductionOrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.max(1, size),
                Sort.by(Sort.Direction.DESC, "orderDate", "id"));

        return ResponseEntity.ok(ApiResponse.success(productionSummaryReportService.getReport(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                productId,
                sourceWarehouseId,
                finishedGoodsWarehouseId,
                status,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long sourceWarehouseId,
            @RequestParam(required = false) Long finishedGoodsWarehouseId,
            @RequestParam(required = false) ProductionOrderStatus status) {

        byte[] csv = productionSummaryReportService.exportCsv(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                productId,
                sourceWarehouseId,
                finishedGoodsWarehouseId,
                status);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("production_summary.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
