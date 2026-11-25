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
import si.plaan.dto.request.CreateStockTransferRequest;
import si.plaan.dto.request.StockTransferItemRequest;
import si.plaan.dto.request.UpdateStockTransferRequest;
import si.plaan.dto.response.ItemOnHandStockResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.StockTransferItemResponse;
import si.plaan.dto.response.StockTransferResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.*;
import si.plaan.service.StockTransferService;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockTransferServiceImpl implements StockTransferService {

    private final StockTransferRepository stockTransferRepository;
    private final StockTransferItemRepository stockTransferItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final OrganizationRepository organizationRepository;
    private final WarehouseRepository warehouseRepository;
    private final ItemRepository itemRepository;

    private static final String ST_PREFIX = "ST-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StockTransferResponse> getStockTransfers(
            Long orgId,
            String search,
            StockTransferStatus status,
            Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<StockTransfer> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate numberLike = cb.like(cb.lower(root.get("transferNumber")), pattern);
                Predicate fromNameLike = cb.like(cb.lower(root.get("fromWarehouse").get("name")), pattern);
                Predicate fromCodeLike = cb.like(cb.lower(root.get("fromWarehouse").get("warehouseCode")), pattern);
                Predicate toNameLike = cb.like(cb.lower(root.get("toWarehouse").get("name")), pattern);
                Predicate toCodeLike = cb.like(cb.lower(root.get("toWarehouse").get("warehouseCode")), pattern);
                Predicate notesLike = cb.like(cb.lower(root.get("notes")), pattern);

                if (query != null) {
                    query.distinct(true);
                }
                Join<StockTransfer, StockTransferItem> itemsJoin = root.join("items", JoinType.LEFT);
                Predicate itemNameLike = cb.like(cb.lower(itemsJoin.get("item").get("name")), pattern);
                Predicate itemCodeLike = cb.like(cb.lower(itemsJoin.get("item").get("itemCode")), pattern);

                predicates.add(cb.or(numberLike, fromNameLike, fromCodeLike, toNameLike, toCodeLike, notesLike, itemNameLike, itemCodeLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<StockTransfer> page = stockTransferRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public StockTransferResponse getStockTransferById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        StockTransfer st = stockTransferRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock transfer document not found with id: " + id));
        return mapToResponse(st);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextTransferNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = stockTransferRepository.findMaxTransferNumberByOrganizationId(orgId);
        return String.format("%s%03d", ST_PREFIX, maxNum + 1);
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
            result.add(ItemOnHandStockResponse.builder()
                    .itemId(item.getId())
                    .itemCode(item.getItemCode())
                    .itemName(item.getName())
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .onHandQuantity(onHand)
                    .build());
        }

        return result;
    }

    @Override
    @Transactional
    public StockTransferResponse createStockTransfer(Long orgId, CreateStockTransferRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        if (request.getFromWarehouseId().equals(request.getToWarehouseId())) {
            throw new IllegalArgumentException("Source and destination warehouses must be different");
        }

        Warehouse fromWarehouse = warehouseRepository.findByIdAndOrganizationId(request.getFromWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Source warehouse not found with id: " + request.getFromWarehouseId()));

        Warehouse toWarehouse = warehouseRepository.findByIdAndOrganizationId(request.getToWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Destination warehouse not found with id: " + request.getToWarehouseId()));

        if (!fromWarehouse.isActive()) {
            throw new IllegalArgumentException("Source warehouse '" + fromWarehouse.getName() + "' is inactive");
        }
        if (!toWarehouse.isActive()) {
            throw new IllegalArgumentException("Destination warehouse '" + toWarehouse.getName() + "' is inactive");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one item is required");
        }

        String stNumber = request.getTransferNumber();
        if (stNumber == null || stNumber.trim().isBlank()) {
            stNumber = getNextTransferNumber(orgId);
        } else {
            stNumber = stNumber.trim();
            if (stockTransferRepository.existsByOrganizationIdAndTransferNumber(orgId, stNumber)) {
                throw new IllegalArgumentException("Stock transfer number already exists: " + stNumber);
            }
        }

        StockTransfer transfer = StockTransfer.builder()
                .organization(org)
                .transferNumber(stNumber)
                .fromWarehouse(fromWarehouse)
                .toWarehouse(toWarehouse)
                .transferDate(request.getTransferDate())
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .status(StockTransferStatus.DRAFT)
                .build();

        populateAndValidateItems(orgId, fromWarehouse, transfer, request.getItems(), Boolean.TRUE.equals(request.getPostImmediately()));

        StockTransfer saved = stockTransferRepository.save(transfer);

        if (Boolean.TRUE.equals(request.getPostImmediately())) {
            return postStockTransfer(orgId, saved.getId());
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public StockTransferResponse updateStockTransfer(Long orgId, Long id, UpdateStockTransferRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        StockTransfer transfer = stockTransferRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock transfer document not found with id: " + id));

        if (transfer.getStatus() != StockTransferStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft stock transfer documents can be edited");
        }

        if (request.getFromWarehouseId().equals(request.getToWarehouseId())) {
            throw new IllegalArgumentException("Source and destination warehouses must be different");
        }

        Warehouse fromWarehouse = warehouseRepository.findByIdAndOrganizationId(request.getFromWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Source warehouse not found with id: " + request.getFromWarehouseId()));

        Warehouse toWarehouse = warehouseRepository.findByIdAndOrganizationId(request.getToWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Destination warehouse not found with id: " + request.getToWarehouseId()));

        if (!fromWarehouse.isActive()) {
            throw new IllegalArgumentException("Source warehouse '" + fromWarehouse.getName() + "' is inactive");
        }
        if (!toWarehouse.isActive()) {
            throw new IllegalArgumentException("Destination warehouse '" + toWarehouse.getName() + "' is inactive");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one item is required");
        }

        transfer.setFromWarehouse(fromWarehouse);
        transfer.setToWarehouse(toWarehouse);
        transfer.setTransferDate(request.getTransferDate());
        transfer.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);

        transfer.clearItems();
        populateAndValidateItems(orgId, fromWarehouse, transfer, request.getItems(), false);

        StockTransfer saved = stockTransferRepository.save(transfer);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public StockTransferResponse postStockTransfer(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        StockTransfer transfer = stockTransferRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock transfer document not found with id: " + id));

        if (transfer.getStatus() == StockTransferStatus.POSTED) {
            throw new IllegalArgumentException("Stock transfer document is already posted");
        }
        if (transfer.getStatus() == StockTransferStatus.CANCELLED) {
            throw new IllegalArgumentException("Cancelled stock transfer documents cannot be posted");
        }

        Warehouse fromWarehouse = transfer.getFromWarehouse();
        Warehouse toWarehouse = transfer.getToWarehouse();

        if (fromWarehouse.getId().equals(toWarehouse.getId())) {
            throw new IllegalArgumentException("Source and destination warehouses must be different");
        }
        if (!fromWarehouse.isActive()) {
            throw new IllegalArgumentException("Source warehouse '" + fromWarehouse.getName() + "' is inactive");
        }
        if (!toWarehouse.isActive()) {
            throw new IllegalArgumentException("Destination warehouse '" + toWarehouse.getName() + "' is inactive");
        }

        // Re-validate stock availability for each item in source warehouse
        for (StockTransferItem item : transfer.getItems()) {
            Item it = item.getItem();
            if (!it.isActive()) {
                throw new IllegalArgumentException("Item '" + it.getName() + "' is inactive");
            }
            BigDecimal available = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgId, it.getId(), fromWarehouse.getId());
            if (available.compareTo(item.getTransferQuantity()) < 0) {
                throw new IllegalArgumentException("Insufficient stock for item " + it.getItemCode() + " (" + it.getName() + ") in " + fromWarehouse.getName() + ". Available: " + available + " " + item.getUnitOfMeasure() + ", Requested: " + item.getTransferQuantity() + " " + item.getUnitOfMeasure());
            }
        }

        // Generate incoming and outgoing movements atomically
        List<StockMovement> movements = new ArrayList<>();
        for (StockTransferItem item : transfer.getItems()) {
            // 1. Outgoing movement from Source Warehouse
            StockMovement outMovement = StockMovement.builder()
                    .organization(transfer.getOrganization())
                    .warehouse(fromWarehouse)
                    .item(item.getItem())
                    .stockTransfer(transfer)
                    .goodsReceipt(null)
                    .purchaseOrder(null)
                    .openingStock(null)
                    .movementType("TRANSFER_OUT")
                    .quantity(item.getTransferQuantity())
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .movementDate(transfer.getTransferDate())
                    .referenceNumber(transfer.getTransferNumber())
                    .build();
            movements.add(outMovement);

            // 2. Incoming movement to Destination Warehouse
            StockMovement inMovement = StockMovement.builder()
                    .organization(transfer.getOrganization())
                    .warehouse(toWarehouse)
                    .item(item.getItem())
                    .stockTransfer(transfer)
                    .goodsReceipt(null)
                    .purchaseOrder(null)
                    .openingStock(null)
                    .movementType("TRANSFER_IN")
                    .quantity(item.getTransferQuantity())
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .movementDate(transfer.getTransferDate())
                    .referenceNumber(transfer.getTransferNumber())
                    .build();
            movements.add(inMovement);
        }
        stockMovementRepository.saveAll(movements);

        transfer.setStatus(StockTransferStatus.POSTED);
        StockTransfer saved = stockTransferRepository.save(transfer);

        log.info("Posted stock transfer {} with {} movements between {} and {} for org {}",
                saved.getTransferNumber(), movements.size(), fromWarehouse.getWarehouseCode(), toWarehouse.getWarehouseCode(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public StockTransferResponse cancelStockTransfer(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        StockTransfer transfer = stockTransferRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock transfer document not found with id: " + id));

        if (transfer.getStatus() != StockTransferStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft stock transfer documents can be cancelled");
        }

        transfer.setStatus(StockTransferStatus.CANCELLED);
        StockTransfer saved = stockTransferRepository.save(transfer);
        return mapToResponse(saved);
    }

    private void populateAndValidateItems(Long orgId, Warehouse fromWarehouse, StockTransfer transfer, List<StockTransferItemRequest> itemRequests, boolean validateStockImmediately) {
        Set<Long> seenItemIds = new HashSet<>();

        for (StockTransferItemRequest itemReq : itemRequests) {
            if (itemReq.getItemId() == null) {
                throw new IllegalArgumentException("Item is required for all line items");
            }

            if (!seenItemIds.add(itemReq.getItemId())) {
                throw new IllegalArgumentException("Duplicate items within the same transfer are not allowed");
            }

            if (itemReq.getTransferQuantity() == null || itemReq.getTransferQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Transfer quantity must be greater than zero");
            }

            Item item = itemRepository.findByIdAndOrganizationId(itemReq.getItemId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemReq.getItemId()));

            if (!item.isActive()) {
                throw new IllegalArgumentException("Item '" + item.getName() + "' is inactive");
            }

            if (validateStockImmediately) {
                BigDecimal available = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgId, item.getId(), fromWarehouse.getId());
                if (available.compareTo(itemReq.getTransferQuantity()) < 0) {
                    throw new IllegalArgumentException("Insufficient stock for item " + item.getItemCode() + " (" + item.getName() + ") in " + fromWarehouse.getName() + ". Available: " + available + " " + item.getUnitOfMeasure() + ", Requested: " + itemReq.getTransferQuantity() + " " + item.getUnitOfMeasure());
                }
            }

            StockTransferItem transferItem = StockTransferItem.builder()
                    .item(item)
                    .transferQuantity(itemReq.getTransferQuantity())
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .build();

            transfer.addItem(transferItem);
        }
    }

    private StockTransferResponse mapToResponse(StockTransfer st) {
        BigDecimal totalQty = BigDecimal.ZERO;
        List<StockTransferItemResponse> itemResponses = new ArrayList<>();

        for (StockTransferItem item : st.getItems()) {
            totalQty = totalQty.add(item.getTransferQuantity());
            BigDecimal onHand = stockMovementRepository.getCurrentStockForItemAndWarehouse(
                    st.getOrganization().getId(),
                    item.getItem().getId(),
                    st.getFromWarehouse().getId()
            );

            itemResponses.add(StockTransferItemResponse.builder()
                    .id(item.getId())
                    .itemId(item.getItem().getId())
                    .itemCode(item.getItem().getItemCode())
                    .itemName(item.getItem().getName())
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .transferQuantity(item.getTransferQuantity())
                    .onHandInSource(onHand)
                    .build());
        }

        return StockTransferResponse.builder()
                .id(st.getId())
                .transferNumber(st.getTransferNumber())
                .fromWarehouseId(st.getFromWarehouse().getId())
                .fromWarehouseCode(st.getFromWarehouse().getWarehouseCode())
                .fromWarehouseName(st.getFromWarehouse().getName())
                .toWarehouseId(st.getToWarehouse().getId())
                .toWarehouseCode(st.getToWarehouse().getWarehouseCode())
                .toWarehouseName(st.getToWarehouse().getName())
                .transferDate(st.getTransferDate())
                .notes(st.getNotes())
                .status(st.getStatus())
                .totalItems(st.getItems().size())
                .totalQuantity(totalQty)
                .items(itemResponses)
                .createdAt(st.getCreatedAt())
                .updatedAt(st.getUpdatedAt())
                .build();
    }
}
