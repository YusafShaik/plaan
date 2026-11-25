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
import si.plaan.dto.request.CloseProductionOrderRequest;
import si.plaan.dto.request.CreateProductionOrderRequest;
import si.plaan.dto.request.UpdateProductionOrderRequest;
import si.plaan.dto.response.MaterialAvailabilityItemResponse;
import si.plaan.dto.response.MaterialReconciliationItemResponse;
import si.plaan.dto.response.MaterialRequirementPreviewResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.ProductionOrderAvailabilityResponse;
import si.plaan.dto.response.ProductionOrderClosureValidationResponse;
import si.plaan.dto.response.ProductionOrderItemResponse;
import si.plaan.dto.response.ProductionOrderResponse;
import si.plaan.entity.Bom;
import si.plaan.entity.BomItem;
import si.plaan.entity.BomStatus;
import si.plaan.entity.Item;
import si.plaan.entity.MaterialConsumptionStatus;
import si.plaan.entity.MaterialIssueStatus;
import si.plaan.entity.MaterialReturnStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.ProductionOrder;
import si.plaan.entity.ProductionOrderItem;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.entity.ProductionReceiptStatus;
import si.plaan.entity.Warehouse;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.dto.response.MaterialTransactionResponse;
import si.plaan.entity.MaterialConsumption;
import si.plaan.entity.MaterialConsumptionItem;
import si.plaan.entity.MaterialIssue;
import si.plaan.entity.MaterialIssueItem;
import si.plaan.entity.MaterialReturn;
import si.plaan.entity.MaterialReturnItem;
import si.plaan.repository.BomRepository;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.MaterialConsumptionRepository;
import si.plaan.repository.MaterialIssueRepository;
import si.plaan.repository.MaterialReturnRepository;
import si.plaan.repository.ProductionReceiptRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.ProductionOrderRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.repository.WarehouseRepository;
import si.plaan.service.ProductionOrderService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductionOrderServiceImpl implements ProductionOrderService {

    private static final String MO_PREFIX = "MO-";

    private final ProductionOrderRepository productionOrderRepository;
    private final BomRepository bomRepository;
    private final ItemRepository itemRepository;
    private final WarehouseRepository warehouseRepository;
    private final OrganizationRepository organizationRepository;
    private final StockMovementRepository stockMovementRepository;
    private final MaterialIssueRepository materialIssueRepository;
    private final MaterialConsumptionRepository materialConsumptionRepository;
    private final MaterialReturnRepository materialReturnRepository;
    private final ProductionReceiptRepository productionReceiptRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductionOrderResponse> getProductionOrders(
            Long orgId,
            String search,
            ProductionOrderStatus status,
            Pageable pageable
    ) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<ProductionOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                Predicate orderNumMatch = cb.like(cb.lower(root.get("orderNumber")), searchPattern);
                Predicate productCodeMatch = cb.like(cb.lower(root.get("product").get("itemCode")), searchPattern);
                Predicate productNameMatch = cb.like(cb.lower(root.get("product").get("name")), searchPattern);
                predicates.add(cb.or(orderNumMatch, productCodeMatch, productNameMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<ProductionOrder> page = productionOrderRepository.findAll(spec, pageable);
        List<ProductionOrderResponse> content = page.getContent().stream()
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
    public ProductionOrderResponse getProductionOrderById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + id));
        return mapToResponse(order, true);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductionOrderAvailabilityResponse checkMaterialAvailability(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + id));

        Long sourceWarehouseId = order.getSourceWarehouse().getId();
        int shortageCount = 0;
        int availableCount = 0;
        List<MaterialAvailabilityItemResponse> items = new ArrayList<>();

        for (ProductionOrderItem item : order.getItems()) {
            BigDecimal onHand = stockMovementRepository.getCurrentStockForItemAndWarehouse(
                    orgId, item.getMaterial().getId(), sourceWarehouseId
            );
            if (onHand == null) {
                onHand = BigDecimal.ZERO;
            }

            BigDecimal required = item.getRequiredQuantity();
            BigDecimal issued = item.getIssuedQuantity() != null ? item.getIssuedQuantity() : BigDecimal.ZERO;
            BigDecimal consumed = item.getConsumedQuantity() != null ? item.getConsumedQuantity() : BigDecimal.ZERO;
            BigDecimal returned = item.getReturnedQuantity() != null ? item.getReturnedQuantity() : BigDecimal.ZERO;
            BigDecimal remaining = item.getRemainingQuantity();
            BigDecimal pending = item.getPendingQuantity();

            BigDecimal shortage = pending.subtract(onHand);
            if (shortage.compareTo(BigDecimal.ZERO) < 0) {
                shortage = BigDecimal.ZERO;
            }

            String status;
            if (pending.compareTo(BigDecimal.ZERO) == 0) {
                status = "AVAILABLE";
                availableCount++;
            } else if (onHand.compareTo(pending) >= 0) {
                status = "AVAILABLE";
                availableCount++;
            } else if (onHand.compareTo(BigDecimal.ZERO) > 0) {
                status = "PARTIALLY_AVAILABLE";
                shortageCount++;
            } else {
                status = "NOT_AVAILABLE";
                shortageCount++;
            }

            items.add(MaterialAvailabilityItemResponse.builder()
                    .materialId(item.getMaterial().getId())
                    .materialCode(item.getMaterial().getItemCode())
                    .materialName(item.getMaterial().getName())
                    .bomQuantity(item.getBomQuantity())
                    .requiredQuantity(required)
                    .issuedQuantity(issued)
                    .consumedQuantity(consumed)
                    .returnedQuantity(returned)
                    .remainingQuantity(remaining)
                    .pendingQuantity(pending)
                    .onHandQuantity(onHand)
                    .shortageQuantity(shortage)
                    .availabilityStatus(status)
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .build());
        }

        String overallAvailability = shortageCount == 0 ? "ALL_MATERIALS_AVAILABLE" : "MATERIAL_SHORTAGE";

        return ProductionOrderAvailabilityResponse.builder()
                .productionOrderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .sourceWarehouseId(sourceWarehouseId)
                .sourceWarehouseCode(order.getSourceWarehouse().getWarehouseCode())
                .sourceWarehouseName(order.getSourceWarehouse().getName())
                .overallAvailability(overallAvailability)
                .totalComponents(order.getItems().size())
                .shortageCount(shortageCount)
                .availableCount(availableCount)
                .items(items)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextProductionOrderNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = productionOrderRepository.findMaxOrderNumberByOrganizationId(orgId);
        return String.format("%s%03d", MO_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional
    public ProductionOrderResponse createProductionOrder(Long orgId, CreateProductionOrderRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        Item product = itemRepository.findByIdAndOrganizationId(request.getProductId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        if (!product.isActive()) {
            throw new IllegalArgumentException("Cannot create production order for inactive product: " + product.getName());
        }

        Bom activeBom = bomRepository.findByOrganizationIdAndProductIdAndStatus(orgId, product.getId(), BomStatus.ACTIVE)
                .orElseThrow(() -> new IllegalStateException("Product (" + product.getName()
                        + ") does not have an active Bill of Materials. Only products with an active BOM can be manufactured."));

        if (activeBom.getItems().isEmpty()) {
            throw new IllegalStateException("Active BOM (" + activeBom.getBomCode() + ") has no component materials defined.");
        }

        if (request.getProductionQuantity() == null || request.getProductionQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Production quantity must be greater than zero.");
        }

        Warehouse sourceWarehouse = warehouseRepository.findByIdAndOrganizationId(request.getSourceWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Source warehouse not found with id: " + request.getSourceWarehouseId()));
        if (!sourceWarehouse.isActive()) {
            throw new IllegalArgumentException("Source warehouse is inactive: " + sourceWarehouse.getName());
        }

        Warehouse finishedGoodsWarehouse = warehouseRepository.findByIdAndOrganizationId(request.getFinishedGoodsWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Finished goods warehouse not found with id: " + request.getFinishedGoodsWarehouseId()));
        if (!finishedGoodsWarehouse.isActive()) {
            throw new IllegalArgumentException("Finished goods warehouse is inactive: " + finishedGoodsWarehouse.getName());
        }

        if (request.getPlannedStartDate() != null && request.getPlannedEndDate() != null
                && request.getPlannedEndDate().isBefore(request.getPlannedStartDate())) {
            throw new IllegalArgumentException("Planned end date cannot precede planned start date.");
        }

        String orderNumber = request.getOrderNumber();
        if (orderNumber == null || orderNumber.trim().isEmpty() || orderNumber.startsWith("MO-...")) {
            orderNumber = getNextProductionOrderNumber(orgId);
        } else {
            orderNumber = orderNumber.trim();
            if (productionOrderRepository.existsByOrganizationIdAndOrderNumber(orgId, orderNumber)) {
                throw new IllegalArgumentException("Production order number already exists: " + orderNumber);
            }
        }

        ProductionOrderStatus targetStatus = request.isReleaseImmediately()
                ? ProductionOrderStatus.RELEASED
                : ProductionOrderStatus.DRAFT;

        ProductionOrder order = ProductionOrder.builder()
                .organization(org)
                .orderNumber(orderNumber)
                .orderDate(request.getOrderDate())
                .product(product)
                .bom(activeBom)
                .bomCodeSnapshot(activeBom.getBomCode())
                .bomOutputQuantitySnapshot(activeBom.getOutputQuantity())
                .productionQuantity(request.getProductionQuantity())
                .unitOfMeasure(product.getUnitOfMeasure())
                .plannedStartDate(request.getPlannedStartDate())
                .plannedEndDate(request.getPlannedEndDate())
                .sourceWarehouse(sourceWarehouse)
                .finishedGoodsWarehouse(finishedGoodsWarehouse)
                .status(targetStatus)
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .items(new ArrayList<>())
                .build();

        attachCalculatedRequirements(order, activeBom, request.getProductionQuantity());

        ProductionOrder saved = productionOrderRepository.save(order);
        log.info("Created Production Order {} with status {} for org {}", saved.getOrderNumber(), saved.getStatus(), orgId);
        return mapToResponse(saved, true);
    }

    @Override
    @Transactional
    public ProductionOrderResponse updateProductionOrder(Long orgId, Long id, UpdateProductionOrderRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + id));

        if (order.getStatus() != ProductionOrderStatus.DRAFT) {
            throw new IllegalStateException("Only draft production orders can be edited. Released or cancelled orders cannot be modified.");
        }

        Item product = itemRepository.findByIdAndOrganizationId(request.getProductId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        if (!product.isActive()) {
            throw new IllegalArgumentException("Cannot update production order with inactive product: " + product.getName());
        }

        Bom activeBom = bomRepository.findByOrganizationIdAndProductIdAndStatus(orgId, product.getId(), BomStatus.ACTIVE)
                .orElseThrow(() -> new IllegalStateException("Product (" + product.getName()
                        + ") does not have an active Bill of Materials."));

        if (request.getProductionQuantity() == null || request.getProductionQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Production quantity must be greater than zero.");
        }

        Warehouse sourceWarehouse = warehouseRepository.findByIdAndOrganizationId(request.getSourceWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Source warehouse not found with id: " + request.getSourceWarehouseId()));
        if (!sourceWarehouse.isActive()) {
            throw new IllegalArgumentException("Source warehouse is inactive: " + sourceWarehouse.getName());
        }

        Warehouse finishedGoodsWarehouse = warehouseRepository.findByIdAndOrganizationId(request.getFinishedGoodsWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Finished goods warehouse not found with id: " + request.getFinishedGoodsWarehouseId()));
        if (!finishedGoodsWarehouse.isActive()) {
            throw new IllegalArgumentException("Finished goods warehouse is inactive: " + finishedGoodsWarehouse.getName());
        }

        if (request.getPlannedStartDate() != null && request.getPlannedEndDate() != null
                && request.getPlannedEndDate().isBefore(request.getPlannedStartDate())) {
            throw new IllegalArgumentException("Planned end date cannot precede planned start date.");
        }

        order.setOrderDate(request.getOrderDate());
        order.setProduct(product);
        order.setBom(activeBom);
        order.setBomCodeSnapshot(activeBom.getBomCode());
        order.setBomOutputQuantitySnapshot(activeBom.getOutputQuantity());
        order.setProductionQuantity(request.getProductionQuantity());
        order.setUnitOfMeasure(product.getUnitOfMeasure());
        order.setPlannedStartDate(request.getPlannedStartDate());
        order.setPlannedEndDate(request.getPlannedEndDate());
        order.setSourceWarehouse(sourceWarehouse);
        order.setFinishedGoodsWarehouse(finishedGoodsWarehouse);
        order.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);

        if (request.isReleaseImmediately()) {
            order.setStatus(ProductionOrderStatus.RELEASED);
        }

        order.getItems().clear();
        attachCalculatedRequirements(order, activeBom, request.getProductionQuantity());

        ProductionOrder saved = productionOrderRepository.save(order);
        log.info("Updated Production Order {} for org {}", saved.getOrderNumber(), orgId);
        return mapToResponse(saved, true);
    }

    @Override
    @Transactional
    public ProductionOrderResponse releaseProductionOrder(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + id));

        if (order.getStatus() == ProductionOrderStatus.RELEASED) {
            return mapToResponse(order, true);
        }

        if (order.getStatus() == ProductionOrderStatus.CANCELLED) {
            throw new IllegalStateException("Cancelled production orders cannot be released.");
        }

        // Lock snapshot
        if (order.getBom() != null) {
            order.setBomCodeSnapshot(order.getBom().getBomCode());
            order.setBomOutputQuantitySnapshot(order.getBom().getOutputQuantity());
        }

        order.setStatus(ProductionOrderStatus.RELEASED);
        ProductionOrder saved = productionOrderRepository.save(order);
        log.info("Released Production Order {} for org {}", saved.getOrderNumber(), orgId);
        return mapToResponse(saved, true);
    }

    @Override
    @Transactional
    public ProductionOrderResponse cancelProductionOrder(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + id));

        if (order.getStatus() == ProductionOrderStatus.CANCELLED) {
            return mapToResponse(order, true);
        }

        if (order.getStatus() == ProductionOrderStatus.IN_PROGRESS
                || order.getStatus() == ProductionOrderStatus.COMPLETED
                || order.getStatus() == ProductionOrderStatus.CLOSED
                || materialIssueRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(orgId, id, MaterialIssueStatus.POSTED)
                || materialConsumptionRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(orgId, id, MaterialConsumptionStatus.POSTED)
                || materialReturnRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(orgId, id, MaterialReturnStatus.POSTED)
                || productionReceiptRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(orgId, id, ProductionReceiptStatus.POSTED)) {
            throw new IllegalStateException("Production order with posted material or receipt transactions, or in completed/closed status cannot be cancelled.");
        }

        order.setStatus(ProductionOrderStatus.CANCELLED);
        ProductionOrder saved = productionOrderRepository.save(order);
        log.info("Cancelled Production Order {} for org {}", saved.getOrderNumber(), orgId);
        return mapToResponse(saved, true);
    }

    @Override
    @Transactional
    public void deleteDraftProductionOrder(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + id));

        if (order.getStatus() != ProductionOrderStatus.DRAFT) {
            throw new IllegalStateException("Only draft production orders can be deleted. Released or cancelled orders must be preserved for audit history.");
        }

        productionOrderRepository.delete(order);
        log.info("Deleted draft Production Order {} for org {}", order.getOrderNumber(), orgId);
    }

    @Override
    @Transactional(readOnly = true)
    public MaterialRequirementPreviewResponse previewRequirements(Long orgId, Long productId, BigDecimal productionQuantity) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Item product = itemRepository.findByIdAndOrganizationId(productId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        Bom activeBom = bomRepository.findByOrganizationIdAndProductIdAndStatus(orgId, product.getId(), BomStatus.ACTIVE)
                .orElseThrow(() -> new IllegalStateException("Product (" + product.getName()
                        + ") does not have an active Bill of Materials."));

        BigDecimal prodQty = productionQuantity != null && productionQuantity.compareTo(BigDecimal.ZERO) > 0
                ? productionQuantity
                : BigDecimal.ONE;

        BigDecimal bomOutputQty = activeBom.getOutputQuantity() != null && activeBom.getOutputQuantity().compareTo(BigDecimal.ZERO) > 0
                ? activeBom.getOutputQuantity()
                : BigDecimal.ONE;

        List<ProductionOrderItemResponse> items = activeBom.getItems().stream()
                .map(it -> {
                    BigDecimal reqQty = prodQty.divide(bomOutputQty, 6, RoundingMode.HALF_UP)
                            .multiply(it.getQuantity())
                            .setScale(4, RoundingMode.HALF_UP);

                    return ProductionOrderItemResponse.builder()
                            .materialId(it.getMaterial().getId())
                            .materialCode(it.getMaterial().getItemCode())
                            .materialName(it.getMaterial().getName())
                            .bomQuantity(it.getQuantity())
                            .requiredQuantity(reqQty)
                            .unitOfMeasure(it.getUnitOfMeasure())
                            .build();
                })
                .collect(Collectors.toList());

        return MaterialRequirementPreviewResponse.builder()
                .bomId(activeBom.getId())
                .bomCode(activeBom.getBomCode())
                .bomOutputQuantity(bomOutputQty)
                .productionQuantity(prodQty)
                .unitOfMeasure(product.getUnitOfMeasure())
                .items(items)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialTransactionResponse> getMaterialTransactions(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + id));

        List<MaterialTransactionResponse> transactions = new ArrayList<>();

        List<MaterialIssue> issues = materialIssueRepository
                .findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(orgId, id);
        for (MaterialIssue mi : issues) {
            BigDecimal totalQty = mi.getItems().stream()
                    .map(it -> it.getIssueQuantity() != null ? it.getIssueQuantity() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            transactions.add(MaterialTransactionResponse.builder()
                    .id(mi.getId())
                    .transactionType("MATERIAL_ISSUE")
                    .transactionTypeLabel("Material Issue")
                    .referenceNumber(mi.getIssueNumber())
                    .transactionDate(mi.getIssueDate())
                    .status(mi.getStatus().name())
                    .totalItems(mi.getItems().size())
                    .totalQuantity(totalQty)
                    .notes(mi.getNotes())
                    .createdAt(mi.getCreatedAt())
                    .build());
        }

        List<MaterialConsumption> consumptions = materialConsumptionRepository
                .findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(orgId, id);
        for (MaterialConsumption mc : consumptions) {
            BigDecimal totalQty = mc.getItems().stream()
                    .map(it -> it.getConsumedQuantity() != null ? it.getConsumedQuantity() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            transactions.add(MaterialTransactionResponse.builder()
                    .id(mc.getId())
                    .transactionType("MATERIAL_CONSUMPTION")
                    .transactionTypeLabel("Material Consumption")
                    .referenceNumber(mc.getConsumptionNumber())
                    .transactionDate(mc.getConsumptionDate())
                    .status(mc.getStatus().name())
                    .totalItems(mc.getItems().size())
                    .totalQuantity(totalQty)
                    .notes(mc.getNotes())
                    .createdAt(mc.getCreatedAt())
                    .build());
        }

        List<MaterialReturn> returns = materialReturnRepository
                .findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(orgId, id);
        for (MaterialReturn mr : returns) {
            BigDecimal totalQty = mr.getItems().stream()
                    .map(it -> it.getReturnQuantity() != null ? it.getReturnQuantity() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            transactions.add(MaterialTransactionResponse.builder()
                    .id(mr.getId())
                    .transactionType("MATERIAL_RETURN")
                    .transactionTypeLabel("Material Return")
                    .referenceNumber(mr.getReturnNumber())
                    .transactionDate(mr.getReturnDate())
                    .status(mr.getStatus().name())
                    .totalItems(mr.getItems().size())
                    .totalQuantity(totalQty)
                    .notes(mr.getNotes())
                    .createdAt(mr.getCreatedAt())
                    .build());
        }

        // Sort descending by createdAt, secondary by transactionDate
        transactions.sort(Comparator.comparing(
                MaterialTransactionResponse::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())
        ));

        return transactions;
    }

    @Override
    @Transactional
    public ProductionOrderResponse completeProductionOrder(Long orgId, Long id, String userEmail) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + id));

        if (order.getStatus() != ProductionOrderStatus.IN_PROGRESS) {
            throw new IllegalStateException("Production order can only be completed from In Progress status. Current status: " + order.getStatus());
        }

        // 1. Entire planned quantity must be received
        if (order.getPendingProductionQuantity().compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalStateException(String.format(
                    "Cannot complete production: entire planned quantity must be received first. Planned: %s %s, Received: %s %s, Pending: %s %s.",
                    order.getProductionQuantity().stripTrailingZeros().toPlainString(), order.getUnitOfMeasure(),
                    order.getReceivedQuantity().stripTrailingZeros().toPlainString(), order.getUnitOfMeasure(),
                    order.getPendingProductionQuantity().stripTrailingZeros().toPlainString(), order.getUnitOfMeasure()
            ));
        }

        // 2. Resolve or delete pending draft issues and receipts before completion
        boolean hasDraftIssues = materialIssueRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(
                orgId, id, MaterialIssueStatus.DRAFT
        );
        boolean hasDraftReceipts = productionReceiptRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(
                orgId, id, ProductionReceiptStatus.DRAFT
        );
        if (hasDraftIssues || hasDraftReceipts) {
            throw new IllegalStateException("Cannot complete production: pending draft material issues and production receipts must be resolved or deleted before completion.");
        }

        order.setStatus(ProductionOrderStatus.COMPLETED);
        order.setCompletedDate(LocalDate.now());
        order.setCompletedBy(userEmail != null ? userEmail : "System");
        ProductionOrder saved = productionOrderRepository.save(order);

        log.info("Production order {} completed for org {} by {}", saved.getOrderNumber(), orgId, order.getCompletedBy());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public ProductionOrderResponse closeProductionOrder(Long orgId, Long id, CloseProductionOrderRequest request, String userEmail) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + id));

        if (order.getStatus() != ProductionOrderStatus.COMPLETED) {
            throw new IllegalStateException("Production order must be Completed before it can be closed. Current status: " + order.getStatus());
        }

        // 1. All planned quantities received
        if (order.getPendingProductionQuantity().compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalStateException("Cannot close production order: all planned quantities must be received.");
        }

        // 2. All issued materials reconciled: Remaining = Issued - Consumed - Returned == 0
        for (ProductionOrderItem item : order.getItems()) {
            if (item.getRemainingQuantity().compareTo(BigDecimal.ZERO) != 0) {
                throw new IllegalStateException(String.format(
                        "Cannot close production order: all issued materials must be reconciled. Material '%s' has remaining issued quantity: %s %s.",
                        item.getMaterial().getName(),
                        item.getRemainingQuantity().stripTrailingZeros().toPlainString(),
                        item.getUnitOfMeasure()
                ));
            }
        }

        // 3. No pending draft transactions allowed during closure
        boolean hasDraftIssues = materialIssueRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(
                orgId, id, MaterialIssueStatus.DRAFT
        );
        boolean hasDraftConsumptions = materialConsumptionRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(
                orgId, id, MaterialConsumptionStatus.DRAFT
        );
        boolean hasDraftReturns = materialReturnRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(
                orgId, id, MaterialReturnStatus.DRAFT
        );
        boolean hasDraftReceipts = productionReceiptRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(
                orgId, id, ProductionReceiptStatus.DRAFT
        );

        if (hasDraftIssues || hasDraftConsumptions || hasDraftReturns || hasDraftReceipts) {
            throw new IllegalStateException("Cannot close production order: please post or delete all pending draft transactions before closing.");
        }

        order.setStatus(ProductionOrderStatus.CLOSED);
        order.setClosedDate(LocalDate.now());
        order.setClosedBy(userEmail != null ? userEmail : "System");
        if (request != null && request.getClosureNotes() != null) {
            order.setClosureNotes(request.getClosureNotes().trim());
        }
        ProductionOrder saved = productionOrderRepository.save(order);

        log.info("Production order {} closed for org {} by {}", saved.getOrderNumber(), orgId, order.getClosedBy());
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductionOrderClosureValidationResponse getClosureValidation(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + id));

        boolean productionCompleted = order.getStatus() == ProductionOrderStatus.COMPLETED || order.getStatus() == ProductionOrderStatus.CLOSED;
        boolean allPlannedQuantitiesReceived = order.getPendingProductionQuantity().compareTo(BigDecimal.ZERO) <= 0;

        int unreconciledCount = 0;
        List<MaterialReconciliationItemResponse> materials = new ArrayList<>();
        for (ProductionOrderItem item : order.getItems()) {
            BigDecimal issued = item.getIssuedQuantity() != null ? item.getIssuedQuantity() : BigDecimal.ZERO;
            BigDecimal consumed = item.getConsumedQuantity() != null ? item.getConsumedQuantity() : BigDecimal.ZERO;
            BigDecimal returned = item.getReturnedQuantity() != null ? item.getReturnedQuantity() : BigDecimal.ZERO;
            BigDecimal remaining = item.getRemainingQuantity();

            boolean isReconciled = remaining.compareTo(BigDecimal.ZERO) == 0;
            if (!isReconciled) {
                unreconciledCount++;
            }

            materials.add(MaterialReconciliationItemResponse.builder()
                    .materialId(item.getMaterial().getId())
                    .materialCode(item.getMaterial().getItemCode())
                    .materialName(item.getMaterial().getName())
                    .issuedQuantity(issued)
                    .consumedQuantity(consumed)
                    .returnedQuantity(returned)
                    .remainingQuantity(remaining)
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .reconciled(isReconciled)
                    .build());
        }

        int draftCount = 0;
        if (materialIssueRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(orgId, id, MaterialIssueStatus.DRAFT)) draftCount++;
        if (materialConsumptionRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(orgId, id, MaterialConsumptionStatus.DRAFT)) draftCount++;
        if (materialReturnRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(orgId, id, MaterialReturnStatus.DRAFT)) draftCount++;
        if (productionReceiptRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(orgId, id, ProductionReceiptStatus.DRAFT)) draftCount++;

        boolean allMaterialsReconciled = unreconciledCount == 0;
        boolean noPendingDraftTransactions = draftCount == 0;
        boolean canClose = productionCompleted && allPlannedQuantitiesReceived && allMaterialsReconciled && noPendingDraftTransactions;

        return ProductionOrderClosureValidationResponse.builder()
                .productionOrderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus().name())
                .plannedQuantity(order.getProductionQuantity())
                .receivedQuantity(order.getReceivedQuantity())
                .unitOfMeasure(order.getUnitOfMeasure())
                .productionCompleted(productionCompleted)
                .allPlannedQuantitiesReceived(allPlannedQuantitiesReceived)
                .allMaterialsReconciled(allMaterialsReconciled)
                .noPendingDraftTransactions(noPendingDraftTransactions)
                .canClose(canClose)
                .unreconciledMaterialsCount(unreconciledCount)
                .pendingDraftTransactionsCount(draftCount)
                .materials(materials)
                .build();
    }

    private void attachCalculatedRequirements(ProductionOrder order, Bom bom, BigDecimal productionQuantity) {
        BigDecimal bomOutputQty = bom.getOutputQuantity() != null && bom.getOutputQuantity().compareTo(BigDecimal.ZERO) > 0
                ? bom.getOutputQuantity()
                : BigDecimal.ONE;

        for (BomItem bomItem : bom.getItems()) {
            BigDecimal requiredQty = productionQuantity.divide(bomOutputQty, 6, RoundingMode.HALF_UP)
                    .multiply(bomItem.getQuantity())
                    .setScale(4, RoundingMode.HALF_UP);

            ProductionOrderItem orderItem = ProductionOrderItem.builder()
                    .productionOrder(order)
                    .material(bomItem.getMaterial())
                    .bomQuantity(bomItem.getQuantity())
                    .requiredQuantity(requiredQty)
                    .unitOfMeasure(bomItem.getUnitOfMeasure())
                    .build();

            order.getItems().add(orderItem);
        }
    }

    private ProductionOrderResponse mapToResponse(ProductionOrder order) {
        return mapToResponse(order, false);
    }

    private ProductionOrderResponse mapToResponse(ProductionOrder order, boolean calculateAvailability) {
        Long orgId = order.getOrganization().getId();
        Long sourceWarehouseId = order.getSourceWarehouse().getId();
        int shortageCount = 0;
        List<ProductionOrderItemResponse> itemResponses = new ArrayList<>();

        for (ProductionOrderItem it : order.getItems()) {
            BigDecimal onHand = null;
            BigDecimal shortage = null;
            String status = null;

            BigDecimal required = it.getRequiredQuantity();
            BigDecimal issued = it.getIssuedQuantity() != null ? it.getIssuedQuantity() : BigDecimal.ZERO;
            BigDecimal consumed = it.getConsumedQuantity() != null ? it.getConsumedQuantity() : BigDecimal.ZERO;
            BigDecimal returned = it.getReturnedQuantity() != null ? it.getReturnedQuantity() : BigDecimal.ZERO;
            BigDecimal remaining = it.getRemainingQuantity();
            BigDecimal pending = it.getPendingQuantity();

            if (calculateAvailability) {
                BigDecimal currentStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(
                        orgId, it.getMaterial().getId(), sourceWarehouseId
                );
                onHand = currentStock != null ? currentStock : BigDecimal.ZERO;
                BigDecimal rawShortage = pending.subtract(onHand);
                shortage = rawShortage.compareTo(BigDecimal.ZERO) > 0 ? rawShortage : BigDecimal.ZERO;

                if (pending.compareTo(BigDecimal.ZERO) == 0) {
                    status = "AVAILABLE";
                } else if (onHand.compareTo(pending) >= 0) {
                    status = "AVAILABLE";
                } else if (onHand.compareTo(BigDecimal.ZERO) > 0) {
                    status = "PARTIALLY_AVAILABLE";
                    shortageCount++;
                } else {
                    status = "NOT_AVAILABLE";
                    shortageCount++;
                }
            }

            itemResponses.add(ProductionOrderItemResponse.builder()
                    .id(it.getId())
                    .materialId(it.getMaterial().getId())
                    .materialCode(it.getMaterial().getItemCode())
                    .materialName(it.getMaterial().getName())
                    .bomQuantity(it.getBomQuantity())
                    .requiredQuantity(required)
                    .issuedQuantity(issued)
                    .consumedQuantity(consumed)
                    .returnedQuantity(returned)
                    .remainingQuantity(remaining)
                    .pendingQuantity(pending)
                    .unitOfMeasure(it.getUnitOfMeasure())
                    .onHandQuantity(onHand)
                    .shortageQuantity(shortage)
                    .availabilityStatus(status)
                    .build());
        }

        String overallAvailability = calculateAvailability
                ? (shortageCount == 0 ? "ALL_MATERIALS_AVAILABLE" : "MATERIAL_SHORTAGE")
                : null;

        String bomCode = order.getBomCodeSnapshot() != null
                ? order.getBomCodeSnapshot()
                : (order.getBom() != null ? order.getBom().getBomCode() : null);

        BigDecimal bomOutputQty = order.getBomOutputQuantitySnapshot() != null
                ? order.getBomOutputQuantitySnapshot()
                : (order.getBom() != null ? order.getBom().getOutputQuantity() : BigDecimal.ONE);

        return ProductionOrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .orderDate(order.getOrderDate())
                .productId(order.getProduct().getId())
                .productCode(order.getProduct().getItemCode())
                .productName(order.getProduct().getName())
                .bomId(order.getBom() != null ? order.getBom().getId() : null)
                .bomCode(bomCode)
                .bomOutputQuantity(bomOutputQty)
                .productionQuantity(order.getProductionQuantity())
                .receivedQuantity(order.getReceivedQuantity())
                .pendingProductionQuantity(order.getPendingProductionQuantity())
                .productionProgress(order.getProductionProgress())
                .unitOfMeasure(order.getUnitOfMeasure())
                .plannedStartDate(order.getPlannedStartDate())
                .plannedEndDate(order.getPlannedEndDate())
                .sourceWarehouseId(order.getSourceWarehouse().getId())
                .sourceWarehouseCode(order.getSourceWarehouse().getWarehouseCode())
                .sourceWarehouseName(order.getSourceWarehouse().getName())
                .finishedGoodsWarehouseId(order.getFinishedGoodsWarehouse().getId())
                .finishedGoodsWarehouseCode(order.getFinishedGoodsWarehouse().getWarehouseCode())
                .finishedGoodsWarehouseName(order.getFinishedGoodsWarehouse().getName())
                .status(order.getStatus())
                .notes(order.getNotes())
                .completedDate(order.getCompletedDate())
                .completedBy(order.getCompletedBy())
                .closedDate(order.getClosedDate())
                .closedBy(order.getClosedBy())
                .closureNotes(order.getClosureNotes())
                .totalComponents(order.getItems().size())
                .overallAvailability(overallAvailability)
                .shortageCount(calculateAvailability ? shortageCount : 0)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .items(itemResponses)
                .build();
    }
}
