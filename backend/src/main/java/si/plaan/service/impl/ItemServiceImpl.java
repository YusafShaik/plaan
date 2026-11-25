package si.plaan.service.impl;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateItemRequest;
import si.plaan.dto.request.UpdateItemRequest;
import si.plaan.dto.response.ItemResponse;
import si.plaan.dto.response.ItemSummaryResponse;
import si.plaan.dto.response.ItemTypeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.Item;
import si.plaan.entity.ItemType;
import si.plaan.entity.Organization;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.ItemTypeRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ItemService;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ItemServiceImpl implements ItemService {

    private final ItemRepository itemRepository;
    private final ItemTypeRepository itemTypeRepository;
    private final OrganizationRepository organizationRepository;
    private final si.plaan.service.ItemPrefixService itemPrefixService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ItemResponse> getItems(Long orgId, String search, Long typeId, Boolean active, Pageable pageable) {
        if (orgId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Organization context required");
        }

        Specification<Item> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (typeId != null) {
                predicates.add(cb.equal(root.get("itemType").get("id"), typeId));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), pattern);
                Predicate codeLike = cb.like(cb.lower(root.get("itemCode")), pattern);
                predicates.add(cb.or(nameLike, codeLike));
            }

            if (query != null && Long.class != query.getResultType() && long.class != query.getResultType()) {
                root.fetch("itemType", JoinType.INNER);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Item> itemPage = itemRepository.findAll(spec, pageable);
        return PageResponse.from(itemPage.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public ItemSummaryResponse getSummary(Long orgId) {
        if (orgId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Organization context required");
        }
        long total = itemRepository.countByOrganizationId(orgId);
        long active = itemRepository.countByOrganizationIdAndActive(orgId, true);
        long inactive = total - active;
        return new ItemSummaryResponse(total, active, inactive);
    }

    @Override
    @Transactional
    public ItemResponse createItem(Long orgId, CreateItemRequest request) {
        if (orgId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Organization context required");
        }
        String itemCode = request.itemCode().trim().toUpperCase();

        if (itemRepository.existsByOrganizationIdAndItemCodeIgnoreCase(orgId, itemCode)) {
            throw new IllegalArgumentException("Item code '" + itemCode + "' is already registered in this organization");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        ItemType itemType = resolveItemType(org, request.itemTypeId(), request.newItemTypeName());

        Item item = Item.builder()
                .organization(org)
                .itemCode(itemCode)
                .name(request.name().trim())
                .itemType(itemType)
                .unitOfMeasure(request.unitOfMeasure().trim())
                .description(request.description() != null ? request.description().trim() : null)
                .active(request.active() == null || request.active())
                .build();

        Item saved = itemRepository.save(item);
        itemPrefixService.recordCodeUsage(orgId, request.prefixId(), request.newPrefix(), saved.getItemCode());
        log.info("Created item {} ({}) for org id {}", saved.getName(), saved.getItemCode(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public ItemResponse updateItem(Long orgId, Long itemId, UpdateItemRequest request) {
        if (orgId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Organization context required");
        }
        Item item = itemRepository.findByIdAndOrganizationId(itemId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemId));

        Organization org = item.getOrganization();
        ItemType itemType = resolveItemType(org, request.itemTypeId(), request.newItemTypeName());

        item.setName(request.name().trim());
        item.setItemType(itemType);
        item.setUnitOfMeasure(request.unitOfMeasure().trim());
        item.setDescription(request.description() != null ? request.description().trim() : null);
        if (request.active() != null) {
            item.setActive(request.active());
        }

        Item updated = itemRepository.save(item);
        log.info("Updated item {} (id: {}) for org id {}", updated.getItemCode(), itemId, orgId);

        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public ItemResponse toggleStatus(Long orgId, Long itemId) {
        if (orgId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Organization context required");
        }
        Item item = itemRepository.findByIdAndOrganizationId(itemId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemId));

        item.setActive(!item.isActive());
        Item saved = itemRepository.save(item);
        log.info("Toggled item {} status to: {}", saved.getItemCode(), saved.isActive());

        return mapToResponse(saved);
    }

    private ItemType resolveItemType(Organization org, Long itemTypeId, String newItemTypeName) {
        if (itemTypeId != null) {
            return itemTypeRepository.findByIdAndOrganizationId(itemTypeId, org.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Item type not found with id: " + itemTypeId));
        }

        if (newItemTypeName != null && !newItemTypeName.isBlank()) {
            String trimmed = newItemTypeName.trim();
            return itemTypeRepository.findByOrganizationIdAndNameIgnoreCase(org.getId(), trimmed)
                    .orElseGet(() -> itemTypeRepository.save(
                            ItemType.builder()
                                    .organization(org)
                                    .name(trimmed)
                                    .build()
                    ));
        }

        throw new IllegalArgumentException("Either an existing itemTypeId or newItemTypeName must be provided");
    }

    private ItemResponse mapToResponse(Item item) {
        ItemTypeResponse typeResponse = new ItemTypeResponse(
                item.getItemType().getId(),
                item.getItemType().getName(),
                item.getItemType().getDescription()
        );

        return new ItemResponse(
                item.getId(),
                item.getItemCode(),
                item.getName(),
                typeResponse,
                item.getUnitOfMeasure(),
                item.getDescription(),
                item.isActive(),
                item.getCreatedAt()
        );
    }
}
