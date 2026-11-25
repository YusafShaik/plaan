package si.plaan.service;

import si.plaan.dto.request.CreateMaterialReturnRequest;
import si.plaan.dto.request.UpdateMaterialReturnRequest;
import si.plaan.dto.response.MaterialReturnResponse;

import java.util.List;

public interface MaterialReturnService {

    String getNextReturnNumber(Long orgId);

    List<MaterialReturnResponse> getMaterialReturnsByProductionOrder(Long orgId, Long productionOrderId);

    MaterialReturnResponse getMaterialReturnById(Long orgId, Long id);

    MaterialReturnResponse createMaterialReturn(Long orgId, CreateMaterialReturnRequest request);

    MaterialReturnResponse updateMaterialReturn(Long orgId, Long id, UpdateMaterialReturnRequest request);

    MaterialReturnResponse postMaterialReturn(Long orgId, Long id);

    void deleteDraftMaterialReturn(Long orgId, Long id);
}
