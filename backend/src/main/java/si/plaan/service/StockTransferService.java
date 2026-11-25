package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateStockTransferRequest;
import si.plaan.dto.request.UpdateStockTransferRequest;
import si.plaan.dto.response.ItemOnHandStockResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.StockTransferResponse;
import si.plaan.entity.StockTransferStatus;

import java.util.List;

public interface StockTransferService {

    PageResponse<StockTransferResponse> getStockTransfers(
            Long orgId,
            String search,
            StockTransferStatus status,
            Pageable pageable
    );

    StockTransferResponse getStockTransferById(Long orgId, Long id);

    String getNextTransferNumber(Long orgId);

    List<ItemOnHandStockResponse> getWarehouseStock(Long orgId, Long warehouseId);

    StockTransferResponse createStockTransfer(Long orgId, CreateStockTransferRequest request);

    StockTransferResponse updateStockTransfer(Long orgId, Long id, UpdateStockTransferRequest request);

    StockTransferResponse postStockTransfer(Long orgId, Long id);

    StockTransferResponse cancelStockTransfer(Long orgId, Long id);
}
