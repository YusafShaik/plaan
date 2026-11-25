package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CloseProductionOrderRequest;
import si.plaan.dto.request.CreateProductionOrderRequest;
import si.plaan.dto.request.UpdateProductionOrderRequest;
import si.plaan.dto.response.MaterialRequirementPreviewResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.ProductionOrderAvailabilityResponse;
import si.plaan.dto.response.ProductionOrderClosureValidationResponse;
import si.plaan.dto.response.ProductionOrderResponse;
import si.plaan.entity.ProductionOrderStatus;

import java.math.BigDecimal;

public interface ProductionOrderService {

    PageResponse<ProductionOrderResponse> getProductionOrders(
            Long orgId,
            String search,
            ProductionOrderStatus status,
            Pageable pageable
    );

    ProductionOrderResponse getProductionOrderById(Long orgId, Long id);

    ProductionOrderAvailabilityResponse checkMaterialAvailability(Long orgId, Long id);

    String getNextProductionOrderNumber(Long orgId);

    ProductionOrderResponse createProductionOrder(Long orgId, CreateProductionOrderRequest request);

    ProductionOrderResponse updateProductionOrder(Long orgId, Long id, UpdateProductionOrderRequest request);

    ProductionOrderResponse releaseProductionOrder(Long orgId, Long id);

    ProductionOrderResponse cancelProductionOrder(Long orgId, Long id);

    void deleteDraftProductionOrder(Long orgId, Long id);

    MaterialRequirementPreviewResponse previewRequirements(Long orgId, Long productId, BigDecimal productionQuantity);

    java.util.List<si.plaan.dto.response.MaterialTransactionResponse> getMaterialTransactions(Long orgId, Long id);

    ProductionOrderResponse completeProductionOrder(Long orgId, Long id, String userEmail);

    ProductionOrderResponse closeProductionOrder(Long orgId, Long id, CloseProductionOrderRequest request, String userEmail);

    ProductionOrderClosureValidationResponse getClosureValidation(Long orgId, Long id);
}
