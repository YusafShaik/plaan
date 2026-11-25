package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateMaterialReturnRequest;
import si.plaan.dto.request.MaterialReturnItemRequest;
import si.plaan.dto.request.UpdateMaterialReturnRequest;
import si.plaan.dto.response.MaterialReturnItemResponse;
import si.plaan.dto.response.MaterialReturnResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.*;
import si.plaan.service.MaterialReturnService;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaterialReturnServiceImpl implements MaterialReturnService {

    private static final String MR_PREFIX = "MR-";

    private final MaterialReturnRepository materialReturnRepository;
    private final ProductionOrderRepository productionOrderRepository;
    private final ProductionOrderItemRepository productionOrderItemRepository;
    private final OrganizationRepository organizationRepository;
    private final WarehouseRepository warehouseRepository;
    private final ItemRepository itemRepository;
    private final StockMovementRepository stockMovementRepository;

    @Override
    @Transactional(readOnly = true)
    public String getNextReturnNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = materialReturnRepository.findMaxReturnNumberByOrganizationId(orgId);
        return String.format("%s%03d", MR_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialReturnResponse> getMaterialReturnsByProductionOrder(Long orgId, Long productionOrderId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        return materialReturnRepository
                .findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(orgId, productionOrderId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public MaterialReturnResponse getMaterialReturnById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        MaterialReturn mr = materialReturnRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material return not found with id: " + id));
        return mapToResponse(mr);
    }

    @Override
    @Transactional
    public MaterialReturnResponse createMaterialReturn(Long orgId, CreateMaterialReturnRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(request.getProductionOrderId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + request.getProductionOrderId()));

        if (order.getStatus() != ProductionOrderStatus.IN_PROGRESS && order.getStatus() != ProductionOrderStatus.COMPLETED) {
            throw new IllegalStateException("Material return is allowed only for In Progress or Completed production orders. Current status: " + order.getStatus());
        }

        Warehouse returnWarehouse;
        if (request.getReturnWarehouseId() != null) {
            returnWarehouse = warehouseRepository.findByIdAndOrganizationId(request.getReturnWarehouseId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Return warehouse not found with id: " + request.getReturnWarehouseId()));
        } else {
            returnWarehouse = order.getSourceWarehouse();
        }

        String returnNumber = request.getReturnNumber();
        if (returnNumber == null || returnNumber.trim().isEmpty() || returnNumber.startsWith("MR-...")) {
            returnNumber = getNextReturnNumber(orgId);
        } else {
            returnNumber = returnNumber.trim();
            if (materialReturnRepository.existsByOrganizationIdAndReturnNumber(orgId, returnNumber)) {
                throw new IllegalArgumentException("Return number (" + returnNumber + ") already exists in your organization.");
            }
        }

        Map<Long, ProductionOrderItem> orderItemsByMaterial = order.getItems().stream()
                .collect(Collectors.toMap(it -> it.getMaterial().getId(), Function.identity()));

        MaterialReturn mr = MaterialReturn.builder()
                .organization(org)
                .returnNumber(returnNumber)
                .returnDate(request.getReturnDate())
                .productionOrder(order)
                .returnWarehouse(returnWarehouse)
                .status(MaterialReturnStatus.DRAFT)
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .items(new ArrayList<>())
                .build();

        for (MaterialReturnItemRequest itemReq : request.getItems()) {
            ProductionOrderItem orderItem = orderItemsByMaterial.get(itemReq.getMaterialId());
            if (orderItem == null) {
                Item mat = itemRepository.findByIdAndOrganizationId(itemReq.getMaterialId(), orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + itemReq.getMaterialId()));
                throw new IllegalArgumentException("Material (" + mat.getName() + ") is not listed in the Production Order requirements.");
            }

            BigDecimal returnQty = itemReq.getReturnQuantity() != null ? itemReq.getReturnQuantity() : BigDecimal.ZERO;
            if (returnQty.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Return quantity cannot be negative for material: " + orderItem.getMaterial().getName());
            }

            BigDecimal returnableQty = orderItem.getRemainingQuantity();
            if (returnQty.compareTo(returnableQty) > 0) {
                throw new IllegalArgumentException("Cannot return " + returnQty + " " + orderItem.getUnitOfMeasure()
                        + " for " + orderItem.getMaterial().getName() + ". Available in production is only "
                        + returnableQty + " " + orderItem.getUnitOfMeasure() + ".");
            }

            MaterialReturnItem mrItem = MaterialReturnItem.builder()
                    .materialReturn(mr)
                    .material(orderItem.getMaterial())
                    .productionOrderItem(orderItem)
                    .returnQuantity(returnQty)
                    .unitOfMeasure(orderItem.getUnitOfMeasure())
                    .build();

            mr.getItems().add(mrItem);
        }

        MaterialReturn saved = materialReturnRepository.save(mr);
        log.info("Created Material Return {} (status: DRAFT) for order {} in org {}", saved.getReturnNumber(), order.getOrderNumber(), orgId);

        if (request.isPostImmediately()) {
            return postMaterialReturn(orgId, saved.getId());
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public MaterialReturnResponse updateMaterialReturn(Long orgId, Long id, UpdateMaterialReturnRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        MaterialReturn mr = materialReturnRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material return not found with id: " + id));

        if (mr.getStatus() != MaterialReturnStatus.DRAFT) {
            throw new IllegalStateException("Only draft material returns can be edited. Posted returns cannot be modified.");
        }

        ProductionOrder order = mr.getProductionOrder();
        if (order.getStatus() != ProductionOrderStatus.IN_PROGRESS && order.getStatus() != ProductionOrderStatus.COMPLETED) {
            throw new IllegalStateException("Material return is allowed only for In Progress or Completed production orders.");
        }

        if (request.getReturnWarehouseId() != null) {
            Warehouse wh = warehouseRepository.findByIdAndOrganizationId(request.getReturnWarehouseId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Return warehouse not found with id: " + request.getReturnWarehouseId()));
            mr.setReturnWarehouse(wh);
        }

        mr.setReturnDate(request.getReturnDate());
        mr.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);

        Map<Long, ProductionOrderItem> orderItemsByMaterial = order.getItems().stream()
                .collect(Collectors.toMap(it -> it.getMaterial().getId(), Function.identity()));

        mr.getItems().clear();

        for (MaterialReturnItemRequest itemReq : request.getItems()) {
            ProductionOrderItem orderItem = orderItemsByMaterial.get(itemReq.getMaterialId());
            if (orderItem == null) {
                Item mat = itemRepository.findByIdAndOrganizationId(itemReq.getMaterialId(), orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + itemReq.getMaterialId()));
                throw new IllegalArgumentException("Material (" + mat.getName() + ") is not listed in the Production Order requirements.");
            }

            BigDecimal returnQty = itemReq.getReturnQuantity() != null ? itemReq.getReturnQuantity() : BigDecimal.ZERO;
            if (returnQty.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Return quantity cannot be negative for material: " + orderItem.getMaterial().getName());
            }

            BigDecimal returnableQty = orderItem.getRemainingQuantity();
            if (returnQty.compareTo(returnableQty) > 0) {
                throw new IllegalArgumentException("Cannot return " + returnQty + " " + orderItem.getUnitOfMeasure()
                        + " for " + orderItem.getMaterial().getName() + ". Available in production is only "
                        + returnableQty + " " + orderItem.getUnitOfMeasure() + ".");
            }

            MaterialReturnItem mrItem = MaterialReturnItem.builder()
                    .materialReturn(mr)
                    .material(orderItem.getMaterial())
                    .productionOrderItem(orderItem)
                    .returnQuantity(returnQty)
                    .unitOfMeasure(orderItem.getUnitOfMeasure())
                    .build();

            mr.getItems().add(mrItem);
        }

        MaterialReturn saved = materialReturnRepository.save(mr);
        if (request.isPostImmediately()) {
            return postMaterialReturn(orgId, saved.getId());
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public MaterialReturnResponse postMaterialReturn(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        MaterialReturn mr = materialReturnRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material return not found with id: " + id));

        if (mr.getStatus() == MaterialReturnStatus.POSTED) {
            throw new IllegalStateException("Material return is already posted. Duplicate posting is prevented.");
        }

        ProductionOrder order = mr.getProductionOrder();
        if (order.getStatus() != ProductionOrderStatus.IN_PROGRESS && order.getStatus() != ProductionOrderStatus.COMPLETED) {
            throw new IllegalStateException("Material return is allowed only for In Progress or Completed production orders.");
        }

        BigDecimal totalReturnQty = BigDecimal.ZERO;
        for (MaterialReturnItem item : mr.getItems()) {
            BigDecimal qty = item.getReturnQuantity() != null ? item.getReturnQuantity() : BigDecimal.ZERO;
            if (qty.compareTo(BigDecimal.ZERO) > 0) {
                totalReturnQty = totalReturnQty.add(qty);
            }
        }
        if (totalReturnQty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Cannot post return with zero total quantity. Enter a return quantity for at least one material.");
        }

        // Validate remaining in production against current state
        for (MaterialReturnItem item : mr.getItems()) {
            BigDecimal returnQty = item.getReturnQuantity() != null ? item.getReturnQuantity() : BigDecimal.ZERO;
            if (returnQty.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            ProductionOrderItem orderItem = item.getProductionOrderItem();
            BigDecimal remainingInProduction = orderItem.getRemainingQuantity();
            if (returnQty.compareTo(remainingInProduction) > 0) {
                throw new IllegalArgumentException("Cannot return " + returnQty + " " + orderItem.getUnitOfMeasure()
                        + " for " + orderItem.getMaterial().getName() + ". Available in production is only "
                        + remainingInProduction + " " + orderItem.getUnitOfMeasure() + ".");
            }
        }

        Organization org = mr.getOrganization();
        Warehouse returnWarehouse = mr.getReturnWarehouse();

        // Apply return: generate incoming stock movements and update returnedQuantity
        for (MaterialReturnItem item : mr.getItems()) {
            BigDecimal returnQty = item.getReturnQuantity() != null ? item.getReturnQuantity() : BigDecimal.ZERO;
            if (returnQty.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            // Create incoming stock movement back into the warehouse
            StockMovement movement = StockMovement.builder()
                    .organization(org)
                    .materialReturn(mr)
                    .productionOrder(order)
                    .item(item.getMaterial())
                    .warehouse(returnWarehouse)
                    .movementType("MATERIAL_RETURN")
                    .quantity(returnQty)
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .movementDate(mr.getReturnDate())
                    .referenceNumber(mr.getReturnNumber())
                    .build();

            stockMovementRepository.save(movement);

            // Update cumulative returned quantity on ProductionOrderItem
            ProductionOrderItem orderItem = item.getProductionOrderItem();
            orderItem.setReturnedQuantity(orderItem.getReturnedQuantity().add(returnQty));
            productionOrderItemRepository.save(orderItem);
        }

        mr.setStatus(MaterialReturnStatus.POSTED);
        MaterialReturn saved = materialReturnRepository.save(mr);
        log.info("Posted Material Return {} for Production Order {} in org {}. Incoming stock movement generated (+stock to warehouse {}).",
                saved.getReturnNumber(), order.getOrderNumber(), orgId, returnWarehouse.getName());

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteDraftMaterialReturn(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        MaterialReturn mr = materialReturnRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material return not found with id: " + id));

        if (mr.getStatus() != MaterialReturnStatus.DRAFT) {
            throw new IllegalStateException("Only draft material returns can be deleted.");
        }

        materialReturnRepository.delete(mr);
        log.info("Deleted draft Material Return {} for order {} in org {}", mr.getReturnNumber(), mr.getProductionOrder().getOrderNumber(), orgId);
    }

    private MaterialReturnResponse mapToResponse(MaterialReturn mr) {
        ProductionOrder order = mr.getProductionOrder();

        BigDecimal totalQuantity = BigDecimal.ZERO;
        List<MaterialReturnItemResponse> itemResponses = new ArrayList<>();

        for (MaterialReturnItem it : mr.getItems()) {
            BigDecimal qty = it.getReturnQuantity() != null ? it.getReturnQuantity() : BigDecimal.ZERO;
            totalQuantity = totalQuantity.add(qty);

            ProductionOrderItem orderItem = it.getProductionOrderItem();
            BigDecimal available = orderItem != null ? orderItem.getRemainingQuantity() : BigDecimal.ZERO;
            BigDecimal remainingAfter = available.subtract(qty);
            if (remainingAfter.compareTo(BigDecimal.ZERO) < 0) remainingAfter = BigDecimal.ZERO;

            itemResponses.add(MaterialReturnItemResponse.builder()
                    .id(it.getId())
                    .materialId(it.getMaterial().getId())
                    .materialCode(it.getMaterial().getItemCode())
                    .materialName(it.getMaterial().getName())
                    .productionOrderItemId(orderItem != null ? orderItem.getId() : null)
                    .returnableQuantity(available)
                    .returnQuantity(qty)
                    .remainingInProduction(remainingAfter)
                    .unitOfMeasure(it.getUnitOfMeasure())
                    .build());
        }

        return MaterialReturnResponse.builder()
                .id(mr.getId())
                .returnNumber(mr.getReturnNumber())
                .returnDate(mr.getReturnDate())
                .productionOrderId(order.getId())
                .productionOrderNumber(order.getOrderNumber())
                .orderStatus(order.getStatus().name())
                .productId(order.getProduct().getId())
                .productCode(order.getProduct().getItemCode())
                .productName(order.getProduct().getName())
                .returnWarehouseId(mr.getReturnWarehouse().getId())
                .returnWarehouseCode(mr.getReturnWarehouse().getWarehouseCode())
                .returnWarehouseName(mr.getReturnWarehouse().getName())
                .status(mr.getStatus())
                .notes(mr.getNotes())
                .totalItems(mr.getItems().size())
                .totalQuantity(totalQuantity)
                .createdAt(mr.getCreatedAt())
                .updatedAt(mr.getUpdatedAt())
                .items(itemResponses)
                .build();
    }
}
