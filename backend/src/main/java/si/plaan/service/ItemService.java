package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateItemRequest;
import si.plaan.dto.request.UpdateItemRequest;
import si.plaan.dto.response.ItemResponse;
import si.plaan.dto.response.ItemSummaryResponse;
import si.plaan.dto.response.PageResponse;

public interface ItemService {
    PageResponse<ItemResponse> getItems(Long orgId, String search, Long typeId, Boolean active, Pageable pageable);
    ItemSummaryResponse getSummary(Long orgId);
    ItemResponse createItem(Long orgId, CreateItemRequest request);
    ItemResponse updateItem(Long orgId, Long itemId, UpdateItemRequest request);
    ItemResponse toggleStatus(Long orgId, Long itemId);
}
