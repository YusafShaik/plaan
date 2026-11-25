package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateGoodsReceiptRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.GoodsReceiptStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.GoodsReceiptService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/procurement/goods-receipts")
@RequiredArgsConstructor
public class GoodsReceiptController {

    private final GoodsReceiptService goodsReceiptService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<GoodsReceiptResponse>>> getGoodsReceipts(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) GoodsReceiptStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<GoodsReceiptResponse> response = goodsReceiptService.getGoodsReceipts(
                userDetails.getOrganizationId(),
                search,
                status,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextGrnNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = goodsReceiptService.getNextGrnNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<GoodsReceiptSummaryResponse>> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        GoodsReceiptSummaryResponse summary = goodsReceiptService.getSummary(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/eligible-pos")
    public ResponseEntity<ApiResponse<List<PoEligibleForGrnResponse>>> getEligiblePurchaseOrders(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<PoEligibleForGrnResponse> eligiblePos = goodsReceiptService.getEligiblePurchaseOrders(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(eligiblePos));
    }

    @GetMapping("/po-details/{poId}")
    public ResponseEntity<ApiResponse<PoEligibleForGrnResponse>> getPurchaseOrderDetailsForGrn(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long poId) {
        PoEligibleForGrnResponse details = goodsReceiptService.getPurchaseOrderDetailsForGrn(userDetails.getOrganizationId(), poId);
        return ResponseEntity.ok(ApiResponse.success(details));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GoodsReceiptResponse>> getGoodsReceiptById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        GoodsReceiptResponse response = goodsReceiptService.getGoodsReceiptById(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<GoodsReceiptResponse>> createGoodsReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateGoodsReceiptRequest request) {
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Goods receipt created successfully", response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<GoodsReceiptResponse>> postGoodsReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        GoodsReceiptResponse response = goodsReceiptService.postGoodsReceipt(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Goods receipt posted successfully", response));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<GoodsReceiptResponse>> cancelGoodsReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        GoodsReceiptResponse response = goodsReceiptService.cancelGoodsReceipt(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Goods receipt cancelled successfully", response));
    }

    @GetMapping("/movements")
    public ResponseEntity<ApiResponse<PageResponse<StockMovementResponse>>> getStockMovements(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<StockMovementResponse> response = goodsReceiptService.getStockMovements(
                userDetails.getOrganizationId(),
                search,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/movements/po/{poId}")
    public ResponseEntity<ApiResponse<List<StockMovementResponse>>> getStockMovementsForPo(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long poId) {
        List<StockMovementResponse> movements = goodsReceiptService.getStockMovementsForPo(userDetails.getOrganizationId(), poId);
        return ResponseEntity.ok(ApiResponse.success(movements));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadGoodsReceiptPdf(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        byte[] pdfBytes = goodsReceiptService.generateGoodsReceiptPdf(userDetails.getOrganizationId(), id);
        GoodsReceiptResponse grn = goodsReceiptService.getGoodsReceiptById(userDetails.getOrganizationId(), id);
        String filename = (grn.grnNumber() != null ? grn.grnNumber() : ("grn-" + id)) + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdfBytes.length)
                .body(pdfBytes);
    }
}
