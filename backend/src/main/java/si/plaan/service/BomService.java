package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateBomRequest;
import si.plaan.dto.request.UpdateBomRequest;
import si.plaan.dto.response.BomResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.BomStatus;

public interface BomService {

    PageResponse<BomResponse> getBoms(
            Long orgId,
            String search,
            BomStatus status,
            Pageable pageable
    );

    BomResponse getBomById(Long orgId, Long id);

    String getNextBomCode(Long orgId);

    BomResponse createBom(Long orgId, CreateBomRequest request);

    BomResponse updateBom(Long orgId, Long id, UpdateBomRequest request);

    BomResponse activateBom(Long orgId, Long id);

    BomResponse deactivateBom(Long orgId, Long id);

    void deleteDraftBom(Long orgId, Long id);

    BomResponse getActiveBomForProduct(Long orgId, Long productId);
}
