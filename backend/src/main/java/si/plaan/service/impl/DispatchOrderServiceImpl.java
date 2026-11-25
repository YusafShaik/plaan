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
import si.plaan.dto.request.CreateDispatchOrderRequest;
import si.plaan.dto.request.DispatchOrderItemRequest;
import si.plaan.dto.request.UpdateDispatchOrderRequest;
import si.plaan.dto.response.DispatchOrderItemResponse;
import si.plaan.dto.response.DispatchOrderResponse;
import si.plaan.dto.response.DispatchPrepareItemResponse;
import si.plaan.dto.response.DispatchPrepareResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.DispatchOrder;
import si.plaan.entity.DispatchOrderItem;
import si.plaan.entity.DispatchOrderStatus;
import si.plaan.entity.Item;
import si.plaan.entity.Organization;
import si.plaan.entity.SalesOrder;
import si.plaan.entity.SalesOrderItem;
import si.plaan.entity.SalesOrderStatus;
import si.plaan.entity.StockMovement;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.DispatchOrderItemRepository;
import si.plaan.repository.DispatchOrderRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.SalesOrderRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.service.DispatchOrderService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DispatchOrderServiceImpl implements DispatchOrderService {

    private final DispatchOrderRepository dispatchOrderRepository;
    private final DispatchOrderItemRepository dispatchOrderItemRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final StockMovementRepository stockMovementRepository;
    private final OrganizationRepository organizationRepository;

    private static final String DO_PREFIX = "DO-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DispatchOrderResponse> getDispatchOrders(
            Long orgId, String search, DispatchOrderStatus status, Long salesOrderId, Pageable pageable
    ) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<DispatchOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (salesOrderId != null) {
                predicates.add(cb.equal(root.get("salesOrder").get("id"), salesOrderId));
            }

            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate dispatchNumMatch = cb.like(cb.lower(root.get("dispatchNumber")), pattern);
                Predicate soNumMatch = cb.like(cb.lower(root.get("salesOrder").get("orderNumber")), pattern);
                Predicate custNameMatch = cb.like(cb.lower(root.get("customer").get("name")), pattern);
                predicates.add(cb.or(dispatchNumMatch, soNumMatch, custNameMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<DispatchOrder> page = dispatchOrderRepository.findAll(spec, pageable);
        List<DispatchOrderResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .toList();

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
    public List<DispatchOrderResponse> getDispatchOrdersBySalesOrder(Long orgId, Long salesOrderId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        return dispatchOrderRepository.findByOrganizationIdAndSalesOrderIdOrderByCreatedAtDesc(orgId, salesOrderId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DispatchOrderResponse getDispatchOrderById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        DispatchOrder dispatch = dispatchOrderRepository.findByIdAndOrganizationIdWithItems(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispatch Order not found with id: " + id));
        return mapToResponse(dispatch);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextDispatchNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        String maxCode = dispatchOrderRepository.findMaxDispatchNumberByOrganizationId(orgId);
        int nextSequence = 1;

        if (maxCode != null && maxCode.startsWith(DO_PREFIX)) {
            try {
                String numericPart = maxCode.substring(DO_PREFIX.length());
                nextSequence = Integer.parseInt(numericPart) + 1;
            } catch (NumberFormatException e) {
                log.warn("Could not parse numeric sequence from dispatch number: {}", maxCode);
                nextSequence = 1;
            }
        }

        return String.format("%s%03d", DO_PREFIX, nextSequence);
    }

    @Override
    @Transactional(readOnly = true)
    public DispatchPrepareResponse prepareDispatchForSalesOrder(Long orgId, Long salesOrderId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        SalesOrder so = salesOrderRepository.findByIdAndOrganizationId(salesOrderId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Order not found with id: " + salesOrderId));

        if (so.getStatus() != SalesOrderStatus.CONFIRMED && so.getStatus() != SalesOrderStatus.PARTIALLY_DISPATCHED) {
            throw new IllegalStateException("Dispatch is only allowed against Confirmed or Partially Dispatched Sales Orders. Current status: " + so.getStatus());
        }

        Long warehouseId = so.getDispatchWarehouse().getId();
        List<DispatchPrepareItemResponse> items = new ArrayList<>();

        for (SalesOrderItem soItem : so.getItems()) {
            BigDecimal ordered = soItem.getOrderedQuantity();
            BigDecimal dispatched = soItem.getDispatchedQuantity() != null ? soItem.getDispatchedQuantity() : BigDecimal.ZERO;
            BigDecimal pending = ordered.subtract(dispatched);
            if (pending.compareTo(BigDecimal.ZERO) < 0) {
                pending = BigDecimal.ZERO;
            }

            BigDecimal onHand = stockMovementRepository.getCurrentStockForItemAndWarehouse(
                    orgId, soItem.getItem().getId(), warehouseId
            );
            if (onHand == null) {
                onHand = BigDecimal.ZERO;
            }

            items.add(new DispatchPrepareItemResponse(
                    soItem.getId(),
                    soItem.getItem().getId(),
                    soItem.getItem().getItemCode(),
                    soItem.getItem().getName(),
                    soItem.getUnitOfMeasure(),
                    ordered,
                    dispatched,
                    pending,
                    onHand
            ));
        }

        return new DispatchPrepareResponse(
                so.getId(),
                so.getOrderNumber(),
                so.getCustomer().getId(),
                so.getCustomer().getCustomerCode(),
                so.getCustomer().getName(),
                so.getDispatchWarehouse().getId(),
                so.getDispatchWarehouse().getWarehouseCode(),
                so.getDispatchWarehouse().getName(),
                so.getShippingAddress(),
                items
        );
    }

    @Override
    @Transactional
    public DispatchOrderResponse createDispatchOrder(Long orgId, CreateDispatchOrderRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        SalesOrder salesOrder = salesOrderRepository.findByIdAndOrganizationId(request.salesOrderId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Order not found with id: " + request.salesOrderId()));

        if (salesOrder.getStatus() != SalesOrderStatus.CONFIRMED && salesOrder.getStatus() != SalesOrderStatus.PARTIALLY_DISPATCHED) {
            throw new IllegalStateException("Dispatch is allowed only against Confirmed or Partially Dispatched Sales Orders. Current status: " + salesOrder.getStatus());
        }

        String dispatchNumber = cleanString(request.dispatchNumber());
        if (dispatchNumber == null) {
            dispatchNumber = getNextDispatchNumber(orgId);
        }

        DispatchOrder dispatch = DispatchOrder.builder()
                .organization(org)
                .dispatchNumber(dispatchNumber)
                .salesOrder(salesOrder)
                .customer(salesOrder.getCustomer())
                .dispatchWarehouse(salesOrder.getDispatchWarehouse())
                .dispatchDate(request.dispatchDate())
                .shippingAddress(cleanString(request.shippingAddress()) != null ? cleanString(request.shippingAddress()) : salesOrder.getShippingAddress())
                .transporterName(cleanString(request.transporterName()))
                .vehicleNumber(cleanString(request.vehicleNumber()))
                .transportReference(cleanString(request.transportReference()))
                .notes(cleanString(request.notes()))
                .status(DispatchOrderStatus.DRAFT)
                .build();

        attachItems(dispatch, salesOrder, request.items());

        DispatchOrder saved = dispatchOrderRepository.save(dispatch);

        boolean shouldPost = request.status() == DispatchOrderStatus.POSTED;
        if (shouldPost) {
            executePost(saved, orgId, salesOrder);
            saved = dispatchOrderRepository.save(saved);
        }

        log.info("Dispatch order created: id={}, dispatchNumber={}, status={}, orgId={}",
                saved.getId(), saved.getDispatchNumber(), saved.getStatus(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public DispatchOrderResponse updateDispatchOrder(Long orgId, Long id, UpdateDispatchOrderRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        DispatchOrder dispatch = dispatchOrderRepository.findByIdAndOrganizationIdWithItems(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispatch Order not found with id: " + id));

        if (dispatch.getStatus() != DispatchOrderStatus.DRAFT) {
            throw new IllegalStateException("Only draft dispatch orders can be edited. Current status: " + dispatch.getStatus());
        }

        SalesOrder salesOrder = dispatch.getSalesOrder();
        if (salesOrder.getStatus() != SalesOrderStatus.CONFIRMED && salesOrder.getStatus() != SalesOrderStatus.PARTIALLY_DISPATCHED) {
            throw new IllegalStateException("Sales Order is no longer eligible for dispatch. Current status: " + salesOrder.getStatus());
        }

        dispatch.setDispatchDate(request.dispatchDate());
        dispatch.setShippingAddress(cleanString(request.shippingAddress()));
        dispatch.setTransporterName(cleanString(request.transporterName()));
        dispatch.setVehicleNumber(cleanString(request.vehicleNumber()));
        dispatch.setTransportReference(cleanString(request.transportReference()));
        dispatch.setNotes(cleanString(request.notes()));

        dispatch.clearItems();
        attachItems(dispatch, salesOrder, request.items());

        DispatchOrder saved = dispatchOrderRepository.save(dispatch);
        log.info("Dispatch order updated: id={}, dispatchNumber={}, orgId={}", saved.getId(), saved.getDispatchNumber(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public DispatchOrderResponse postDispatchOrder(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        DispatchOrder dispatch = dispatchOrderRepository.findByIdAndOrganizationIdWithItems(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispatch Order not found with id: " + id));

        if (dispatch.getStatus() == DispatchOrderStatus.POSTED) {
            throw new IllegalStateException("Dispatch Order is already posted");
        }

        SalesOrder salesOrder = salesOrderRepository.findByIdAndOrganizationId(dispatch.getSalesOrder().getId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Order not found with id: " + dispatch.getSalesOrder().getId()));

        if (salesOrder.getStatus() != SalesOrderStatus.CONFIRMED && salesOrder.getStatus() != SalesOrderStatus.PARTIALLY_DISPATCHED) {
            throw new IllegalStateException("Dispatch is allowed only against Confirmed or Partially Dispatched Sales Orders. Current status: " + salesOrder.getStatus());
        }

        executePost(dispatch, orgId, salesOrder);

        DispatchOrder saved = dispatchOrderRepository.save(dispatch);
        log.info("Dispatch order posted: id={}, dispatchNumber={}, salesOrderNumber={}, orgId={}",
                saved.getId(), saved.getDispatchNumber(), salesOrder.getOrderNumber(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteDispatchOrder(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        DispatchOrder dispatch = dispatchOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispatch Order not found with id: " + id));

        if (dispatch.getStatus() != DispatchOrderStatus.DRAFT) {
            throw new IllegalStateException("Only draft dispatch orders can be deleted. Current status: " + dispatch.getStatus());
        }

        dispatchOrderRepository.delete(dispatch);
        log.info("Dispatch order deleted: id={}, dispatchNumber={}, orgId={}", dispatch.getId(), dispatch.getDispatchNumber(), orgId);
    }

    private void attachItems(DispatchOrder dispatch, SalesOrder salesOrder, List<DispatchOrderItemRequest> itemRequests) {
        if (itemRequests == null || itemRequests.isEmpty()) {
            throw new IllegalArgumentException("At least one item is required for dispatch");
        }

        Map<Long, SalesOrderItem> soItemMap = salesOrder.getItems().stream()
                .collect(Collectors.toMap(SalesOrderItem::getId, Function.identity()));

        Set<Long> seenSoItemIds = new HashSet<>();
        BigDecimal totalDispatchQty = BigDecimal.ZERO;

        for (DispatchOrderItemRequest req : itemRequests) {
            if (!seenSoItemIds.add(req.salesOrderItemId())) {
                throw new IllegalArgumentException("Duplicate item found in dispatch request: sales order item id " + req.salesOrderItemId());
            }

            SalesOrderItem soItem = soItemMap.get(req.salesOrderItemId());
            if (soItem == null) {
                throw new IllegalArgumentException("Sales order item with id " + req.salesOrderItemId() + " does not belong to sales order " + salesOrder.getOrderNumber());
            }

            BigDecimal dispatchQty = req.dispatchQuantity() != null ? req.dispatchQuantity() : BigDecimal.ZERO;
            if (dispatchQty.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Dispatch quantity cannot be negative for item: " + soItem.getItem().getName());
            }

            BigDecimal previouslyDispatched = soItem.getDispatchedQuantity() != null ? soItem.getDispatchedQuantity() : BigDecimal.ZERO;
            BigDecimal pending = soItem.getOrderedQuantity().subtract(previouslyDispatched);
            if (pending.compareTo(BigDecimal.ZERO) < 0) {
                pending = BigDecimal.ZERO;
            }

            if (dispatchQty.compareTo(pending) > 0) {
                throw new IllegalArgumentException("Dispatch quantity (" + dispatchQty + ") cannot exceed pending quantity (" + pending + ") for item: " + soItem.getItem().getName());
            }

            BigDecimal remaining = pending.subtract(dispatchQty);
            if (remaining.compareTo(BigDecimal.ZERO) < 0) {
                remaining = BigDecimal.ZERO;
            }

            DispatchOrderItem line = DispatchOrderItem.builder()
                    .dispatchOrder(dispatch)
                    .salesOrderItem(soItem)
                    .item(soItem.getItem())
                    .unitOfMeasure(soItem.getUnitOfMeasure())
                    .orderedQuantity(soItem.getOrderedQuantity())
                    .previouslyDispatchedQuantity(previouslyDispatched)
                    .dispatchQuantity(dispatchQty)
                    .remainingQuantity(remaining)
                    .build();

            dispatch.addItem(line);
            totalDispatchQty = totalDispatchQty.add(dispatchQty);
        }

        if (totalDispatchQty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("At least one positive dispatch quantity is required to create a dispatch order");
        }
    }

    private void executePost(DispatchOrder dispatch, Long orgId, SalesOrder salesOrder) {
        Long warehouseId = salesOrder.getDispatchWarehouse().getId();
        BigDecimal totalDispatchedNow = BigDecimal.ZERO;

        for (DispatchOrderItem line : dispatch.getItems()) {
            BigDecimal qty = line.getDispatchQuantity();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            SalesOrderItem soItem = line.getSalesOrderItem();
            BigDecimal previouslyDispatched = soItem.getDispatchedQuantity() != null ? soItem.getDispatchedQuantity() : BigDecimal.ZERO;
            BigDecimal pending = soItem.getOrderedQuantity().subtract(previouslyDispatched);
            if (pending.compareTo(BigDecimal.ZERO) < 0) {
                pending = BigDecimal.ZERO;
            }

            if (qty.compareTo(pending) > 0) {
                throw new IllegalArgumentException("Dispatch quantity (" + qty + ") exceeds pending order quantity (" + pending + ") for item: " + line.getItem().getName());
            }

            BigDecimal onHand = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgId, line.getItem().getId(), warehouseId);
            if (onHand == null) {
                onHand = BigDecimal.ZERO;
            }

            if (qty.compareTo(onHand) > 0) {
                throw new IllegalArgumentException("Insufficient warehouse stock for item: " + line.getItem().getName() + ". On hand: " + onHand + ", requested dispatch: " + qty);
            }

            // Create stock movement
            StockMovement movement = StockMovement.builder()
                    .organization(dispatch.getOrganization())
                    .dispatchOrder(dispatch)
                    .salesOrder(salesOrder)
                    .item(line.getItem())
                    .warehouse(salesOrder.getDispatchWarehouse())
                    .movementType("SALES_DISPATCH")
                    .quantity(qty)
                    .unitOfMeasure(line.getUnitOfMeasure())
                    .referenceNumber(dispatch.getDispatchNumber())
                    .movementDate(dispatch.getDispatchDate())
                    .build();

            stockMovementRepository.save(movement);

            // Update SalesOrderItem dispatched quantity
            soItem.setDispatchedQuantity(previouslyDispatched.add(qty));
            line.setPreviouslyDispatchedQuantity(previouslyDispatched);
            line.setRemainingQuantity(soItem.getOrderedQuantity().subtract(soItem.getDispatchedQuantity()));

            totalDispatchedNow = totalDispatchedNow.add(qty);
        }

        if (totalDispatchedNow.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Cannot post dispatch: at least one positive dispatch quantity is required");
        }

        // Re-evaluate SalesOrder fulfillment status
        boolean allFullyDispatched = salesOrder.getItems().stream()
                .allMatch(it -> it.getDispatchedQuantity() != null && it.getDispatchedQuantity().compareTo(it.getOrderedQuantity()) >= 0);

        if (allFullyDispatched) {
            salesOrder.setStatus(SalesOrderStatus.FULLY_DISPATCHED);
        } else {
            salesOrder.setStatus(SalesOrderStatus.PARTIALLY_DISPATCHED);
        }

        salesOrderRepository.save(salesOrder);

        dispatch.setStatus(DispatchOrderStatus.POSTED);
        dispatch.setPostedAt(LocalDateTime.now());
    }

    private String cleanString(String s) {
        if (s == null || s.trim().isBlank()) {
            return null;
        }
        return s.trim();
    }

    private DispatchOrderResponse mapToResponse(DispatchOrder d) {
        List<DispatchOrderItemResponse> itemResponses = d.getItems().stream()
                .map(it -> new DispatchOrderItemResponse(
                        it.getId(),
                        it.getSalesOrderItem().getId(),
                        it.getItem().getId(),
                        it.getItem().getItemCode(),
                        it.getItem().getName(),
                        it.getUnitOfMeasure(),
                        it.getOrderedQuantity(),
                        it.getPreviouslyDispatchedQuantity(),
                        it.getDispatchQuantity(),
                        it.getRemainingQuantity()
                ))
                .toList();

        BigDecimal totalQty = d.getItems().stream()
                .map(DispatchOrderItem::getDispatchQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DispatchOrderResponse(
                d.getId(),
                d.getDispatchNumber(),
                d.getSalesOrder().getId(),
                d.getSalesOrder().getOrderNumber(),
                d.getCustomer().getId(),
                d.getCustomer().getCustomerCode(),
                d.getCustomer().getName(),
                d.getDispatchWarehouse().getId(),
                d.getDispatchWarehouse().getWarehouseCode(),
                d.getDispatchWarehouse().getName(),
                d.getDispatchDate(),
                d.getShippingAddress(),
                d.getTransporterName(),
                d.getVehicleNumber(),
                d.getTransportReference(),
                d.getNotes(),
                d.getStatus(),
                d.getPostedAt(),
                d.getItems().size(),
                totalQty,
                itemResponses,
                d.getCreatedAt(),
                d.getUpdatedAt()
        );
    }
}
