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
import si.plaan.dto.response.StockMovementsReportResponse;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.StockMovementsReportService;
import si.plaan.util.DownloadHeaders;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports/stock-movements")
@RequiredArgsConstructor
public class StockMovementsReportController {

    private final StockMovementsReportService stockMovementsReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<StockMovementsReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String movementType,
            @RequestParam(required = false) String reference,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(ApiResponse.success(stockMovementsReportService.getReport(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                itemId,
                warehouseId,
                movementType,
                reference,
                pageable)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String movementType,
            @RequestParam(required = false) String reference) {

        byte[] csv = stockMovementsReportService.exportCsv(
                userDetails.getOrganizationId(),
                fromDate,
                toDate,
                itemId,
                warehouseId,
                movementType,
                reference);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        DownloadHeaders.contentDisposition("stock_movements.csv"))
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
