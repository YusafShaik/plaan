package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.UpdateWarehouseRequest;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.dto.response.WarehouseSummaryResponse;

public interface WarehouseService {

    PageResponse<WarehouseResponse> getWarehouses(Long orgId, String search, Boolean active, Pageable pageable);

    WarehouseResponse getWarehouseById(Long orgId, Long id);

    WarehouseSummaryResponse getSummary(Long orgId);

    String getNextWarehouseCode(Long orgId);

    WarehouseResponse createWarehouse(Long orgId, CreateWarehouseRequest request);

    WarehouseResponse updateWarehouse(Long orgId, Long id, UpdateWarehouseRequest request);

    WarehouseResponse toggleStatus(Long orgId, Long id);
}
