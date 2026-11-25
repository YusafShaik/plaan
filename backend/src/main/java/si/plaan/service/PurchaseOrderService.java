package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreatePurchaseOrderRequest;
import si.plaan.dto.request.UpdatePurchaseOrderRequest;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.PurchaseOrderResponse;
import si.plaan.dto.response.PurchaseOrderSummaryResponse;
import si.plaan.entity.PurchaseOrderStatus;

public interface PurchaseOrderService {

    PageResponse<PurchaseOrderResponse> getPurchaseOrders(
            Long orgId,
            String search,
            PurchaseOrderStatus status,
            Pageable pageable
    );

    PurchaseOrderResponse getPurchaseOrderById(Long orgId, Long id);

    String getNextPoNumber(Long orgId);

    PurchaseOrderSummaryResponse getSummary(Long orgId);

    PurchaseOrderResponse createPurchaseOrder(Long orgId, CreatePurchaseOrderRequest request);

    PurchaseOrderResponse updatePurchaseOrder(Long orgId, Long id, UpdatePurchaseOrderRequest request);

    PurchaseOrderResponse updateStatus(Long orgId, Long id, PurchaseOrderStatus status);

    byte[] generatePurchaseOrderPdf(Long orgId, Long id);
}
