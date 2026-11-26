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
import si.plaan.dto.request.CreateMaterialIssueRequest;
import si.plaan.dto.request.MaterialIssueItemRequest;
import si.plaan.dto.request.UpdateMaterialIssueRequest;
import si.plaan.dto.response.MaterialIssueItemResponse;
import si.plaan.dto.response.MaterialIssueResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.Item;
import si.plaan.entity.MaterialIssue;
import si.plaan.entity.MaterialIssueItem;
import si.plaan.entity.MaterialIssueStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.ProductionOrder;
import si.plaan.entity.ProductionOrderItem;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.entity.StockMovement;
import si.plaan.entity.Warehouse;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.MaterialIssueItemRepository;
import si.plaan.repository.MaterialIssueRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.ProductionOrderRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.service.MaterialIssueService;
import si.plaan.service.StockAvailabilityService;
import si.plaan.service.StockLockService;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaterialIssueServiceImpl implements MaterialIssueService {

    private static final String MI_PREFIX = "MI-";

    private final MaterialIssueRepository materialIssueRepository;
    private final MaterialIssueItemRepository materialIssueItemRepository;
    private final ProductionOrderRepository productionOrderRepository;
    private final ItemRepository itemRepository;
    private final OrganizationRepository organizationRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StockAvailabilityService stockAvailabilityService;
    private final StockLockService stockLockService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MaterialIssueResponse> getMaterialIssues(
            Long orgId,
            Long productionOrderId,
            MaterialIssueStatus status,
            Pageable pageable
    ) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<MaterialIssue> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (productionOrderId != null) {
                predicates.add(cb.equal(root.get("productionOrder").get("id"), productionOrderId));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<MaterialIssue> page = materialIssueRepository.findAll(spec, pageable);
        List<MaterialIssueResponse> content = page.getContent().stream()
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
    public MaterialIssueResponse getMaterialIssueById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        MaterialIssue issue = materialIssueRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material issue not found with id: " + id));
        return mapToResponse(issue);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextMaterialIssueNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = materialIssueRepository.findMaxIssueNumberByOrganizationId(orgId);
        return String.format("%s%03d", MI_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialIssueResponse> getMaterialIssuesByProductionOrder(Long orgId, Long productionOrderId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        return materialIssueRepository.findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(orgId, productionOrderId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MaterialIssueResponse createMaterialIssue(Long orgId, CreateMaterialIssueRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(request.getProductionOrderId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + request.getProductionOrderId()));

        if (order.getStatus() != ProductionOrderStatus.RELEASED && order.getStatus() != ProductionOrderStatus.IN_PROGRESS) {
            throw new IllegalStateException("Material Issue is allowed only for Released or In Progress orders. Current status: " + order.getStatus());
        }

        String issueNumber = request.getIssueNumber();
        if (issueNumber == null || issueNumber.trim().isEmpty() || issueNumber.startsWith("MI-...")) {
            issueNumber = getNextMaterialIssueNumber(orgId);
        } else {
            issueNumber = issueNumber.trim();
            if (materialIssueRepository.existsByOrganizationIdAndIssueNumber(orgId, issueNumber)) {
                throw new IllegalArgumentException("Material issue number already exists: " + issueNumber);
            }
        }

        Warehouse sourceWarehouse = order.getSourceWarehouse();
        Map<Long, ProductionOrderItem> orderItemsByMaterial = order.getItems().stream()
                .collect(Collectors.toMap(it -> it.getMaterial().getId(), Function.identity()));

        MaterialIssue issue = MaterialIssue.builder()
                .organization(org)
                .issueNumber(issueNumber)
                .issueDate(request.getIssueDate())
                .productionOrder(order)
                .sourceWarehouse(sourceWarehouse)
                .status(MaterialIssueStatus.DRAFT)
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .items(new ArrayList<>())
                .build();

        for (MaterialIssueItemRequest itemReq : request.getItems()) {
            ProductionOrderItem orderItem = orderItemsByMaterial.get(itemReq.getMaterialId());
            if (orderItem == null) {
                Item mat = itemRepository.findByIdAndOrganizationId(itemReq.getMaterialId(), orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + itemReq.getMaterialId()));
                throw new IllegalArgumentException("Material (" + mat.getName() + ") is not listed in the Production Order requirements.");
            }

            BigDecimal issueQty = itemReq.getIssueQuantity() != null ? itemReq.getIssueQuantity() : BigDecimal.ZERO;
            if (issueQty.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Issue quantity cannot be negative for material: " + orderItem.getMaterial().getName());
            }

            BigDecimal pendingQty = orderItem.getPendingQuantity();

            if (issueQty.compareTo(pendingQty) > 0) {
                throw new IllegalArgumentException("Cannot issue " + issueQty + " " + orderItem.getUnitOfMeasure()
                        + " for " + orderItem.getMaterial().getName() + ". Pending required quantity is only "
                        + pendingQty + " " + orderItem.getUnitOfMeasure() + ".");
            }

            BigDecimal onHand = stockAvailabilityService.getAvailable(
                    orgId, orderItem.getMaterial().getId(), sourceWarehouse.getId()
            );
            if (onHand == null) {
                onHand = BigDecimal.ZERO;
            }

            if (issueQty.compareTo(onHand) > 0) {
                throw new IllegalArgumentException("Insufficient stock in " + sourceWarehouse.getName()
                        + " for " + orderItem.getMaterial().getName() + ". Available on hand: "
                        + onHand + " " + orderItem.getUnitOfMeasure() + ", requested: "
                        + issueQty + " " + orderItem.getUnitOfMeasure() + ".");
            }

            MaterialIssueItem issueItem = MaterialIssueItem.builder()
                    .materialIssue(issue)
                    .material(orderItem.getMaterial())
                    .productionOrderItem(orderItem)
                    .issueQuantity(issueQty)
                    .unitOfMeasure(orderItem.getUnitOfMeasure())
                    .build();

            issue.getItems().add(issueItem);
        }

        MaterialIssue saved = materialIssueRepository.save(issue);
        log.info("Created Material Issue {} (status: DRAFT) for order {} in org {}", saved.getIssueNumber(), order.getOrderNumber(), orgId);

        if (request.isPostImmediately()) {
            return postMaterialIssue(orgId, saved.getId());
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public MaterialIssueResponse updateMaterialIssue(Long orgId, Long id, UpdateMaterialIssueRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        MaterialIssue issue = materialIssueRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material issue not found with id: " + id));

        if (issue.getStatus() != MaterialIssueStatus.DRAFT) {
            throw new IllegalStateException("Only draft material issues can be edited. Posted material issues cannot be modified.");
        }

        ProductionOrder order = issue.getProductionOrder();
        if (order.getStatus() != ProductionOrderStatus.RELEASED && order.getStatus() != ProductionOrderStatus.IN_PROGRESS) {
            throw new IllegalStateException("Material Issue is allowed only for Released or In Progress orders. Current status: " + order.getStatus());
        }

        issue.setIssueDate(request.getIssueDate());
        issue.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);

        Warehouse sourceWarehouse = order.getSourceWarehouse();
        Map<Long, ProductionOrderItem> orderItemsByMaterial = order.getItems().stream()
                .collect(Collectors.toMap(it -> it.getMaterial().getId(), Function.identity()));

        issue.getItems().clear();

        for (MaterialIssueItemRequest itemReq : request.getItems()) {
            ProductionOrderItem orderItem = orderItemsByMaterial.get(itemReq.getMaterialId());
            if (orderItem == null) {
                Item mat = itemRepository.findByIdAndOrganizationId(itemReq.getMaterialId(), orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + itemReq.getMaterialId()));
                throw new IllegalArgumentException("Material (" + mat.getName() + ") is not listed in the Production Order requirements.");
            }

            BigDecimal issueQty = itemReq.getIssueQuantity() != null ? itemReq.getIssueQuantity() : BigDecimal.ZERO;
            if (issueQty.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Issue quantity cannot be negative for material: " + orderItem.getMaterial().getName());
            }

            BigDecimal pendingQty = orderItem.getPendingQuantity();

            if (issueQty.compareTo(pendingQty) > 0) {
                throw new IllegalArgumentException("Cannot issue " + issueQty + " " + orderItem.getUnitOfMeasure()
                        + " for " + orderItem.getMaterial().getName() + ". Pending required quantity is only "
                        + pendingQty + " " + orderItem.getUnitOfMeasure() + ".");
            }

            BigDecimal onHand = stockAvailabilityService.getAvailable(
                    orgId, orderItem.getMaterial().getId(), sourceWarehouse.getId()
            );
            if (onHand == null) {
                onHand = BigDecimal.ZERO;
            }

            if (issueQty.compareTo(onHand) > 0) {
                throw new IllegalArgumentException("Insufficient stock in " + sourceWarehouse.getName()
                        + " for " + orderItem.getMaterial().getName() + ". Available on hand: "
                        + onHand + " " + orderItem.getUnitOfMeasure() + ", requested: "
                        + issueQty + " " + orderItem.getUnitOfMeasure() + ".");
            }

            MaterialIssueItem issueItem = MaterialIssueItem.builder()
                    .materialIssue(issue)
                    .material(orderItem.getMaterial())
                    .productionOrderItem(orderItem)
                    .issueQuantity(issueQty)
                    .unitOfMeasure(orderItem.getUnitOfMeasure())
                    .build();

            issue.getItems().add(issueItem);
        }

        MaterialIssue saved = materialIssueRepository.save(issue);
        log.info("Updated Material Issue {} for order {} in org {}", saved.getIssueNumber(), order.getOrderNumber(), orgId);

        if (request.isPostImmediately()) {
            return postMaterialIssue(orgId, saved.getId());
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public MaterialIssueResponse postMaterialIssue(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        MaterialIssue issue = materialIssueRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material issue not found with id: " + id));

        if (issue.getStatus() == MaterialIssueStatus.POSTED) {
            throw new IllegalStateException("Material issue is already posted. Duplicate posting is strictly prohibited.");
        }

        ProductionOrder order = issue.getProductionOrder();
        if (order.getStatus() != ProductionOrderStatus.RELEASED && order.getStatus() != ProductionOrderStatus.IN_PROGRESS) {
            throw new IllegalStateException("Material Issue is allowed only for Released or In Progress orders. Current status: " + order.getStatus());
        }

        Warehouse sourceWarehouse = issue.getSourceWarehouse();
        Organization org = issue.getOrganization();

        // Validate stock and pending quantities for all lines (lock item×warehouse first)
        for (MaterialIssueItem issueItem : issue.getItems()) {
            BigDecimal issueQty = issueItem.getIssueQuantity() != null ? issueItem.getIssueQuantity() : BigDecimal.ZERO;
            if (issueQty.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            ProductionOrderItem orderItem = issueItem.getProductionOrderItem();
            BigDecimal pendingQty = orderItem.getPendingQuantity();

            if (issueQty.compareTo(pendingQty) > 0) {
                throw new IllegalArgumentException("Cannot issue " + issueQty + " " + orderItem.getUnitOfMeasure()
                        + " for " + orderItem.getMaterial().getName() + ". Pending required quantity is only "
                        + pendingQty + " " + orderItem.getUnitOfMeasure() + ".");
            }

            stockLockService.lockItemWarehouse(org, orderItem.getMaterial(), sourceWarehouse);

            BigDecimal onHand = stockAvailabilityService.getAvailable(
                    orgId, orderItem.getMaterial().getId(), sourceWarehouse.getId()
            );
            if (onHand == null) {
                onHand = BigDecimal.ZERO;
            }

            if (issueQty.compareTo(onHand) > 0) {
                throw new IllegalArgumentException("Insufficient stock in " + sourceWarehouse.getName()
                        + " for " + orderItem.getMaterial().getName() + ". Available on hand: "
                        + onHand + " " + orderItem.getUnitOfMeasure() + ", requested: "
                        + issueQty + " " + orderItem.getUnitOfMeasure() + ".");
            }
        }

        // Post atomically: generate outgoing stock movements and update order issued quantities
        for (MaterialIssueItem issueItem : issue.getItems()) {
            BigDecimal issueQty = issueItem.getIssueQuantity() != null ? issueItem.getIssueQuantity() : BigDecimal.ZERO;
            if (issueQty.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            StockMovement movement = StockMovement.builder()
                    .organization(org)
                    .materialIssue(issue)
                    .productionOrder(order)
                    .item(issueItem.getMaterial())
                    .warehouse(sourceWarehouse)
                    .movementType("MATERIAL_ISSUE")
                    .quantity(issueQty)
                    .unitOfMeasure(issueItem.getUnitOfMeasure())
                    .movementDate(issue.getIssueDate())
                    .referenceNumber(issue.getIssueNumber())
                    .build();

            stockMovementRepository.save(movement);

            // Update cumulative issued quantity on ProductionOrderItem
            ProductionOrderItem orderItem = issueItem.getProductionOrderItem();
            orderItem.setIssuedQuantity(orderItem.getIssuedQuantity().add(issueQty));
        }

        // Update Production Order status from Released -> In Progress on first posted issue
        if (order.getStatus() == ProductionOrderStatus.RELEASED) {
            order.setStatus(ProductionOrderStatus.IN_PROGRESS);
        }
        productionOrderRepository.save(order);

        issue.setStatus(MaterialIssueStatus.POSTED);
        MaterialIssue saved = materialIssueRepository.save(issue);
        log.info("Posted Material Issue {} for Production Order {} in org {}. Outgoing stock movements generated.",
                saved.getIssueNumber(), order.getOrderNumber(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteDraftMaterialIssue(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        MaterialIssue issue = materialIssueRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material issue not found with id: " + id));

        if (issue.getStatus() != MaterialIssueStatus.DRAFT) {
            throw new IllegalStateException("Only draft material issues can be deleted. Posted material issues cannot be modified or deleted.");
        }

        materialIssueRepository.delete(issue);
        log.info("Deleted Draft Material Issue {} for org {}", issue.getIssueNumber(), orgId);
    }

    private MaterialIssueResponse mapToResponse(MaterialIssue issue) {
        BigDecimal totalQty = BigDecimal.ZERO;
        List<MaterialIssueItemResponse> itemResponses = new ArrayList<>();

        for (MaterialIssueItem it : issue.getItems()) {
            BigDecimal issueQty = it.getIssueQuantity() != null ? it.getIssueQuantity() : BigDecimal.ZERO;
            totalQty = totalQty.add(issueQty);

            ProductionOrderItem poi = it.getProductionOrderItem();
            BigDecimal reqQty = poi != null ? poi.getRequiredQuantity() : BigDecimal.ZERO;
            BigDecimal issuedQtyBefore = poi != null ? poi.getIssuedQuantity() : BigDecimal.ZERO;
            BigDecimal pendingQtyBefore = reqQty.subtract(issuedQtyBefore);
            if (pendingQtyBefore.compareTo(BigDecimal.ZERO) < 0) {
                pendingQtyBefore = BigDecimal.ZERO;
            }

            itemResponses.add(MaterialIssueItemResponse.builder()
                    .id(it.getId())
                    .materialId(it.getMaterial().getId())
                    .materialCode(it.getMaterial().getItemCode())
                    .materialName(it.getMaterial().getName())
                    .productionOrderItemId(poi != null ? poi.getId() : null)
                    .requiredQuantity(reqQty)
                    .issuedQuantityBefore(issuedQtyBefore)
                    .pendingQuantityBefore(pendingQtyBefore)
                    .issueQuantity(issueQty)
                    .unitOfMeasure(it.getUnitOfMeasure())
                    .build());
        }

        ProductionOrder po = issue.getProductionOrder();

        return MaterialIssueResponse.builder()
                .id(issue.getId())
                .issueNumber(issue.getIssueNumber())
                .issueDate(issue.getIssueDate())
                .productionOrderId(po.getId())
                .productionOrderNumber(po.getOrderNumber())
                .orderStatus(po.getStatus().name())
                .productId(po.getProduct().getId())
                .productCode(po.getProduct().getItemCode())
                .productName(po.getProduct().getName())
                .sourceWarehouseId(issue.getSourceWarehouse().getId())
                .sourceWarehouseCode(issue.getSourceWarehouse().getWarehouseCode())
                .sourceWarehouseName(issue.getSourceWarehouse().getName())
                .status(issue.getStatus())
                .notes(issue.getNotes())
                .totalItems(issue.getItems().size())
                .totalQuantity(totalQty)
                .createdAt(issue.getCreatedAt())
                .updatedAt(issue.getUpdatedAt())
                .items(itemResponses)
                .build();
    }
}
