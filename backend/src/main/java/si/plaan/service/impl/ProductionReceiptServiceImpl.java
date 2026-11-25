package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateProductionReceiptRequest;
import si.plaan.dto.request.UpdateProductionReceiptRequest;
import si.plaan.dto.response.ProductionReceiptResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.*;
import si.plaan.service.ProductionReceiptService;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductionReceiptServiceImpl implements ProductionReceiptService {

    private static final String PR_PREFIX = "PR-";

    private final ProductionReceiptRepository productionReceiptRepository;
    private final ProductionOrderRepository productionOrderRepository;
    private final OrganizationRepository organizationRepository;
    private final MaterialConsumptionRepository materialConsumptionRepository;
    private final StockMovementRepository stockMovementRepository;

    @Override
    @Transactional(readOnly = true)
    public String getNextReceiptNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = productionReceiptRepository.findMaxReceiptNumberByOrganizationId(orgId);
        return String.format("%s%03d", PR_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductionReceiptResponse> getProductionReceiptsByProductionOrder(Long orgId, Long productionOrderId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        return productionReceiptRepository
                .findByOrganizationIdAndProductionOrderIdOrderByCreatedAtDesc(orgId, productionOrderId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProductionReceiptResponse getProductionReceiptById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        ProductionReceipt pr = productionReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production receipt not found with id: " + id));
        return mapToResponse(pr);
    }

    @Override
    @Transactional
    public ProductionReceiptResponse createProductionReceipt(Long orgId, CreateProductionReceiptRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        ProductionOrder order = productionOrderRepository.findByIdAndOrganizationId(request.getProductionOrderId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production order not found with id: " + request.getProductionOrderId()));

        if (order.getStatus() != ProductionOrderStatus.IN_PROGRESS) {
            throw new IllegalStateException("Production receipts are allowed only for In Progress production orders. Current status: " + order.getStatus());
        }

        boolean hasPostedConsumption = materialConsumptionRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(
                orgId, order.getId(), MaterialConsumptionStatus.POSTED
        );
        if (!hasPostedConsumption) {
            throw new IllegalStateException("Cannot record production receipt before raw materials have been consumed. Please record material consumption first.");
        }

        if (request.getReceiptQuantity() == null || request.getReceiptQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Receipt quantity must be greater than zero.");
        }

        BigDecimal pending = order.getPendingProductionQuantity();
        if (request.getReceiptQuantity().compareTo(pending) > 0) {
            throw new IllegalArgumentException(String.format("Receipt quantity (%s) cannot exceed pending production quantity (%s).",
                    request.getReceiptQuantity().stripTrailingZeros().toPlainString(),
                    pending.stripTrailingZeros().toPlainString()));
        }

        String receiptNumber = request.getReceiptNumber();
        if (receiptNumber == null || receiptNumber.trim().isEmpty() || receiptNumber.startsWith("PR-...")) {
            receiptNumber = getNextReceiptNumber(orgId);
        } else {
            receiptNumber = receiptNumber.trim();
            if (productionReceiptRepository.existsByOrganizationIdAndReceiptNumber(orgId, receiptNumber)) {
                throw new IllegalArgumentException("Receipt number (" + receiptNumber + ") already exists in your organization.");
            }
        }

        ProductionReceipt receipt = ProductionReceipt.builder()
                .organization(org)
                .receiptNumber(receiptNumber)
                .receiptDate(request.getReceiptDate())
                .productionOrder(order)
                .product(order.getProduct())
                .receivingWarehouse(order.getFinishedGoodsWarehouse())
                .receiptQuantity(request.getReceiptQuantity())
                .unitOfMeasure(order.getUnitOfMeasure())
                .status(ProductionReceiptStatus.DRAFT)
                .notes(request.getNotes())
                .build();

        ProductionReceipt saved = productionReceiptRepository.save(receipt);

        if (request.isPostImmediately()) {
            return postProductionReceiptInternal(saved, order);
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public ProductionReceiptResponse updateProductionReceipt(Long orgId, Long id, UpdateProductionReceiptRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionReceipt receipt = productionReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production receipt not found with id: " + id));

        if (receipt.getStatus() != ProductionReceiptStatus.DRAFT) {
            throw new IllegalStateException("Only draft production receipts can be updated.");
        }

        ProductionOrder order = receipt.getProductionOrder();
        if (order.getStatus() != ProductionOrderStatus.IN_PROGRESS) {
            throw new IllegalStateException("Production order is not in progress.");
        }

        if (request.getReceiptQuantity() == null || request.getReceiptQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Receipt quantity must be greater than zero.");
        }

        BigDecimal pending = order.getPendingProductionQuantity();
        if (request.getReceiptQuantity().compareTo(pending) > 0) {
            throw new IllegalArgumentException(String.format("Receipt quantity (%s) cannot exceed pending production quantity (%s).",
                    request.getReceiptQuantity().stripTrailingZeros().toPlainString(),
                    pending.stripTrailingZeros().toPlainString()));
        }

        receipt.setReceiptDate(request.getReceiptDate());
        receipt.setReceiptQuantity(request.getReceiptQuantity());
        receipt.setNotes(request.getNotes());

        ProductionReceipt saved = productionReceiptRepository.save(receipt);

        if (request.isPostImmediately()) {
            return postProductionReceiptInternal(saved, order);
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public ProductionReceiptResponse postProductionReceipt(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionReceipt receipt = productionReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production receipt not found with id: " + id));

        if (receipt.getStatus() == ProductionReceiptStatus.POSTED) {
            throw new IllegalStateException("Production receipt is already posted.");
        }

        ProductionOrder order = receipt.getProductionOrder();
        if (order.getStatus() != ProductionOrderStatus.IN_PROGRESS) {
            throw new IllegalStateException("Production receipts are allowed only for In Progress production orders. Current status: " + order.getStatus());
        }

        boolean hasPostedConsumption = materialConsumptionRepository.existsByOrganizationIdAndProductionOrderIdAndStatus(
                orgId, order.getId(), MaterialConsumptionStatus.POSTED
        );
        if (!hasPostedConsumption) {
            throw new IllegalStateException("Cannot record production receipt before raw materials have been consumed. Please record material consumption first.");
        }

        BigDecimal pending = order.getPendingProductionQuantity();
        if (receipt.getReceiptQuantity().compareTo(pending) > 0) {
            throw new IllegalArgumentException(String.format("Receipt quantity (%s) exceeds pending production quantity (%s).",
                    receipt.getReceiptQuantity().stripTrailingZeros().toPlainString(),
                    pending.stripTrailingZeros().toPlainString()));
        }

        return postProductionReceiptInternal(receipt, order);
    }

    private ProductionReceiptResponse postProductionReceiptInternal(ProductionReceipt receipt, ProductionOrder order) {
        // 1. Create inbound stock movement into finished goods warehouse
        StockMovement movement = StockMovement.builder()
                .organization(receipt.getOrganization())
                .productionReceipt(receipt)
                .productionOrder(order)
                .item(receipt.getProduct())
                .warehouse(receipt.getReceivingWarehouse())
                .movementType("PRODUCTION_RECEIPT")
                .quantity(receipt.getReceiptQuantity())
                .unitOfMeasure(receipt.getUnitOfMeasure())
                .movementDate(receipt.getReceiptDate())
                .referenceNumber(receipt.getReceiptNumber())
                .build();
        stockMovementRepository.save(movement);

        // 2. Increment order's receivedQuantity
        BigDecimal newReceived = order.getReceivedQuantity().add(receipt.getReceiptQuantity());
        order.setReceivedQuantity(newReceived);
        productionOrderRepository.save(order);

        // 3. Mark receipt as POSTED
        receipt.setStatus(ProductionReceiptStatus.POSTED);
        ProductionReceipt saved = productionReceiptRepository.save(receipt);

        log.info("Posted production receipt {} for order {} in org {}: received {} {}",
                saved.getReceiptNumber(), order.getOrderNumber(), receipt.getOrganization().getId(),
                saved.getReceiptQuantity(), saved.getUnitOfMeasure());

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteDraftProductionReceipt(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ProductionReceipt receipt = productionReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Production receipt not found with id: " + id));

        if (receipt.getStatus() != ProductionReceiptStatus.DRAFT) {
            throw new IllegalStateException("Only draft production receipts can be deleted. Posted receipts must be preserved for audit history.");
        }

        productionReceiptRepository.delete(receipt);
        log.info("Deleted draft production receipt {} for org {}", receipt.getReceiptNumber(), orgId);
    }

    private ProductionReceiptResponse mapToResponse(ProductionReceipt pr) {
        return ProductionReceiptResponse.builder()
                .id(pr.getId())
                .receiptNumber(pr.getReceiptNumber())
                .receiptDate(pr.getReceiptDate())
                .productionOrderId(pr.getProductionOrder().getId())
                .productionOrderNumber(pr.getProductionOrder().getOrderNumber())
                .productId(pr.getProduct().getId())
                .productCode(pr.getProduct().getItemCode())
                .productName(pr.getProduct().getName())
                .receivingWarehouseId(pr.getReceivingWarehouse().getId())
                .receivingWarehouseCode(pr.getReceivingWarehouse().getWarehouseCode())
                .receivingWarehouseName(pr.getReceivingWarehouse().getName())
                .receiptQuantity(pr.getReceiptQuantity())
                .unitOfMeasure(pr.getUnitOfMeasure())
                .status(pr.getStatus())
                .notes(pr.getNotes())
                .createdAt(pr.getCreatedAt())
                .updatedAt(pr.getUpdatedAt())
                .build();
    }
}
