package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateGoodsReceiptRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.GoodsReceiptStatus;

import java.util.List;

public interface GoodsReceiptService {

    PageResponse<GoodsReceiptResponse> getGoodsReceipts(
            Long orgId,
            String search,
            GoodsReceiptStatus status,
            Pageable pageable
    );

    GoodsReceiptResponse getGoodsReceiptById(Long orgId, Long id);

    String getNextGrnNumber(Long orgId);

    GoodsReceiptSummaryResponse getSummary(Long orgId);

    List<PoEligibleForGrnResponse> getEligiblePurchaseOrders(Long orgId);

    PoEligibleForGrnResponse getPurchaseOrderDetailsForGrn(Long orgId, Long poId);

    GoodsReceiptResponse createGoodsReceipt(Long orgId, CreateGoodsReceiptRequest request);

    GoodsReceiptResponse postGoodsReceipt(Long orgId, Long id);

    GoodsReceiptResponse cancelGoodsReceipt(Long orgId, Long id);

    PageResponse<StockMovementResponse> getStockMovements(Long orgId, String search, Pageable pageable);

    List<StockMovementResponse> getStockMovementsForPo(Long orgId, Long poId);

    byte[] generateGoodsReceiptPdf(Long orgId, Long id);
}
