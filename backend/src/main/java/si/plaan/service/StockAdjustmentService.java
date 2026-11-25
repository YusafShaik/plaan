package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateStockAdjustmentRequest;
import si.plaan.dto.request.UpdateStockAdjustmentRequest;
import si.plaan.dto.response.ItemOnHandStockResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.StockAdjustmentResponse;
import si.plaan.entity.StockAdjustmentStatus;

import java.util.List;

public interface StockAdjustmentService {

    PageResponse<StockAdjustmentResponse> getStockAdjustments(
            Long orgId,
            String search,
            StockAdjustmentStatus status,
            Pageable pageable
    );

    StockAdjustmentResponse getStockAdjustmentById(Long orgId, Long id);

    String getNextAdjustmentNumber(Long orgId);

    List<ItemOnHandStockResponse> getWarehouseStock(Long orgId, Long warehouseId);

    StockAdjustmentResponse createStockAdjustment(Long orgId, CreateStockAdjustmentRequest request);

    StockAdjustmentResponse updateStockAdjustment(Long orgId, Long id, UpdateStockAdjustmentRequest request);

    StockAdjustmentResponse postStockAdjustment(Long orgId, Long id);

    StockAdjustmentResponse cancelStockAdjustment(Long orgId, Long id);
}
