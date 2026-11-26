package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.UpdateFinishedGoodsInspectionRequest;
import si.plaan.dto.response.FinishedGoodsInspectionResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.FinishedGoodsInspectionStatus;
import si.plaan.entity.ProductionOrder;
import si.plaan.entity.ProductionReceipt;

import java.math.BigDecimal;

public interface FinishedGoodsInspectionService {

    PageResponse<FinishedGoodsInspectionResponse> getInspections(
            Long orgId,
            String search,
            FinishedGoodsInspectionStatus status,
            Pageable pageable
    );

    FinishedGoodsInspectionResponse getById(Long orgId, Long id);

    FinishedGoodsInspectionResponse update(
            Long orgId, Long id, Long userId, UpdateFinishedGoodsInspectionRequest request);

    FinishedGoodsInspectionResponse complete(
            Long orgId, Long id, Long userId, UpdateFinishedGoodsInspectionRequest request);

    /** Called atomically from Production Receipt post when FG inspection is required. */
    void createPendingFromPostedReceipt(Long orgId, ProductionReceipt receipt, ProductionOrder order);

    boolean hasIncompleteInspections(Long orgId, Long productionOrderId);

    long countIncompleteInspections(Long orgId, Long productionOrderId);

    /** [pending, accepted, rejected] for a production order. */
    BigDecimal[] getQualityTotals(Long orgId, Long productionOrderId);
}
