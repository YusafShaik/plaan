package si.plaan.service;

import si.plaan.dto.request.CreateMaterialConsumptionRequest;
import si.plaan.dto.request.UpdateMaterialConsumptionRequest;
import si.plaan.dto.response.MaterialConsumptionResponse;

import java.util.List;

public interface MaterialConsumptionService {

    String getNextConsumptionNumber(Long orgId);

    List<MaterialConsumptionResponse> getMaterialConsumptionsByProductionOrder(Long orgId, Long productionOrderId);

    MaterialConsumptionResponse getMaterialConsumptionById(Long orgId, Long id);

    MaterialConsumptionResponse createMaterialConsumption(Long orgId, CreateMaterialConsumptionRequest request);

    MaterialConsumptionResponse updateMaterialConsumption(Long orgId, Long id, UpdateMaterialConsumptionRequest request);

    MaterialConsumptionResponse postMaterialConsumption(Long orgId, Long id);

    void deleteDraftMaterialConsumption(Long orgId, Long id);
}
