package si.plaan.service.impl;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateStockAdjustmentRequest;
import si.plaan.dto.request.StockAdjustmentItemRequest;
import si.plaan.dto.request.UpdateStockAdjustmentRequest;
import si.plaan.dto.response.ItemOnHandStockResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.StockAdjustmentItemResponse;
import si.plaan.dto.response.StockAdjustmentResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.*;
import si.plaan.service.StockAdjustmentService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockAdjustmentServiceImpl implements StockAdjustmentService {

    private final StockAdjustmentRepository stockAdjustmentRepository;
    private final StockAdjustmentItemRepository stockAdjustmentItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final OrganizationRepository organizationRepository;
    private final WarehouseRepository warehouseRepository;
    private final ItemRepository itemRepository;

    private static final String SA_PREFIX = "SA-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StockAdjustmentResponse> getStockAdjustments(
            Long orgId,
            String search,
            StockAdjustmentStatus status,
            Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<StockAdjustment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate numberLike = cb.like(cb.lower(root.get("adjustmentNumber")), pattern);
                Predicate warehouseNameLike = cb.like(cb.lower(root.get("warehouse").get("name")), pattern);
                Predicate warehouseCodeLike = cb.like(cb.lower(root.get("warehouse").get("warehouseCode")), pattern);
                Predicate reasonLike = cb.like(cb.lower(root.get("reason")), pattern);
                Predicate notesLike = cb.like(cb.lower(root.get("notes")), pattern);

                if (query != null) {
                    query.distinct(true);
                }
                Join<StockAdjustment, StockAdjustmentItem> itemsJoin = root.join("items", JoinType.LEFT);
                Predicate itemNameLike = cb.like(cb.lower(itemsJoin.get("item").get("name")), pattern);
                Predicate itemCodeLike = cb.like(cb.lower(itemsJoin.get("item").get("itemCode")), pattern);

                predicates.add(cb.or(numberLike, warehouseNameLike, warehouseCodeLike, reasonLike, notesLike, itemNameLike, itemCodeLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<StockAdjustment> page = stockAdjustmentRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public StockAdjustmentResponse getStockAdjustmentById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        StockAdjustment sa = stockAdjustmentRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock adjustment document not found with id: " + id));
        return mapToResponse(sa);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextAdjustmentNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = stockAdjustmentRepository.findMaxAdjustmentNumberByOrganizationId(orgId);
        return String.format("%s%03d", SA_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ItemOnHandStockResponse> getWarehouseStock(Long orgId, Long warehouseId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        Warehouse wh = warehouseRepository.findByIdAndOrganizationId(warehouseId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + warehouseId));

        List<Item> activeItems = itemRepository.findByOrganizationIdAndActiveTrue(orgId);
        List<ItemOnHandStockResponse> result = new ArrayList<>();

        for (Item item : activeItems) {
            BigDecimal onHand = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgId, item.getId(), wh.getId());
            result.add(new ItemOnHandStockResponse(
                    item.getId(),
                    item.getItemCode(),
                    item.getName(),
                    item.getUnitOfMeasure(),
                    onHand != null ? onHand : BigDecimal.ZERO
            ));
        }

        return result;
    }

    @Override
    @Transactional
    public StockAdjustmentResponse createStockAdjustment(Long orgId, CreateStockAdjustmentRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(request.getWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + request.getWarehouseId()));
        if (!warehouse.isActive()) {
            throw new IllegalArgumentException("Cannot adjust stock in an inactive warehouse: " + warehouse.getName());
        }

        if (request.getReason() == null || request.getReason().trim().isBlank()) {
            throw new IllegalArgumentException("Adjustment reason is required");
        }

        if ("other".equalsIgnoreCase(request.getReason().trim()) && (request.getNotes() == null || request.getNotes().trim().isBlank())) {
            throw new IllegalArgumentException("Notes are required when Reason is 'Other'");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one item is required for stock adjustment");
        }

        // Validate duplicates
        Set<Long> seenItemIds = new HashSet<>();
        for (StockAdjustmentItemRequest itemReq : request.getItems()) {
            if (!seenItemIds.add(itemReq.getItemId())) {
                Item dupItem = itemRepository.findByIdAndOrganizationId(itemReq.getItemId(), orgId).orElse(null);
                String itemName = dupItem != null ? dupItem.getName() : "ID " + itemReq.getItemId();
                throw new IllegalArgumentException("Duplicate item found in adjustment: " + itemName + ". Each item can only be listed once.");
            }
        }

        String adjustmentNumber = getNextAdjustmentNumber(orgId);
        LocalDate adjustmentDate = request.getAdjustmentDate() != null ? request.getAdjustmentDate() : LocalDate.now();

        StockAdjustment sa = StockAdjustment.builder()
                .organization(org)
                .adjustmentNumber(adjustmentNumber)
                .warehouse(warehouse)
                .adjustmentDate(adjustmentDate)
                .reason(request.getReason().trim())
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .status(StockAdjustmentStatus.DRAFT)
                .build();

        boolean hasNonZeroDifference = false;

        for (StockAdjustmentItemRequest itemReq : request.getItems()) {
            Item item = itemRepository.findByIdAndOrganizationId(itemReq.getItemId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemReq.getItemId()));
            if (!item.isActive()) {
                throw new IllegalArgumentException("Cannot adjust stock for inactive item: " + item.getName());
            }

            if (itemReq.getPhysicalQuantity() == null || itemReq.getPhysicalQuantity().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Physical quantity cannot be negative for item: " + item.getName());
            }

            BigDecimal currentStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgId, item.getId(), warehouse.getId());
            if (currentStock == null) {
                currentStock = BigDecimal.ZERO;
            }

            BigDecimal diff = itemReq.getPhysicalQuantity().subtract(currentStock);
            if (diff.compareTo(BigDecimal.ZERO) != 0) {
                hasNonZeroDifference = true;
            }

            StockAdjustmentItem sai = StockAdjustmentItem.builder()
                    .item(item)
                    .systemQuantity(currentStock)
                    .physicalQuantity(itemReq.getPhysicalQuantity())
                    .adjustmentQuantity(diff)
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .build();

            sa.addItem(sai);
        }

        if (request.isPostImmediately()) {
            if (!hasNonZeroDifference) {
                throw new IllegalArgumentException("At least one item must have a non-zero adjustment difference before posting");
            }
        }

        sa = stockAdjustmentRepository.save(sa);

        if (request.isPostImmediately()) {
            return postStockAdjustment(orgId, sa.getId());
        }

        return mapToResponse(sa);
    }

    @Override
    @Transactional
    public StockAdjustmentResponse updateStockAdjustment(Long orgId, Long id, UpdateStockAdjustmentRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        StockAdjustment sa = stockAdjustmentRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock adjustment not found with id: " + id));

        if (sa.getStatus() != StockAdjustmentStatus.DRAFT) {
            throw new IllegalStateException("Only draft stock adjustments can be edited. Current status: " + sa.getStatus());
        }

        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(request.getWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + request.getWarehouseId()));
        if (!warehouse.isActive()) {
            throw new IllegalArgumentException("Cannot adjust stock in an inactive warehouse: " + warehouse.getName());
        }

        if (request.getReason() == null || request.getReason().trim().isBlank()) {
            throw new IllegalArgumentException("Adjustment reason is required");
        }

        if ("other".equalsIgnoreCase(request.getReason().trim()) && (request.getNotes() == null || request.getNotes().trim().isBlank())) {
            throw new IllegalArgumentException("Notes are required when Reason is 'Other'");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one item is required for stock adjustment");
        }

        // Validate duplicates
        Set<Long> seenItemIds = new HashSet<>();
        for (StockAdjustmentItemRequest itemReq : request.getItems()) {
            if (!seenItemIds.add(itemReq.getItemId())) {
                Item dupItem = itemRepository.findByIdAndOrganizationId(itemReq.getItemId(), orgId).orElse(null);
                String itemName = dupItem != null ? dupItem.getName() : "ID " + itemReq.getItemId();
                throw new IllegalArgumentException("Duplicate item found in adjustment: " + itemName + ". Each item can only be listed once.");
            }
        }

        sa.setWarehouse(warehouse);
        sa.setAdjustmentDate(request.getAdjustmentDate() != null ? request.getAdjustmentDate() : LocalDate.now());
        sa.setReason(request.getReason().trim());
        sa.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);

        sa.clearItems();

        for (StockAdjustmentItemRequest itemReq : request.getItems()) {
            Item item = itemRepository.findByIdAndOrganizationId(itemReq.getItemId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemReq.getItemId()));
            if (!item.isActive()) {
                throw new IllegalArgumentException("Cannot adjust stock for inactive item: " + item.getName());
            }

            if (itemReq.getPhysicalQuantity() == null || itemReq.getPhysicalQuantity().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Physical quantity cannot be negative for item: " + item.getName());
            }

            BigDecimal currentStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgId, item.getId(), warehouse.getId());
            if (currentStock == null) {
                currentStock = BigDecimal.ZERO;
            }

            BigDecimal diff = itemReq.getPhysicalQuantity().subtract(currentStock);

            StockAdjustmentItem sai = StockAdjustmentItem.builder()
                    .item(item)
                    .systemQuantity(currentStock)
                    .physicalQuantity(itemReq.getPhysicalQuantity())
                    .adjustmentQuantity(diff)
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .build();

            sa.addItem(sai);
        }

        sa = stockAdjustmentRepository.save(sa);
        return mapToResponse(sa);
    }

    @Override
    @Transactional
    public StockAdjustmentResponse postStockAdjustment(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        StockAdjustment sa = stockAdjustmentRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock adjustment not found with id: " + id));

        if (sa.getStatus() != StockAdjustmentStatus.DRAFT) {
            throw new IllegalStateException("Only draft stock adjustments can be posted. Current status: " + sa.getStatus());
        }

        if (sa.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cannot post stock adjustment without line items");
        }

        boolean hasNonZeroDifference = false;

        // Verify stale stock detection and non-zero differences
        for (StockAdjustmentItem item : sa.getItems()) {
            BigDecimal currentStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(
                    orgId,
                    item.getItem().getId(),
                    sa.getWarehouse().getId()
            );
            if (currentStock == null) {
                currentStock = BigDecimal.ZERO;
            }

            // Stale stock check: if system stock changed since drafting, abort!
            if (currentStock.compareTo(item.getSystemQuantity()) != 0) {
                throw new IllegalStateException(String.format(
                        "System stock for item '%s' (%s) has changed from %s to %s. Please review and refresh the adjustment quantities before posting.",
                        item.getItem().getName(),
                        item.getItem().getItemCode(),
                        item.getSystemQuantity(),
                        currentStock
                ));
            }

            if (item.getAdjustmentQuantity().compareTo(BigDecimal.ZERO) != 0) {
                hasNonZeroDifference = true;
            }
        }

        if (!hasNonZeroDifference) {
            throw new IllegalArgumentException("At least one item must have a non-zero adjustment difference before posting");
        }

        // Atomic generation of stock movements
        for (StockAdjustmentItem item : sa.getItems()) {
            BigDecimal diff = item.getAdjustmentQuantity();

            if (diff.compareTo(BigDecimal.ZERO) > 0) {
                // Positive adjustment: ADJUSTMENT_IN
                StockMovement smIn = StockMovement.builder()
                        .organization(sa.getOrganization())
                        .stockAdjustment(sa)
                        .warehouse(sa.getWarehouse())
                        .item(item.getItem())
                        .movementType("ADJUSTMENT_IN")
                        .quantity(diff)
                        .unitOfMeasure(item.getUnitOfMeasure())
                        .movementDate(sa.getAdjustmentDate())
                        .referenceNumber(sa.getAdjustmentNumber())
                        .build();
                stockMovementRepository.save(smIn);
            } else if (diff.compareTo(BigDecimal.ZERO) < 0) {
                // Negative adjustment: ADJUSTMENT_OUT
                StockMovement smOut = StockMovement.builder()
                        .organization(sa.getOrganization())
                        .stockAdjustment(sa)
                        .warehouse(sa.getWarehouse())
                        .item(item.getItem())
                        .movementType("ADJUSTMENT_OUT")
                        .quantity(diff.abs())
                        .unitOfMeasure(item.getUnitOfMeasure())
                        .movementDate(sa.getAdjustmentDate())
                        .referenceNumber(sa.getAdjustmentNumber())
                        .build();
                stockMovementRepository.save(smOut);
            }
            // diff == 0: zero difference -> no movement generated
        }

        sa.setStatus(StockAdjustmentStatus.POSTED);
        sa = stockAdjustmentRepository.save(sa);

        log.info("Stock adjustment {} posted successfully for orgId: {}", sa.getAdjustmentNumber(), orgId);
        return mapToResponse(sa);
    }

    @Override
    @Transactional
    public StockAdjustmentResponse cancelStockAdjustment(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        StockAdjustment sa = stockAdjustmentRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock adjustment not found with id: " + id));

        if (sa.getStatus() != StockAdjustmentStatus.DRAFT) {
            throw new IllegalStateException("Only draft stock adjustments can be cancelled. Current status: " + sa.getStatus());
        }

        sa.setStatus(StockAdjustmentStatus.CANCELLED);
        sa = stockAdjustmentRepository.save(sa);

        log.info("Stock adjustment {} cancelled for orgId: {}", sa.getAdjustmentNumber(), orgId);
        return mapToResponse(sa);
    }

    private StockAdjustmentResponse mapToResponse(StockAdjustment sa) {
        List<StockAdjustmentItemResponse> itemResponses = sa.getItems().stream()
                .map(it -> new StockAdjustmentItemResponse(
                        it.getId(),
                        it.getItem().getId(),
                        it.getItem().getItemCode(),
                        it.getItem().getName(),
                        it.getSystemQuantity(),
                        it.getPhysicalQuantity(),
                        it.getAdjustmentQuantity(),
                        it.getUnitOfMeasure()
                ))
                .collect(Collectors.toList());

        BigDecimal totalDiff = sa.getItems().stream()
                .map(StockAdjustmentItem::getAdjustmentQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return StockAdjustmentResponse.builder()
                .id(sa.getId())
                .adjustmentNumber(sa.getAdjustmentNumber())
                .warehouseId(sa.getWarehouse().getId())
                .warehouseCode(sa.getWarehouse().getWarehouseCode())
                .warehouseName(sa.getWarehouse().getName())
                .adjustmentDate(sa.getAdjustmentDate())
                .reason(sa.getReason())
                .notes(sa.getNotes())
                .status(sa.getStatus())
                .totalItems(sa.getItems().size())
                .totalDifference(totalDiff)
                .items(itemResponses)
                .createdAt(sa.getCreatedAt())
                .updatedAt(sa.getUpdatedAt())
                .build();
    }
}
