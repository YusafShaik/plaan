package si.plaan.service.impl;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.BomItemRequest;
import si.plaan.dto.request.CreateBomRequest;
import si.plaan.dto.request.UpdateBomRequest;
import si.plaan.dto.response.BomItemResponse;
import si.plaan.dto.response.BomResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.Bom;
import si.plaan.entity.BomItem;
import si.plaan.entity.BomStatus;
import si.plaan.entity.Item;
import si.plaan.entity.Organization;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.BomRepository;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.BomService;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BomServiceImpl implements BomService {

    private static final String BOM_PREFIX = "BOM-";

    private final BomRepository bomRepository;
    private final ItemRepository itemRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<BomResponse> getBoms(
            Long orgId,
            String search,
            BomStatus status,
            Pageable pageable
    ) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<Bom> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                Predicate codeMatch = cb.like(cb.lower(root.get("bomCode")), searchPattern);
                Predicate productCodeMatch = cb.like(cb.lower(root.get("product").get("itemCode")), searchPattern);
                Predicate productNameMatch = cb.like(cb.lower(root.get("product").get("name")), searchPattern);
                predicates.add(cb.or(codeMatch, productCodeMatch, productNameMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Bom> page = bomRepository.findAll(spec, pageable);
        List<BomResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public BomResponse getBomById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        Bom bom = bomRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("BOM not found with id: " + id));
        return mapToResponse(bom);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextBomCode(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = bomRepository.findMaxBomNumberByOrganizationId(orgId);
        return String.format("%s%03d", BOM_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional
    public BomResponse createBom(Long orgId, CreateBomRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        Item product = itemRepository.findByIdAndOrganizationId(request.getProductId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        if (!product.isActive()) {
            throw new IllegalArgumentException("Cannot create BOM for inactive product: " + product.getName());
        }

        BigDecimal outputQty = request.getOutputQuantity() != null ? request.getOutputQuantity() : BigDecimal.ONE;
        if (outputQty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Output quantity must be greater than zero.");
        }

        String bomCode = request.getBomCode();
        if (bomCode == null || bomCode.trim().isEmpty() || bomCode.startsWith("BOM-...")) {
            bomCode = getNextBomCode(orgId);
        } else {
            bomCode = bomCode.trim();
            if (bomRepository.existsByOrganizationIdAndBomCode(orgId, bomCode)) {
                throw new IllegalArgumentException("BOM code already exists: " + bomCode);
            }
        }

        BomStatus targetStatus = request.isSaveAndActivate() ? BomStatus.ACTIVE : BomStatus.DRAFT;

        if (targetStatus == BomStatus.ACTIVE) {
            if (request.getItems() == null || request.getItems().isEmpty()) {
                throw new IllegalArgumentException("At least one component material is required to activate a BOM.");
            }
            if (bomRepository.existsByOrganizationIdAndProductIdAndStatus(orgId, product.getId(), BomStatus.ACTIVE)) {
                throw new IllegalStateException("An active BOM already exists for product: " + product.getName()
                        + ". Only one active BOM is allowed per product. Please deactivate the existing BOM first.");
            }
        }

        Bom bom = Bom.builder()
                .organization(org)
                .bomCode(bomCode)
                .product(product)
                .outputQuantity(outputQty)
                .unitOfMeasure(product.getUnitOfMeasure())
                .status(targetStatus)
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .items(new ArrayList<>())
                .build();

        validateAndAttachComponents(orgId, product, request.getItems(), bom);

        Bom saved = bomRepository.save(bom);
        log.info("Created BOM {} with status {} for org {}", saved.getBomCode(), saved.getStatus(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public BomResponse updateBom(Long orgId, Long id, UpdateBomRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Bom bom = bomRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("BOM not found with id: " + id));

        if (bom.getStatus() == BomStatus.INACTIVE) {
            throw new IllegalStateException("Inactive BOM cannot be edited. Please create a new draft BOM instead.");
        }

        if (bom.getStatus() == BomStatus.ACTIVE && !request.isSaveAndActivate()) {
            throw new IllegalStateException("Active BOM cannot be directly modified. Please deactivate it first or create a new draft BOM.");
        }

        Item product = itemRepository.findByIdAndOrganizationId(request.getProductId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        if (!product.isActive()) {
            throw new IllegalArgumentException("Cannot update BOM with inactive product: " + product.getName());
        }

        BigDecimal outputQty = request.getOutputQuantity() != null ? request.getOutputQuantity() : BigDecimal.ONE;
        if (outputQty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Output quantity must be greater than zero.");
        }

        BomStatus targetStatus = request.isSaveAndActivate() ? BomStatus.ACTIVE : bom.getStatus();

        if (targetStatus == BomStatus.ACTIVE) {
            if (request.getItems() == null || request.getItems().isEmpty()) {
                throw new IllegalArgumentException("At least one component material is required to activate a BOM.");
            }
            if (bomRepository.existsByOrganizationIdAndProductIdAndStatusAndIdNot(orgId, product.getId(), BomStatus.ACTIVE, id)) {
                throw new IllegalStateException("An active BOM already exists for product: " + product.getName()
                        + ". Only one active BOM is allowed per product. Please deactivate the existing BOM first.");
            }
        }

        bom.setProduct(product);
        bom.setOutputQuantity(outputQty);
        bom.setUnitOfMeasure(product.getUnitOfMeasure());
        bom.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);
        bom.setStatus(targetStatus);

        bom.getItems().clear();
        validateAndAttachComponents(orgId, product, request.getItems(), bom);

        Bom updated = bomRepository.save(bom);
        log.info("Updated BOM {} for org {}", updated.getBomCode(), orgId);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public BomResponse activateBom(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Bom bom = bomRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("BOM not found with id: " + id));

        if (bom.getStatus() == BomStatus.ACTIVE) {
            return mapToResponse(bom);
        }

        if (bom.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one component material is required to activate a BOM.");
        }

        if (bomRepository.existsByOrganizationIdAndProductIdAndStatusAndIdNot(orgId, bom.getProduct().getId(), BomStatus.ACTIVE, id)) {
            throw new IllegalStateException("An active BOM already exists for product: " + bom.getProduct().getName()
                    + ". Only one active BOM is allowed per product. Please deactivate the existing BOM first.");
        }

        bom.setStatus(BomStatus.ACTIVE);
        Bom saved = bomRepository.save(bom);
        log.info("Activated BOM {} for org {}", saved.getBomCode(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public BomResponse deactivateBom(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Bom bom = bomRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("BOM not found with id: " + id));

        if (bom.getStatus() != BomStatus.ACTIVE) {
            throw new IllegalStateException("Only active BOMs can be deactivated.");
        }

        bom.setStatus(BomStatus.INACTIVE);
        Bom saved = bomRepository.save(bom);
        log.info("Deactivated BOM {} for org {}", saved.getBomCode(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteDraftBom(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Bom bom = bomRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("BOM not found with id: " + id));

        if (bom.getStatus() != BomStatus.DRAFT) {
            throw new IllegalStateException("Only draft BOMs can be deleted. Active or inactive BOMs must be preserved for audit history.");
        }

        bomRepository.delete(bom);
        log.info("Deleted draft BOM {} for org {}", bom.getBomCode(), orgId);
    }

    @Override
    @Transactional(readOnly = true)
    public BomResponse getActiveBomForProduct(Long orgId, Long productId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        return bomRepository.findByOrganizationIdAndProductIdAndStatus(orgId, productId, BomStatus.ACTIVE)
                .map(this::mapToResponse)
                .orElse(null);
    }

    private void validateAndAttachComponents(Long orgId, Item product, List<BomItemRequest> itemRequests, Bom bom) {
        if (itemRequests == null || itemRequests.isEmpty()) {
            return;
        }

        Set<Long> seenMaterialIds = new HashSet<>();

        for (BomItemRequest itemReq : itemRequests) {
            if (itemReq.getMaterialId() == null) {
                continue;
            }

            if (itemReq.getMaterialId().equals(product.getId())) {
                throw new IllegalArgumentException("The output product (" + product.getName()
                        + ") cannot be its own component material.");
            }

            if (!seenMaterialIds.add(itemReq.getMaterialId())) {
                Item duplicate = itemRepository.findByIdAndOrganizationId(itemReq.getMaterialId(), orgId).orElse(null);
                String dupName = duplicate != null ? duplicate.getName() : "ID " + itemReq.getMaterialId();
                throw new IllegalArgumentException("Duplicate component material: " + dupName
                        + ". Each material can only appear once in a BOM.");
            }

            Item material = itemRepository.findByIdAndOrganizationId(itemReq.getMaterialId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Component material not found with id: " + itemReq.getMaterialId()));

            if (!material.isActive()) {
                throw new IllegalArgumentException("Component material is inactive: " + material.getName());
            }

            if (itemReq.getQuantity() == null || itemReq.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Quantity must be greater than zero for material: " + material.getName());
            }

            BomItem bomItem = BomItem.builder()
                    .bom(bom)
                    .material(material)
                    .quantity(itemReq.getQuantity())
                    .unitOfMeasure(material.getUnitOfMeasure())
                    .build();

            bom.getItems().add(bomItem);
        }
    }

    private BomResponse mapToResponse(Bom bom) {
        List<BomItemResponse> itemResponses = bom.getItems().stream()
                .map(it -> BomItemResponse.builder()
                        .id(it.getId())
                        .materialId(it.getMaterial().getId())
                        .materialCode(it.getMaterial().getItemCode())
                        .materialName(it.getMaterial().getName())
                        .quantity(it.getQuantity())
                        .unitOfMeasure(it.getUnitOfMeasure())
                        .build())
                .collect(Collectors.toList());

        return BomResponse.builder()
                .id(bom.getId())
                .bomCode(bom.getBomCode())
                .productId(bom.getProduct().getId())
                .productCode(bom.getProduct().getItemCode())
                .productName(bom.getProduct().getName())
                .outputQuantity(bom.getOutputQuantity())
                .unitOfMeasure(bom.getUnitOfMeasure())
                .status(bom.getStatus())
                .notes(bom.getNotes())
                .totalComponents(bom.getItems().size())
                .createdAt(bom.getCreatedAt())
                .updatedAt(bom.getUpdatedAt())
                .items(itemResponses)
                .build();
    }
}
