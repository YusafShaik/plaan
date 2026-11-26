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
import si.plaan.dto.response.StockSummaryReportResponse;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.StockSummaryReportService;
import si.plaan.util.DownloadHeaders;

@RestController
@RequestMapping("/api/v1/reports/stock-summary")
@RequiredArgsConstructor
public class StockSummaryReportController {

    private final StockSummaryReportService stockSummaryReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<StockSummaryReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long itemTypeId,
            @RequestParam(required = false) String stockStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(ApiResponse.success(stockSummaryReportService.getReport(
                userDetails.getOrganizationId(),
                search,
                warehouseId,
                itemTypeId,
                stockStatus,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long itemTypeId,
            @RequestParam(required = false) String stockStatus) {

        byte[] csv = stockSummaryReportService.exportCsv(
                userDetails.getOrganizationId(),
                search,
                warehouseId,
                itemTypeId,
                stockStatus);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("stock_summary.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
