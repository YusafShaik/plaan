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
import si.plaan.dto.request.CreateSalesOrderRequest;
import si.plaan.dto.request.SalesOrderItemRequest;
import si.plaan.dto.request.UpdateSalesOrderRequest;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.SalesOrderItemResponse;
import si.plaan.dto.response.SalesOrderResponse;
import si.plaan.dto.response.SalesOrderStockAvailabilityItemResponse;
import si.plaan.dto.response.SalesOrderStockAvailabilityResponse;
import si.plaan.dto.response.SalesOrderSummaryResponse;
import si.plaan.entity.Customer;
import si.plaan.entity.Item;
import si.plaan.entity.Organization;
import si.plaan.entity.SalesOrder;
import si.plaan.entity.SalesOrderItem;
import si.plaan.entity.SalesOrderStatus;
import si.plaan.entity.Warehouse;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.CustomerRepository;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.SalesOrderRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.repository.WarehouseRepository;
import si.plaan.service.SalesOrderService;
import si.plaan.service.StockAvailabilityService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalesOrderServiceImpl implements SalesOrderService {

    private final SalesOrderRepository salesOrderRepository;
    private final OrganizationRepository organizationRepository;
    private final CustomerRepository customerRepository;
    private final WarehouseRepository warehouseRepository;
    private final ItemRepository itemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StockAvailabilityService stockAvailabilityService;

    private static final String SO_PREFIX = "SO-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SalesOrderResponse> getSalesOrders(Long orgId, String search, SalesOrderStatus status, Long customerId, Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<SalesOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (customerId != null) {
                predicates.add(cb.equal(root.get("customer").get("id"), customerId));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate numLike = cb.like(cb.lower(root.get("orderNumber")), pattern);
                Predicate custNameLike = cb.like(cb.lower(root.get("customer").get("name")), pattern);
                Predicate custCodeLike = cb.like(cb.lower(root.get("customer").get("customerCode")), pattern);
                Predicate poRefLike = cb.like(cb.lower(root.get("customerPoReference")), pattern);
                Predicate notesLike = cb.like(cb.lower(root.get("notes")), pattern);
                predicates.add(cb.or(numLike, custNameLike, custCodeLike, poRefLike, notesLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<SalesOrder> orderPage = salesOrderRepository.findAll(spec, pageable);
        return PageResponse.from(orderPage.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public SalesOrderResponse getSalesOrderById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        SalesOrder order = salesOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Order not found with id: " + id));
        return mapToResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public SalesOrderSummaryResponse getSummary(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        long total = salesOrderRepository.countByOrganizationId(orgId);
        long draft = salesOrderRepository.countByOrganizationIdAndStatus(orgId, SalesOrderStatus.DRAFT);
        long confirmed = salesOrderRepository.countByOrganizationIdAndStatus(orgId, SalesOrderStatus.CONFIRMED);
        long cancelled = salesOrderRepository.countByOrganizationIdAndStatus(orgId, SalesOrderStatus.CANCELLED);
        BigDecimal totalValue = salesOrderRepository.sumTotalValueByOrganizationId(orgId);
        return new SalesOrderSummaryResponse(total, draft, confirmed, cancelled, totalValue);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextSalesOrderNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = salesOrderRepository.findMaxSalesOrderNumberByOrganizationId(orgId);
        return String.format("%s%03d", SO_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional
    public SalesOrderResponse createSalesOrder(Long orgId, CreateSalesOrderRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        String finalNumber;
        if (request.orderNumber() != null && !request.orderNumber().trim().isBlank()) {
            finalNumber = request.orderNumber().trim().toUpperCase();
        } else {
            finalNumber = getNextSalesOrderNumber(orgId);
        }

        if (salesOrderRepository.existsByOrganizationIdAndOrderNumberIgnoreCase(orgId, finalNumber)) {
            throw new IllegalArgumentException("Sales order number '" + finalNumber + "' is already in use in this organization");
        }

        Customer customer = customerRepository.findByIdAndOrganizationId(request.customerId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + request.customerId()));

        if (!customer.isActive()) {
            throw new IllegalArgumentException("Cannot create sales order for inactive customer: " + customer.getName());
        }

        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(request.dispatchWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispatch warehouse not found with id: " + request.dispatchWarehouseId()));

        if (!warehouse.isActive()) {
            throw new IllegalArgumentException("Cannot create sales order for inactive warehouse: " + warehouse.getName());
        }

        String billingAddr = request.billingAddress() != null && !request.billingAddress().trim().isBlank()
                ? request.billingAddress().trim()
                : customer.getBillingAddress();

        String shippingAddr = request.shippingAddress() != null && !request.shippingAddress().trim().isBlank()
                ? request.shippingAddress().trim()
                : (customer.getShippingAddress() != null ? customer.getShippingAddress() : customer.getBillingAddress());

        SalesOrderStatus initialStatus = request.status() != null ? request.status() : SalesOrderStatus.DRAFT;

        SalesOrder order = SalesOrder.builder()
                .organization(org)
                .orderNumber(finalNumber)
                .customer(customer)
                .dispatchWarehouse(warehouse)
                .orderDate(request.orderDate())
                .expectedDeliveryDate(request.expectedDeliveryDate())
                .customerPoReference(cleanString(request.customerPoReference()))
                .billingAddress(billingAddr)
                .shippingAddress(shippingAddr)
                .notes(cleanString(request.notes()))
                .status(initialStatus)
                .currency(org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR")
                .totalAmount(BigDecimal.ZERO)
                .build();

        validateAndAttachItems(order, request.items(), orgId);

        if (initialStatus == SalesOrderStatus.CONFIRMED && order.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one item is required before confirming the sales order");
        }

        SalesOrder saved = salesOrderRepository.save(order);
        log.info("Sales Order created: id={}, orderNumber={}, orgId={}, status={}", saved.getId(), saved.getOrderNumber(), orgId, saved.getStatus());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SalesOrderResponse updateSalesOrder(Long orgId, Long id, UpdateSalesOrderRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        SalesOrder order = salesOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Order not found with id: " + id));

        if (order.getStatus() != SalesOrderStatus.DRAFT) {
            throw new IllegalStateException("Only draft sales orders can be edited. Current status: " + order.getStatus());
        }

        Customer customer = customerRepository.findByIdAndOrganizationId(request.customerId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + request.customerId()));

        if (!customer.isActive() && !customer.getId().equals(order.getCustomer().getId())) {
            throw new IllegalArgumentException("Cannot assign sales order to inactive customer: " + customer.getName());
        }

        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(request.dispatchWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispatch warehouse not found with id: " + request.dispatchWarehouseId()));

        if (!warehouse.isActive() && !warehouse.getId().equals(order.getDispatchWarehouse().getId())) {
            throw new IllegalArgumentException("Cannot assign sales order to inactive warehouse: " + warehouse.getName());
        }

        order.setCustomer(customer);
        order.setDispatchWarehouse(warehouse);
        order.setOrderDate(request.orderDate());
        order.setExpectedDeliveryDate(request.expectedDeliveryDate());
        order.setCustomerPoReference(cleanString(request.customerPoReference()));
        if (request.billingAddress() != null) {
            order.setBillingAddress(cleanString(request.billingAddress()));
        }
        if (request.shippingAddress() != null) {
            order.setShippingAddress(cleanString(request.shippingAddress()));
        }
        order.setNotes(cleanString(request.notes()));

        order.clearItems();
        validateAndAttachItems(order, request.items(), orgId);

        SalesOrder saved = salesOrderRepository.save(order);
        log.info("Sales Order updated: id={}, orderNumber={}, orgId={}", saved.getId(), saved.getOrderNumber(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SalesOrderResponse confirmSalesOrder(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        SalesOrder order = salesOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Order not found with id: " + id));

        if (order.getStatus() != SalesOrderStatus.DRAFT) {
            throw new IllegalStateException("Only draft sales orders can be confirmed. Current status: " + order.getStatus());
        }

        if (order.getItems().isEmpty()) {
            throw new IllegalStateException("At least one item is required before confirming the sales order");
        }

        if (!order.getCustomer().isActive()) {
            throw new IllegalStateException("Customer is inactive: " + order.getCustomer().getName());
        }

        if (!order.getDispatchWarehouse().isActive()) {
            throw new IllegalStateException("Dispatch warehouse is inactive: " + order.getDispatchWarehouse().getName());
        }

        for (SalesOrderItem item : order.getItems()) {
            if (!item.getItem().isActive()) {
                throw new IllegalStateException("Item is inactive: " + item.getItem().getName());
            }
        }

        order.setStatus(SalesOrderStatus.CONFIRMED);
        SalesOrder saved = salesOrderRepository.save(order);
        log.info("Sales Order confirmed: id={}, orderNumber={}, orgId={}", saved.getId(), saved.getOrderNumber(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SalesOrderResponse cancelSalesOrder(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        SalesOrder order = salesOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Order not found with id: " + id));

        if (order.getStatus() == SalesOrderStatus.CANCELLED) {
            throw new IllegalStateException("Sales order is already cancelled");
        }

        boolean hasDispatched = order.getItems().stream()
                .anyMatch(it -> it.getDispatchedQuantity() != null && it.getDispatchedQuantity().compareTo(BigDecimal.ZERO) > 0);
        if (hasDispatched || order.getStatus() == SalesOrderStatus.PARTIALLY_DISPATCHED || order.getStatus() == SalesOrderStatus.FULLY_DISPATCHED) {
            throw new IllegalStateException("Cannot cancel sales order with posted dispatches. Current status: " + order.getStatus());
        }

        order.setStatus(SalesOrderStatus.CANCELLED);
        SalesOrder saved = salesOrderRepository.save(order);
        log.info("Sales Order cancelled: id={}, orderNumber={}, orgId={}", saved.getId(), saved.getOrderNumber(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteSalesOrder(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        SalesOrder order = salesOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Order not found with id: " + id));

        if (order.getStatus() != SalesOrderStatus.DRAFT) {
            throw new IllegalStateException("Only draft sales orders can be deleted. Current status: " + order.getStatus());
        }

        salesOrderRepository.delete(order);
        log.info("Sales Order deleted: id={}, orderNumber={}, orgId={}", order.getId(), order.getOrderNumber(), orgId);
    }

    @Override
    @Transactional(readOnly = true)
    public SalesOrderStockAvailabilityResponse checkStockAvailability(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        SalesOrder order = salesOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Order not found with id: " + id));

        Long dispatchWarehouseId = order.getDispatchWarehouse().getId();
        int shortageCount = 0;
        int availableCount = 0;
        List<SalesOrderStockAvailabilityItemResponse> items = new ArrayList<>();

        for (SalesOrderItem item : order.getItems()) {
            BigDecimal onHand = stockAvailabilityService.getAvailable(
                    orgId, item.getItem().getId(), dispatchWarehouseId
            );
            if (onHand == null) {
                onHand = BigDecimal.ZERO;
            }

            BigDecimal ordered = item.getOrderedQuantity();
            BigDecimal dispatched = item.getDispatchedQuantity() != null ? item.getDispatchedQuantity() : BigDecimal.ZERO;
            BigDecimal pending = ordered.subtract(dispatched);
            if (pending.compareTo(BigDecimal.ZERO) < 0) {
                pending = BigDecimal.ZERO;
            }

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

            items.add(SalesOrderStockAvailabilityItemResponse.builder()
                    .itemId(item.getItem().getId())
                    .itemCode(item.getItem().getItemCode())
                    .itemName(item.getItem().getName())
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .orderedQuantity(ordered)
                    .dispatchedQuantity(dispatched)
                    .pendingQuantity(pending)
                    .onHandQuantity(onHand)
                    .shortageQuantity(shortage)
                    .status(status)
                    .build());
        }

        String overallStatus = shortageCount > 0 ? "STOCK_SHORTAGE" : "AVAILABLE";

        return SalesOrderStockAvailabilityResponse.builder()
                .salesOrderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .dispatchWarehouseId(dispatchWarehouseId)
                .dispatchWarehouseCode(order.getDispatchWarehouse().getWarehouseCode())
                .dispatchWarehouseName(order.getDispatchWarehouse().getName())
                .overallStatus(overallStatus)
                .totalItems(items.size())
                .availableItems(availableCount)
                .shortageItems(shortageCount)
                .items(items)
                .build();
    }

    private void validateAndAttachItems(SalesOrder order, List<SalesOrderItemRequest> itemRequests, Long orgId) {
        if (itemRequests == null || itemRequests.isEmpty()) {
            order.setTotalAmount(BigDecimal.ZERO);
            return;
        }

        Set<Long> seenItemIds = new HashSet<>();
        BigDecimal total = BigDecimal.ZERO;

        for (SalesOrderItemRequest req : itemRequests) {
            if (!seenItemIds.add(req.itemId())) {
                throw new IllegalArgumentException("Duplicate item found: item with id " + req.itemId() + " is included multiple times in the sales order");
            }

            Item item = itemRepository.findByIdAndOrganizationId(req.itemId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + req.itemId()));

            if (!item.isActive()) {
                throw new IllegalArgumentException("Cannot add inactive item to sales order: " + item.getName());
            }

            if (req.orderedQuantity() == null || req.orderedQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Quantity must be greater than zero for item: " + item.getName());
            }

            if (req.unitPrice() == null || req.unitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Unit price cannot be negative for item: " + item.getName());
            }

            BigDecimal lineAmount = req.orderedQuantity()
                    .multiply(req.unitPrice())
                    .setScale(2, RoundingMode.HALF_UP);

            SalesOrderItem orderItem = SalesOrderItem.builder()
                    .salesOrder(order)
                    .item(item)
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .orderedQuantity(req.orderedQuantity())
                    .unitPrice(req.unitPrice())
                    .lineAmount(lineAmount)
                    .build();

            order.addItem(orderItem);
            total = total.add(lineAmount);
        }

        order.setTotalAmount(total);
    }

    private String cleanString(String s) {
        if (s == null || s.trim().isBlank()) {
            return null;
        }
        return s.trim();
    }

    private SalesOrderResponse mapToResponse(SalesOrder o) {
        List<SalesOrderItemResponse> itemResponses = o.getItems().stream()
                .map(it -> {
                    BigDecimal dispatched = it.getDispatchedQuantity() != null ? it.getDispatchedQuantity() : BigDecimal.ZERO;
                    BigDecimal pending = it.getOrderedQuantity().subtract(dispatched);
                    if (pending.compareTo(BigDecimal.ZERO) < 0) {
                        pending = BigDecimal.ZERO;
                    }
                    return new SalesOrderItemResponse(
                            it.getId(),
                            it.getItem().getId(),
                            it.getItem().getItemCode(),
                            it.getItem().getName(),
                            it.getUnitOfMeasure(),
                            it.getOrderedQuantity(),
                            it.getUnitPrice(),
                            it.getLineAmount(),
                            dispatched,
                            pending
                    );
                })
                .toList();

        return new SalesOrderResponse(
                o.getId(),
                o.getOrderNumber(),
                o.getCustomer().getId(),
                o.getCustomer().getCustomerCode(),
                o.getCustomer().getName(),
                o.getDispatchWarehouse().getId(),
                o.getDispatchWarehouse().getWarehouseCode(),
                o.getDispatchWarehouse().getName(),
                o.getOrderDate(),
                o.getExpectedDeliveryDate(),
                o.getCustomerPoReference(),
                o.getBillingAddress(),
                o.getShippingAddress(),
                o.getNotes(),
                o.getStatus(),
                o.getTotalAmount(),
                o.getCurrency(),
                o.getItems().size(),
                itemResponses,
                o.getCreatedAt(),
                o.getUpdatedAt()
        );
    }
}
