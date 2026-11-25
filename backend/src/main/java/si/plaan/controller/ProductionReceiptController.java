package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.CreateProductionReceiptRequest;
import si.plaan.dto.request.UpdateProductionReceiptRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.ProductionReceiptResponse;
import si.plaan.entity.ProductionReceiptStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.ProductionReceiptService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/manufacturing/production-receipts")
@RequiredArgsConstructor
public class ProductionReceiptController {

    private final ProductionReceiptService productionReceiptService;

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextReceiptNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = productionReceiptService.getNextReceiptNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/by-production-order/{productionOrderId}")
    public ResponseEntity<ApiResponse<List<ProductionReceiptResponse>>> getProductionReceiptsByProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long productionOrderId) {
        List<ProductionReceiptResponse> response = productionReceiptService.getProductionReceiptsByProductionOrder(
                userDetails.getOrganizationId(),
                productionOrderId
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductionReceiptResponse>> getProductionReceiptById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        ProductionReceiptResponse response = productionReceiptService.getProductionReceiptById(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductionReceiptResponse>> createProductionReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateProductionReceiptRequest request) {
        ProductionReceiptResponse response = productionReceiptService.createProductionReceipt(
                userDetails.getOrganizationId(),
                request
        );
        String msg = response.getStatus() == ProductionReceiptStatus.POSTED
                ? "Production receipt posted successfully"
                : "Draft production receipt saved successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductionReceiptResponse>> updateProductionReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateProductionReceiptRequest request) {
        ProductionReceiptResponse response = productionReceiptService.updateProductionReceipt(
                userDetails.getOrganizationId(),
                id,
                request
        );
        String msg = response.getStatus() == ProductionReceiptStatus.POSTED
                ? "Production receipt updated and posted successfully"
                : "Draft production receipt updated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<ProductionReceiptResponse>> postProductionReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        ProductionReceiptResponse response = productionReceiptService.postProductionReceipt(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Production receipt posted successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDraftProductionReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        productionReceiptService.deleteDraftProductionReceipt(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Draft production receipt deleted successfully", null));
    }
}
