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
import si.plaan.dto.request.CreateOpeningStockRequest;
import si.plaan.dto.request.OpeningStockItemRequest;
import si.plaan.dto.request.UpdateOpeningStockRequest;
import si.plaan.dto.response.OpeningStockItemResponse;
import si.plaan.dto.response.OpeningStockResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.*;
import si.plaan.service.OpeningStockService;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpeningStockServiceImpl implements OpeningStockService {

    private final OpeningStockRepository openingStockRepository;
    private final OpeningStockItemRepository openingStockItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final OrganizationRepository organizationRepository;
    private final WarehouseRepository warehouseRepository;
    private final ItemRepository itemRepository;

    private static final String OS_PREFIX = "OS-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OpeningStockResponse> getOpeningStocks(
            Long orgId,
            String search,
            OpeningStockStatus status,
            Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<OpeningStock> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate numberLike = cb.like(cb.lower(root.get("openingStockNumber")), pattern);
                Predicate warehouseNameLike = cb.like(cb.lower(root.get("warehouse").get("name")), pattern);
                Predicate warehouseCodeLike = cb.like(cb.lower(root.get("warehouse").get("warehouseCode")), pattern);
                Predicate notesLike = cb.like(cb.lower(root.get("notes")), pattern);

                if (query != null) {
                    query.distinct(true);
                }
                Join<OpeningStock, OpeningStockItem> itemsJoin = root.join("items", JoinType.LEFT);
                Predicate itemNameLike = cb.like(cb.lower(itemsJoin.get("item").get("name")), pattern);
                Predicate itemCodeLike = cb.like(cb.lower(itemsJoin.get("item").get("itemCode")), pattern);

                predicates.add(cb.or(numberLike, warehouseNameLike, warehouseCodeLike, notesLike, itemNameLike, itemCodeLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<OpeningStock> page = openingStockRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public OpeningStockResponse getOpeningStockById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        OpeningStock os = openingStockRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Opening stock document not found with id: " + id));
        return mapToResponse(os);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextOpeningStockNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = openingStockRepository.findMaxOpeningStockNumberByOrganizationId(orgId);
        return String.format("%s%03d", OS_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional
    public OpeningStockResponse createOpeningStock(Long orgId, CreateOpeningStockRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(request.getWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + request.getWarehouseId()));

        if (!warehouse.isActive()) {
            throw new IllegalArgumentException("Selected warehouse '" + warehouse.getName() + "' is inactive");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one item is required");
        }

        String osNumber = request.getOpeningStockNumber();
        if (osNumber == null || osNumber.trim().isBlank()) {
            osNumber = getNextOpeningStockNumber(orgId);
        } else {
            osNumber = osNumber.trim();
            if (openingStockRepository.existsByOrganizationIdAndOpeningStockNumber(orgId, osNumber)) {
                throw new IllegalArgumentException("Opening stock number already exists: " + osNumber);
            }
        }

        OpeningStock openingStock = OpeningStock.builder()
                .organization(org)
                .openingStockNumber(osNumber)
                .warehouse(warehouse)
                .openingDate(request.getOpeningDate())
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .status(OpeningStockStatus.DRAFT)
                .build();

        populateAndValidateItems(orgId, warehouse, openingStock, request.getItems());

        OpeningStock saved = openingStockRepository.save(openingStock);

        if (Boolean.TRUE.equals(request.getPostImmediately())) {
            return postOpeningStock(orgId, saved.getId());
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public OpeningStockResponse updateOpeningStock(Long orgId, Long id, UpdateOpeningStockRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        OpeningStock openingStock = openingStockRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Opening stock document not found with id: " + id));

        if (openingStock.getStatus() != OpeningStockStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft opening stock documents can be edited");
        }

        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(request.getWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + request.getWarehouseId()));

        if (!warehouse.isActive()) {
            throw new IllegalArgumentException("Selected warehouse '" + warehouse.getName() + "' is inactive");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one item is required");
        }

        openingStock.setWarehouse(warehouse);
        openingStock.setOpeningDate(request.getOpeningDate());
        openingStock.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);

        openingStock.clearItems();
        populateAndValidateItems(orgId, warehouse, openingStock, request.getItems());

        OpeningStock saved = openingStockRepository.save(openingStock);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public OpeningStockResponse postOpeningStock(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        OpeningStock openingStock = openingStockRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Opening stock document not found with id: " + id));

        if (openingStock.getStatus() == OpeningStockStatus.POSTED) {
            throw new IllegalArgumentException("Opening stock document is already posted");
        }
        if (openingStock.getStatus() == OpeningStockStatus.CANCELLED) {
            throw new IllegalArgumentException("Cancelled opening stock documents cannot be posted");
        }

        Warehouse warehouse = openingStock.getWarehouse();
        if (!warehouse.isActive()) {
            throw new IllegalArgumentException("Warehouse '" + warehouse.getName() + "' is inactive");
        }

        // Validate items and verify no posted movements exist for any item in this warehouse
        for (OpeningStockItem item : openingStock.getItems()) {
            Item it = item.getItem();
            if (!it.isActive()) {
                throw new IllegalArgumentException("Item '" + it.getName() + "' is inactive");
            }
            if (stockMovementRepository.existsPostedMovementForItemAndWarehouse(orgId, it.getId(), warehouse.getId())) {
                throw new IllegalArgumentException("Opening stock can only be initialized once per item-warehouse combination before any other posted stock movements exist. Movements already exist for item " + it.getItemCode() + " (" + it.getName() + ") in warehouse " + warehouse.getName() + ".");
            }
        }

        // Create stock movements atomically
        List<StockMovement> movements = new ArrayList<>();
        for (OpeningStockItem item : openingStock.getItems()) {
            StockMovement movement = StockMovement.builder()
                    .organization(openingStock.getOrganization())
                    .warehouse(warehouse)
                    .item(item.getItem())
                    .openingStock(openingStock)
                    .goodsReceipt(null)
                    .purchaseOrder(null)
                    .movementType("OPENING_STOCK")
                    .quantity(item.getQuantity())
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .movementDate(openingStock.getOpeningDate())
                    .referenceNumber(openingStock.getOpeningStockNumber())
                    .build();
            movements.add(movement);
        }
        stockMovementRepository.saveAll(movements);

        openingStock.setStatus(OpeningStockStatus.POSTED);
        OpeningStock saved = openingStockRepository.save(openingStock);

        log.info("Posted opening stock {} with {} stock movement records for org {}",
                saved.getOpeningStockNumber(), movements.size(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public OpeningStockResponse cancelOpeningStock(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        OpeningStock openingStock = openingStockRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Opening stock document not found with id: " + id));

        if (openingStock.getStatus() != OpeningStockStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft opening stock documents can be cancelled");
        }

        openingStock.setStatus(OpeningStockStatus.CANCELLED);
        OpeningStock saved = openingStockRepository.save(openingStock);
        return mapToResponse(saved);
    }

    private void populateAndValidateItems(Long orgId, Warehouse warehouse, OpeningStock openingStock, List<OpeningStockItemRequest> itemRequests) {
        Set<Long> seenItemIds = new HashSet<>();

        for (OpeningStockItemRequest itemReq : itemRequests) {
            if (itemReq.getItemId() == null) {
                throw new IllegalArgumentException("Item is required for all line items");
            }

            if (!seenItemIds.add(itemReq.getItemId())) {
                throw new IllegalArgumentException("Duplicate items within the same document are not allowed");
            }

            if (itemReq.getQuantity() == null || itemReq.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Quantity must be greater than zero");
            }

            Item item = itemRepository.findByIdAndOrganizationId(itemReq.getItemId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemReq.getItemId()));

            if (!item.isActive()) {
                throw new IllegalArgumentException("Item '" + item.getName() + "' is inactive");
            }

            if (stockMovementRepository.existsPostedMovementForItemAndWarehouse(orgId, item.getId(), warehouse.getId())) {
                throw new IllegalArgumentException("Opening stock can only be initialized once per item-warehouse combination before any other posted stock movements exist. Movements already exist for item " + item.getItemCode() + " (" + item.getName() + ") in warehouse " + warehouse.getName() + ".");
            }

            OpeningStockItem stockItem = OpeningStockItem.builder()
                    .item(item)
                    .quantity(itemReq.getQuantity())
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .build();

            openingStock.addItem(stockItem);
        }
    }

    private OpeningStockResponse mapToResponse(OpeningStock os) {
        List<OpeningStockItemResponse> itemResponses = os.getItems().stream()
                .map(item -> OpeningStockItemResponse.builder()
                        .id(item.getId())
                        .itemId(item.getItem().getId())
                        .itemCode(item.getItem().getItemCode())
                        .itemName(item.getItem().getName())
                        .unitOfMeasure(item.getUnitOfMeasure())
                        .quantity(item.getQuantity())
                        .build())
                .collect(Collectors.toList());

        return OpeningStockResponse.builder()
                .id(os.getId())
                .openingStockNumber(os.getOpeningStockNumber())
                .warehouseId(os.getWarehouse().getId())
                .warehouseCode(os.getWarehouse().getWarehouseCode())
                .warehouseName(os.getWarehouse().getName())
                .openingDate(os.getOpeningDate())
                .notes(os.getNotes())
                .status(os.getStatus())
                .totalItems(os.getItems().size())
                .items(itemResponses)
                .createdAt(os.getCreatedAt())
                .updatedAt(os.getUpdatedAt())
                .build();
    }
}
