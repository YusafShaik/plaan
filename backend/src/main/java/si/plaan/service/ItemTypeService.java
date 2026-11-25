package si.plaan.service;

import si.plaan.dto.request.ItemTypeRequest;
import si.plaan.dto.response.ItemTypeResponse;

import java.util.List;

public interface ItemTypeService {
    List<ItemTypeResponse> getItemTypes(Long orgId);
    ItemTypeResponse createItemType(Long orgId, ItemTypeRequest request);
}
