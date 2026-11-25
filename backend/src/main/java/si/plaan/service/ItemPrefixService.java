package si.plaan.service;

import si.plaan.dto.request.CreateItemPrefixRequest;
import si.plaan.dto.response.ItemPrefixResponse;

import java.util.List;

public interface ItemPrefixService {
    List<ItemPrefixResponse> getPrefixes(Long orgId);
    ItemPrefixResponse createPrefix(Long orgId, CreateItemPrefixRequest request);
    ItemPrefixResponse getNextCode(Long orgId, Long prefixId);
    void recordCodeUsage(Long orgId, Long prefixId, String newPrefix, String itemCode);
}
