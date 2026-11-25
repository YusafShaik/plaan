package si.plaan.service;

import si.plaan.dto.request.CreateProductionReceiptRequest;
import si.plaan.dto.request.UpdateProductionReceiptRequest;
import si.plaan.dto.response.ProductionReceiptResponse;

import java.util.List;

public interface ProductionReceiptService {

    String getNextReceiptNumber(Long orgId);

    List<ProductionReceiptResponse> getProductionReceiptsByProductionOrder(Long orgId, Long productionOrderId);

    ProductionReceiptResponse getProductionReceiptById(Long orgId, Long id);

    ProductionReceiptResponse createProductionReceipt(Long orgId, CreateProductionReceiptRequest request);

    ProductionReceiptResponse updateProductionReceipt(Long orgId, Long id, UpdateProductionReceiptRequest request);

    ProductionReceiptResponse postProductionReceipt(Long orgId, Long id);

    void deleteDraftProductionReceipt(Long orgId, Long id);
}
