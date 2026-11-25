package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateMaterialConsumptionRequest;
import si.plaan.dto.request.MaterialConsumptionItemRequest;
import si.plaan.dto.request.UpdateMaterialConsumptionRequest;
import si.plaan.dto.response.MaterialConsumptionItemResponse;
import si.plaan.dto.response.MaterialConsumptionResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.*;
import si.plaan.service.MaterialConsumptionService;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaterialConsumptionServiceImpl implements MaterialConsumptionService {

    private static final String MC_PREFIX = "MC-";

    private final MaterialConsumptionRepository materialConsumptionRepository;
    private final ProductionOrderRepository productionOrderRepository;
    private final ProductionOrderItemRepository productionOrderItemRepository;
    private final OrganizationRepository organizationRepository;
    private final ItemRepository itemRepository;

    @Override
    @Transactional(readOnly = true)
    public String getNextConsumptionNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = materialConsumptionRepository.findMaxConsumptionNumberByOrganizationId(orgId);
        return String.format("%s%03d", MC_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialConsumptionResponse> getMaterialConsumptionsByProductionOrder(Long orgId, Long productionOrderId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        return materialConsumptionRepository
                .findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(orgId, productionOrderId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public MaterialConsumptionResponse getMaterialConsumptionById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        MaterialConsumption mc = materialConsumptionRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material consumption not found with id: " + id));
        return mapToResponse(mc);
    }

    @Override
    @Transactional
    public MaterialConsumptionResponse createMaterialConsumption(Long orgId, CreateMaterialConsumptionRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(request.getProductionOrderId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + request.getProductionOrderId()));

        if (order.getStatus() != ProductionOrderStatus.IN_PROGRESS && order.getStatus() != ProductionOrderStatus.COMPLETED) {
            throw new IllegalStateException("Material consumption is allowed only for In Progress or Completed production orders. Current status: " + order.getStatus());
        }

        String consumptionNumber = request.getConsumptionNumber();
        if (consumptionNumber == null || consumptionNumber.trim().isEmpty() || consumptionNumber.startsWith("MC-...")) {
            consumptionNumber = getNextConsumptionNumber(orgId);
        } else {
            consumptionNumber = consumptionNumber.trim();
            if (materialConsumptionRepository.existsByOrganizationIdAndConsumptionNumber(orgId, consumptionNumber)) {
                throw new IllegalArgumentException("Consumption number (" + consumptionNumber + ") already exists in your organization.");
            }
        }

        Map<Long, ProductionOrderItem> orderItemsByMaterial = order.getItems().stream()
                .collect(Collectors.toMap(it -> it.getMaterial().getId(), Function.identity()));

        MaterialConsumption mc = MaterialConsumption.builder()
                .organization(org)
                .consumptionNumber(consumptionNumber)
                .consumptionDate(request.getConsumptionDate())
                .productionOrder(order)
                .status(MaterialConsumptionStatus.DRAFT)
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .items(new ArrayList<>())
                .build();

        for (MaterialConsumptionItemRequest itemReq : request.getItems()) {
            ProductionOrderItem orderItem = orderItemsByMaterial.get(itemReq.getMaterialId());
            if (orderItem == null) {
                Item mat = itemRepository.findByIdAndOrganizationId(itemReq.getMaterialId(), orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + itemReq.getMaterialId()));
                throw new IllegalArgumentException("Material (" + mat.getName() + ") is not listed in the Production Order requirements.");
            }

            BigDecimal consumeQty = itemReq.getConsumedQuantity() != null ? itemReq.getConsumedQuantity() : BigDecimal.ZERO;
            if (consumeQty.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Consumed quantity cannot be negative for material: " + orderItem.getMaterial().getName());
            }

            BigDecimal remainingInProduction = orderItem.getRemainingQuantity();
            if (consumeQty.compareTo(remainingInProduction) > 0) {
                throw new IllegalArgumentException("Cannot consume " + consumeQty + " " + orderItem.getUnitOfMeasure()
                        + " for " + orderItem.getMaterial().getName() + ". Available in production is only "
                        + remainingInProduction + " " + orderItem.getUnitOfMeasure() + ".");
            }

            MaterialConsumptionItem mcItem = MaterialConsumptionItem.builder()
                    .materialConsumption(mc)
                    .material(orderItem.getMaterial())
                    .productionOrderItem(orderItem)
                    .consumedQuantity(consumeQty)
                    .unitOfMeasure(orderItem.getUnitOfMeasure())
                    .build();

            mc.getItems().add(mcItem);
        }

        MaterialConsumption saved = materialConsumptionRepository.save(mc);
        log.info("Created Material Consumption {} (status: DRAFT) for order {} in org {}", saved.getConsumptionNumber(), order.getOrderNumber(), orgId);

        if (request.isPostImmediately()) {
            return postMaterialConsumption(orgId, saved.getId());
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public MaterialConsumptionResponse updateMaterialConsumption(Long orgId, Long id, UpdateMaterialConsumptionRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        MaterialConsumption mc = materialConsumptionRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material consumption not found with id: " + id));

        if (mc.getStatus() != MaterialConsumptionStatus.DRAFT) {
            throw new IllegalStateException("Only draft material consumptions can be edited. Posted consumptions cannot be modified.");
        }

        ProductionOrder order = mc.getProductionOrder();
        if (order.getStatus() != ProductionOrderStatus.IN_PROGRESS && order.getStatus() != ProductionOrderStatus.COMPLETED) {
            throw new IllegalStateException("Material consumption is allowed only for In Progress or Completed production orders.");
        }

        mc.setConsumptionDate(request.getConsumptionDate());
        mc.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);

        Map<Long, ProductionOrderItem> orderItemsByMaterial = order.getItems().stream()
                .collect(Collectors.toMap(it -> it.getMaterial().getId(), Function.identity()));

        mc.getItems().clear();

        for (MaterialConsumptionItemRequest itemReq : request.getItems()) {
            ProductionOrderItem orderItem = orderItemsByMaterial.get(itemReq.getMaterialId());
            if (orderItem == null) {
                Item mat = itemRepository.findByIdAndOrganizationId(itemReq.getMaterialId(), orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + itemReq.getMaterialId()));
                throw new IllegalArgumentException("Material (" + mat.getName() + ") is not listed in the Production Order requirements.");
            }

            BigDecimal consumeQty = itemReq.getConsumedQuantity() != null ? itemReq.getConsumedQuantity() : BigDecimal.ZERO;
            if (consumeQty.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Consumed quantity cannot be negative for material: " + orderItem.getMaterial().getName());
            }

            BigDecimal remainingInProduction = orderItem.getRemainingQuantity();
            if (consumeQty.compareTo(remainingInProduction) > 0) {
                throw new IllegalArgumentException("Cannot consume " + consumeQty + " " + orderItem.getUnitOfMeasure()
                        + " for " + orderItem.getMaterial().getName() + ". Available in production is only "
                        + remainingInProduction + " " + orderItem.getUnitOfMeasure() + ".");
            }

            MaterialConsumptionItem mcItem = MaterialConsumptionItem.builder()
                    .materialConsumption(mc)
                    .material(orderItem.getMaterial())
                    .productionOrderItem(orderItem)
                    .consumedQuantity(consumeQty)
                    .unitOfMeasure(orderItem.getUnitOfMeasure())
                    .build();

            mc.getItems().add(mcItem);
        }

        MaterialConsumption saved = materialConsumptionRepository.save(mc);
        if (request.isPostImmediately()) {
            return postMaterialConsumption(orgId, saved.getId());
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public MaterialConsumptionResponse postMaterialConsumption(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        MaterialConsumption mc = materialConsumptionRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material consumption not found with id: " + id));

        if (mc.getStatus() == MaterialConsumptionStatus.POSTED) {
            throw new IllegalStateException("Material consumption is already posted. Duplicate posting is prevented.");
        }

        ProductionOrder order = mc.getProductionOrder();
        if (order.getStatus() != ProductionOrderStatus.IN_PROGRESS && order.getStatus() != ProductionOrderStatus.COMPLETED) {
            throw new IllegalStateException("Material consumption is allowed only for In Progress or Completed production orders.");
        }

        BigDecimal totalConsumeQty = BigDecimal.ZERO;
        for (MaterialConsumptionItem item : mc.getItems()) {
            BigDecimal qty = item.getConsumedQuantity() != null ? item.getConsumedQuantity() : BigDecimal.ZERO;
            if (qty.compareTo(BigDecimal.ZERO) > 0) {
                totalConsumeQty = totalConsumeQty.add(qty);
            }
        }
        if (totalConsumeQty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Cannot post consumption with zero total quantity. Enter a consumed quantity for at least one material.");
        }

        // Validate remaining in production against current state
        for (MaterialConsumptionItem item : mc.getItems()) {
            BigDecimal consumeQty = item.getConsumedQuantity() != null ? item.getConsumedQuantity() : BigDecimal.ZERO;
            if (consumeQty.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            ProductionOrderItem orderItem = item.getProductionOrderItem();
            BigDecimal remainingInProduction = orderItem.getRemainingQuantity();
            if (consumeQty.compareTo(remainingInProduction) > 0) {
                throw new IllegalArgumentException("Cannot consume " + consumeQty + " " + orderItem.getUnitOfMeasure()
                        + " for " + orderItem.getMaterial().getName() + ". Available in production is only "
                        + remainingInProduction + " " + orderItem.getUnitOfMeasure() + ".");
            }
        }

        // Apply consumption: updates material accountability against Production Order (NO stock movement)
        for (MaterialConsumptionItem item : mc.getItems()) {
            BigDecimal consumeQty = item.getConsumedQuantity() != null ? item.getConsumedQuantity() : BigDecimal.ZERO;
            if (consumeQty.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            ProductionOrderItem orderItem = item.getProductionOrderItem();
            orderItem.setConsumedQuantity(orderItem.getConsumedQuantity().add(consumeQty));
            productionOrderItemRepository.save(orderItem);
        }

        mc.setStatus(MaterialConsumptionStatus.POSTED);
        MaterialConsumption saved = materialConsumptionRepository.save(mc);
        log.info("Posted Material Consumption {} for Production Order {} in org {}. Accountability updated (no warehouse stock deducted).",
                saved.getConsumptionNumber(), order.getOrderNumber(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteDraftMaterialConsumption(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        MaterialConsumption mc = materialConsumptionRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Material consumption not found with id: " + id));

        if (mc.getStatus() != MaterialConsumptionStatus.DRAFT) {
            throw new IllegalStateException("Only draft material consumptions can be deleted.");
        }

        materialConsumptionRepository.delete(mc);
        log.info("Deleted draft Material Consumption {} for order {} in org {}", mc.getConsumptionNumber(), mc.getProductionOrder().getOrderNumber(), orgId);
    }

    private MaterialConsumptionResponse mapToResponse(MaterialConsumption mc) {
        ProductionOrder order = mc.getProductionOrder();

        BigDecimal totalQuantity = BigDecimal.ZERO;
        List<MaterialConsumptionItemResponse> itemResponses = new ArrayList<>();

        for (MaterialConsumptionItem it : mc.getItems()) {
            BigDecimal qty = it.getConsumedQuantity() != null ? it.getConsumedQuantity() : BigDecimal.ZERO;
            totalQuantity = totalQuantity.add(qty);

            ProductionOrderItem orderItem = it.getProductionOrderItem();
            BigDecimal available = orderItem != null ? orderItem.getRemainingQuantity() : BigDecimal.ZERO;
            BigDecimal remainingAfter = available.subtract(qty);
            if (remainingAfter.compareTo(BigDecimal.ZERO) < 0) remainingAfter = BigDecimal.ZERO;

            itemResponses.add(MaterialConsumptionItemResponse.builder()
                    .id(it.getId())
                    .materialId(it.getMaterial().getId())
                    .materialCode(it.getMaterial().getItemCode())
                    .materialName(it.getMaterial().getName())
                    .productionOrderItemId(orderItem != null ? orderItem.getId() : null)
                    .availableInProduction(available)
                    .consumedQuantity(qty)
                    .remainingInProduction(remainingAfter)
                    .unitOfMeasure(it.getUnitOfMeasure())
                    .build());
        }

        return MaterialConsumptionResponse.builder()
                .id(mc.getId())
                .consumptionNumber(mc.getConsumptionNumber())
                .consumptionDate(mc.getConsumptionDate())
                .productionOrderId(order.getId())
                .productionOrderNumber(order.getOrderNumber())
                .orderStatus(order.getStatus().name())
                .productId(order.getProduct().getId())
                .productCode(order.getProduct().getItemCode())
                .productName(order.getProduct().getName())
                .status(mc.getStatus())
                .notes(mc.getNotes())
                .totalItems(mc.getItems().size())
                .totalQuantity(totalQuantity)
                .createdAt(mc.getCreatedAt())
                .updatedAt(mc.getUpdatedAt())
                .items(itemResponses)
                .build();
    }
}
