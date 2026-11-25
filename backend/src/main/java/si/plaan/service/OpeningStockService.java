package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateOpeningStockRequest;
import si.plaan.dto.request.UpdateOpeningStockRequest;
import si.plaan.dto.response.OpeningStockResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.OpeningStockStatus;

public interface OpeningStockService {

    PageResponse<OpeningStockResponse> getOpeningStocks(
            Long orgId,
            String search,
            OpeningStockStatus status,
            Pageable pageable
    );

    OpeningStockResponse getOpeningStockById(Long orgId, Long id);

    String getNextOpeningStockNumber(Long orgId);

    OpeningStockResponse createOpeningStock(Long orgId, CreateOpeningStockRequest request);

    OpeningStockResponse updateOpeningStock(Long orgId, Long id, UpdateOpeningStockRequest request);

    OpeningStockResponse postOpeningStock(Long orgId, Long id);

    OpeningStockResponse cancelOpeningStock(Long orgId, Long id);
}
