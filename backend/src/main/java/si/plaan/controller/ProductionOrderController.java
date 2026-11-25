package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import si.plaan.dto.request.CloseProductionOrderRequest;
import si.plaan.dto.request.CreateProductionOrderRequest;
import si.plaan.dto.request.UpdateProductionOrderRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.MaterialRequirementPreviewResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.ProductionOrderAvailabilityResponse;
import si.plaan.dto.response.ProductionOrderClosureValidationResponse;
import si.plaan.dto.response.ProductionOrderResponse;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.ProductionOrderService;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/manufacturing/production-orders")
@RequiredArgsConstructor
public class ProductionOrderController {

    private final ProductionOrderService productionOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductionOrderResponse>>> getProductionOrders(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ProductionOrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<ProductionOrderResponse> response = productionOrderService.getProductionOrders(
                userDetails.getOrganizationId(),
                search,
                status,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextProductionOrderNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextNumber = productionOrderService.getNextProductionOrderNumber(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextNumber)));
    }

    @GetMapping("/preview-requirements")
    public ResponseEntity<ApiResponse<MaterialRequirementPreviewResponse>> previewRequirements(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long productId,
            @RequestParam(defaultValue = "1") BigDecimal productionQuantity) {
        MaterialRequirementPreviewResponse response = productionOrderService.previewRequirements(
                userDetails.getOrganizationId(),
                productId,
                productionQuantity
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductionOrderResponse>> getProductionOrderById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        ProductionOrderResponse response = productionOrderService.getProductionOrderById(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping({"/{id}/availability", "/{id}/material-availability"})
    public ResponseEntity<ApiResponse<ProductionOrderAvailabilityResponse>> checkMaterialAvailability(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        ProductionOrderAvailabilityResponse response = productionOrderService.checkMaterialAvailability(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductionOrderResponse>> createProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateProductionOrderRequest request) {
        ProductionOrderResponse response = productionOrderService.createProductionOrder(
                userDetails.getOrganizationId(),
                request
        );
        return ResponseEntity.ok(ApiResponse.success("Production order created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductionOrderResponse>> updateProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateProductionOrderRequest request) {
        ProductionOrderResponse response = productionOrderService.updateProductionOrder(
                userDetails.getOrganizationId(),
                id,
                request
        );
        return ResponseEntity.ok(ApiResponse.success("Production order updated successfully", response));
    }

    @PostMapping("/{id}/release")
    public ResponseEntity<ApiResponse<ProductionOrderResponse>> releaseProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        ProductionOrderResponse response = productionOrderService.releaseProductionOrder(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Production order released successfully", response));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<ProductionOrderResponse>> cancelProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        ProductionOrderResponse response = productionOrderService.cancelProductionOrder(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Production order cancelled successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDraftProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        productionOrderService.deleteDraftProductionOrder(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success("Draft production order deleted successfully", null));
    }

    @GetMapping("/{id}/transactions")
    public ResponseEntity<ApiResponse<List<si.plaan.dto.response.MaterialTransactionResponse>>> getMaterialTransactions(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        List<si.plaan.dto.response.MaterialTransactionResponse> response = productionOrderService.getMaterialTransactions(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<ProductionOrderResponse>> completeProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        String email = userDetails != null ? userDetails.getUsername() : "User";
        ProductionOrderResponse response = productionOrderService.completeProductionOrder(
                userDetails.getOrganizationId(),
                id,
                email
        );
        return ResponseEntity.ok(ApiResponse.success("Production completed successfully", response));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<ApiResponse<ProductionOrderResponse>> closeProductionOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @RequestBody(required = false) CloseProductionOrderRequest request) {
        String email = userDetails != null ? userDetails.getUsername() : "User";
        ProductionOrderResponse response = productionOrderService.closeProductionOrder(
                userDetails.getOrganizationId(),
                id,
                request,
                email
        );
        return ResponseEntity.ok(ApiResponse.success("Production order closed successfully", response));
    }

    @GetMapping("/{id}/closure-validation")
    public ResponseEntity<ApiResponse<ProductionOrderClosureValidationResponse>> getClosureValidation(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        ProductionOrderClosureValidationResponse response = productionOrderService.getClosureValidation(
                userDetails.getOrganizationId(),
                id
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
