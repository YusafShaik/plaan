package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.ItemTypeRequest;
import si.plaan.dto.response.ItemTypeResponse;
import si.plaan.entity.ItemType;
import si.plaan.entity.Organization;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.ItemTypeRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ItemTypeService;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ItemTypeServiceImpl implements ItemTypeService {

    private final ItemTypeRepository itemTypeRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ItemTypeResponse> getItemTypes(Long orgId) {
        if (orgId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Organization context required");
        }
        return itemTypeRepository.findByOrganizationIdOrderByNameAsc(orgId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public ItemTypeResponse createItemType(Long orgId, ItemTypeRequest request) {
        if (orgId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Organization context required");
        }
        String trimmedName = request.name().trim();

        if (itemTypeRepository.existsByOrganizationIdAndNameIgnoreCase(orgId, trimmedName)) {
            throw new IllegalArgumentException("Item type '" + trimmedName + "' already exists in this organization");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        ItemType itemType = ItemType.builder()
                .organization(org)
                .name(trimmedName)
                .description(request.description() != null ? request.description().trim() : null)
                .build();

        ItemType saved = itemTypeRepository.save(itemType);
        log.info("Created item type '{}' for organization id {}", saved.getName(), orgId);

        return mapToResponse(saved);
    }

    private ItemTypeResponse mapToResponse(ItemType type) {
        return new ItemTypeResponse(
                type.getId(),
                type.getName(),
                type.getDescription()
        );
    }
}
