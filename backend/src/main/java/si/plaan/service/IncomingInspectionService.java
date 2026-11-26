package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.UpdateIncomingInspectionRequest;
import si.plaan.dto.response.IncomingInspectionResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.GoodsReceipt;
import si.plaan.entity.IncomingInspectionStatus;
import si.plaan.entity.PurchaseOrder;

public interface IncomingInspectionService {

    PageResponse<IncomingInspectionResponse> getInspections(
            Long orgId,
            String search,
            IncomingInspectionStatus status,
            Pageable pageable
    );

    IncomingInspectionResponse getById(Long orgId, Long id);

    IncomingInspectionResponse update(Long orgId, Long id, Long userId, UpdateIncomingInspectionRequest request);

    IncomingInspectionResponse complete(Long orgId, Long id, Long userId, UpdateIncomingInspectionRequest request);

    /** Called atomically from GRN post for lines that require Incoming inspection. */
    void createPendingFromPostedGrn(Long orgId, GoodsReceipt grn, PurchaseOrder po);
}
