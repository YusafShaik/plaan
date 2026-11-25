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
import si.plaan.dto.request.CreateGoodsReceiptRequest;
import si.plaan.dto.request.GoodsReceiptItemRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.*;
import si.plaan.service.GoodsReceiptService;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoodsReceiptServiceImpl implements GoodsReceiptService {

    private final GoodsReceiptRepository goodsReceiptRepository;
    private final GoodsReceiptItemRepository goodsReceiptItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final OrganizationRepository organizationRepository;

    private static final String GRN_PREFIX = "GRN-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<GoodsReceiptResponse> getGoodsReceipts(
            Long orgId,
            String search,
            GoodsReceiptStatus status,
            Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<GoodsReceipt> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate grnLike = cb.like(cb.lower(root.get("grnNumber")), pattern);
                Predicate poLike = cb.like(cb.lower(root.get("purchaseOrder").get("poNumber")), pattern);
                Predicate supplierLike = cb.like(cb.lower(root.get("purchaseOrder").get("supplier").get("name")), pattern);
                Predicate warehouseLike = cb.like(cb.lower(root.get("purchaseOrder").get("receivingWarehouse").get("name")), pattern);
                Predicate noteLike = cb.like(cb.lower(root.get("deliveryNoteNumber")), pattern);
                predicates.add(cb.or(grnLike, poLike, supplierLike, warehouseLike, noteLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<GoodsReceipt> page = goodsReceiptRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public GoodsReceiptResponse getGoodsReceiptById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        GoodsReceipt grn = goodsReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Goods receipt not found with id: " + id));
        return mapToResponse(grn);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextGrnNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = goodsReceiptRepository.findMaxGrnNumberByOrganizationId(orgId);
        return String.format("%s%03d", GRN_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public GoodsReceiptSummaryResponse getSummary(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        long total = goodsReceiptRepository.countByOrganizationId(orgId);
        long draft = goodsReceiptRepository.countByOrganizationIdAndStatus(orgId, GoodsReceiptStatus.DRAFT);
        long posted = goodsReceiptRepository.countByOrganizationIdAndStatus(orgId, GoodsReceiptStatus.POSTED);

        return new GoodsReceiptSummaryResponse(total, draft, posted, total);
    }

    @Override
    @Transactional
    public List<PoEligibleForGrnResponse> getEligiblePurchaseOrders(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        List<PurchaseOrder> activePos = purchaseOrderRepository.findByOrganizationIdAndStatusInOrderByCreatedAtDesc(
                orgId,
                List.of(PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.PARTIALLY_RECEIVED)
        );

        List<PoEligibleForGrnResponse> eligibleList = new ArrayList<>();

        for (PurchaseOrder po : activePos) {
            List<PoLineItemForGrnResponse> lineItems = new ArrayList<>();
            boolean hasRemaining = false;

            for (PurchaseOrderItem poItem : po.getItems()) {
                BigDecimal ordered = poItem.getQuantity();
                BigDecimal previouslyReceived = goodsReceiptItemRepository.sumPostedReceivedQuantityByPoItemId(poItem.getId());
                if (previouslyReceived == null) previouslyReceived = BigDecimal.ZERO;
                BigDecimal remaining = ordered.subtract(previouslyReceived);
                if (remaining.compareTo(BigDecimal.ZERO) < 0) {
                    remaining = BigDecimal.ZERO;
                }
                if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                    hasRemaining = true;
                }

                lineItems.add(new PoLineItemForGrnResponse(
                        poItem.getId(),
                        poItem.getItem().getId(),
                        poItem.getItem().getItemCode(),
                        poItem.getItem().getName(),
                        poItem.getUnitOfMeasure(),
                        ordered,
                        previouslyReceived,
                        remaining
                ));
            }

            // If a PO has no remaining items left across all lines, auto-complete it and don't allow new GRNs!
            if (!hasRemaining && !lineItems.isEmpty()) {
                po.setStatus(PurchaseOrderStatus.COMPLETED);
                purchaseOrderRepository.save(po);
                log.info("PO {} auto-marked as COMPLETED because all line items are fulfilled", po.getPoNumber());
            } else {
                eligibleList.add(new PoEligibleForGrnResponse(
                        po.getId(),
                        po.getPoNumber(),
                        po.getStatus(),
                        po.getSupplier().getId(),
                        po.getSupplier().getSupplierCode(),
                        po.getSupplier().getName(),
                        po.getReceivingWarehouse().getId(),
                        po.getReceivingWarehouse().getWarehouseCode(),
                        po.getReceivingWarehouse().getName(),
                        po.getOrderDate(),
                        po.getExpectedDeliveryDate(),
                        lineItems
                ));
            }
        }

        return eligibleList;
    }

    @Override
    @Transactional(readOnly = true)
    public PoEligibleForGrnResponse getPurchaseOrderDetailsForGrn(Long orgId, Long poId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        PurchaseOrder po = purchaseOrderRepository.findByIdAndOrganizationId(poId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with id: " + poId));

        List<PoLineItemForGrnResponse> lineItems = po.getItems().stream().map(poItem -> {
            BigDecimal ordered = poItem.getQuantity();
            BigDecimal previouslyReceived = goodsReceiptItemRepository.sumPostedReceivedQuantityByPoItemId(poItem.getId());
            if (previouslyReceived == null) previouslyReceived = BigDecimal.ZERO;
            BigDecimal remaining = ordered.subtract(previouslyReceived);
            if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;

            return new PoLineItemForGrnResponse(
                    poItem.getId(),
                    poItem.getItem().getId(),
                    poItem.getItem().getItemCode(),
                    poItem.getItem().getName(),
                    poItem.getUnitOfMeasure(),
                    ordered,
                    previouslyReceived,
                    remaining
            );
        }).toList();

        return new PoEligibleForGrnResponse(
                po.getId(),
                po.getPoNumber(),
                po.getStatus(),
                po.getSupplier().getId(),
                po.getSupplier().getSupplierCode(),
                po.getSupplier().getName(),
                po.getReceivingWarehouse().getId(),
                po.getReceivingWarehouse().getWarehouseCode(),
                po.getReceivingWarehouse().getName(),
                po.getOrderDate(),
                po.getExpectedDeliveryDate(),
                lineItems
        );
    }

    @Override
    @Transactional
    public GoodsReceiptResponse createGoodsReceipt(Long orgId, CreateGoodsReceiptRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        PurchaseOrder po = purchaseOrderRepository.findByIdAndOrganizationId(request.purchaseOrderId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with id: " + request.purchaseOrderId()));

        if (po.getStatus() == PurchaseOrderStatus.COMPLETED) {
            throw new IllegalStateException("Cannot create goods receipt against completed purchase order " + po.getPoNumber());
        }
        if (po.getStatus() == PurchaseOrderStatus.CANCELLED) {
            throw new IllegalStateException("Cannot create goods receipt against cancelled purchase order " + po.getPoNumber());
        }
        if (po.getStatus() == PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Cannot create goods receipt against draft purchase order " + po.getPoNumber() + ". Order must be issued first.");
        }

        String finalGrnNumber;
        if (request.grnNumber() != null && !request.grnNumber().trim().isBlank()) {
            finalGrnNumber = request.grnNumber().trim().toUpperCase();
        } else {
            finalGrnNumber = getNextGrnNumber(orgId);
        }

        if (goodsReceiptRepository.existsByOrganizationIdAndGrnNumberIgnoreCase(orgId, finalGrnNumber)) {
            throw new IllegalArgumentException("Goods receipt number '" + finalGrnNumber + "' already exists in this organization");
        }

        GoodsReceiptStatus targetStatus = request.status() != null ? request.status() : GoodsReceiptStatus.DRAFT;

        GoodsReceipt grn = GoodsReceipt.builder()
                .organization(org)
                .grnNumber(finalGrnNumber)
                .purchaseOrder(po)
                .receiptDate(request.receiptDate())
                .deliveryNoteNumber(request.deliveryNoteNumber() != null && !request.deliveryNoteNumber().isBlank() ? request.deliveryNoteNumber().trim() : null)
                .notes(request.notes() != null && !request.notes().isBlank() ? request.notes().trim() : null)
                .status(targetStatus)
                .build();

        Map<Long, PurchaseOrderItem> poItemMap = po.getItems().stream()
                .collect(Collectors.toMap(PurchaseOrderItem::getId, item -> item));

        BigDecimal totalReceivedInGrn = BigDecimal.ZERO;

        for (GoodsReceiptItemRequest itemReq : request.items()) {
            PurchaseOrderItem poItem = poItemMap.get(itemReq.purchaseOrderItemId());
            if (poItem == null) {
                throw new IllegalArgumentException("Purchase order line item " + itemReq.purchaseOrderItemId() + " not found in PO " + po.getPoNumber());
            }

            BigDecimal ordered = poItem.getQuantity();
            BigDecimal previouslyReceived = goodsReceiptItemRepository.sumPostedReceivedQuantityByPoItemId(poItem.getId());
            if (previouslyReceived == null) previouslyReceived = BigDecimal.ZERO;
            BigDecimal availableRemaining = ordered.subtract(previouslyReceived);
            if (availableRemaining.compareTo(BigDecimal.ZERO) < 0) availableRemaining = BigDecimal.ZERO;

            BigDecimal receivingNow = itemReq.receivedQuantity();
            if (receivingNow.compareTo(availableRemaining) > 0) {
                throw new IllegalArgumentException("Cannot receive " + receivingNow + " " + poItem.getUnitOfMeasure() +
                        " for item '" + poItem.getItem().getName() + "'. Maximum remaining allowed is " + availableRemaining);
            }

            BigDecimal newRemaining = availableRemaining.subtract(receivingNow);
            totalReceivedInGrn = totalReceivedInGrn.add(receivingNow);

            GoodsReceiptItem grnItem = GoodsReceiptItem.builder()
                    .goodsReceipt(grn)
                    .purchaseOrderItem(poItem)
                    .item(poItem.getItem())
                    .unitOfMeasure(poItem.getUnitOfMeasure())
                    .orderedQuantity(ordered)
                    .previouslyReceivedQuantity(previouslyReceived)
                    .receivedQuantity(receivingNow)
                    .remainingQuantity(newRemaining)
                    .build();

            grn.addItem(grnItem);
        }

        GoodsReceipt savedGrn = goodsReceiptRepository.save(grn);

        // If POSTED directly upon creation, record stock movements and update PO status!
        if (targetStatus == GoodsReceiptStatus.POSTED) {
            applyStockMovementsAndPoStatus(savedGrn, po);
        }

        return mapToResponse(savedGrn);
    }

    @Override
    @Transactional
    public GoodsReceiptResponse postGoodsReceipt(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        GoodsReceipt grn = goodsReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Goods receipt not found with id: " + id));

        if (grn.getStatus() == GoodsReceiptStatus.POSTED) {
            throw new IllegalStateException("Goods receipt " + grn.getGrnNumber() + " is already posted");
        }
        if (grn.getStatus() == GoodsReceiptStatus.CANCELLED) {
            throw new IllegalStateException("Cannot post cancelled goods receipt " + grn.getGrnNumber());
        }

        PurchaseOrder po = grn.getPurchaseOrder();
        if (po.getStatus() == PurchaseOrderStatus.COMPLETED) {
            throw new IllegalStateException("Associated purchase order " + po.getPoNumber() + " is already completed");
        }

        grn.setStatus(GoodsReceiptStatus.POSTED);
        GoodsReceipt savedGrn = goodsReceiptRepository.save(grn);

        applyStockMovementsAndPoStatus(savedGrn, po);

        return mapToResponse(savedGrn);
    }

    @Override
    @Transactional
    public GoodsReceiptResponse cancelGoodsReceipt(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        GoodsReceipt grn = goodsReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Goods receipt not found with id: " + id));

        if (grn.getStatus() == GoodsReceiptStatus.POSTED) {
            throw new IllegalStateException("Cannot cancel an already POSTED goods receipt. Inventory has already moved.");
        }

        grn.setStatus(GoodsReceiptStatus.CANCELLED);
        GoodsReceipt saved = goodsReceiptRepository.save(grn);
        return mapToResponse(saved);
    }

    private void applyStockMovementsAndPoStatus(GoodsReceipt grn, PurchaseOrder po) {
        // Record Stock Movements for each item received with quantity > 0
        for (GoodsReceiptItem item : grn.getItems()) {
            if (item.getReceivedQuantity().compareTo(BigDecimal.ZERO) > 0) {
                StockMovement movement = StockMovement.builder()
                        .organization(grn.getOrganization())
                        .goodsReceipt(grn)
                        .purchaseOrder(po)
                        .item(item.getItem())
                        .warehouse(po.getReceivingWarehouse())
                        .movementType("INBOUND_RECEIPT")
                        .quantity(item.getReceivedQuantity())
                        .unitOfMeasure(item.getUnitOfMeasure())
                        .movementDate(grn.getReceiptDate())
                        .referenceNumber(grn.getGrnNumber())
                        .build();

                stockMovementRepository.save(movement);
            }
        }

        // Re-evaluate entire PO status across all line items
        boolean allCompleted = true;
        boolean anyReceived = false;

        for (PurchaseOrderItem poItem : po.getItems()) {
            BigDecimal ordered = poItem.getQuantity();
            BigDecimal totalReceived = goodsReceiptItemRepository.sumPostedReceivedQuantityByPoItemId(poItem.getId());
            if (totalReceived == null) totalReceived = BigDecimal.ZERO;

            if (totalReceived.compareTo(BigDecimal.ZERO) > 0) {
                anyReceived = true;
            }
            if (totalReceived.compareTo(ordered) < 0) {
                allCompleted = false;
            }
        }

        if (allCompleted) {
            po.setStatus(PurchaseOrderStatus.COMPLETED);
        } else if (anyReceived) {
            po.setStatus(PurchaseOrderStatus.PARTIALLY_RECEIVED);
        }

        purchaseOrderRepository.save(po);
        log.info("Updated PO {} status to {}", po.getPoNumber(), po.getStatus());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StockMovementResponse> getStockMovements(Long orgId, String search, Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<StockMovement> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate refLike = cb.like(cb.lower(root.get("referenceNumber")), pattern);
                Predicate poLike = cb.like(cb.lower(root.get("purchaseOrder").get("poNumber")), pattern);
                Predicate itemLike = cb.like(cb.lower(root.get("item").get("name")), pattern);
                Predicate whLike = cb.like(cb.lower(root.get("warehouse").get("name")), pattern);
                predicates.add(cb.or(refLike, poLike, itemLike, whLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<StockMovement> page = stockMovementRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapMovementToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockMovementResponse> getStockMovementsForPo(Long orgId, Long poId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        return stockMovementRepository.findByPurchaseOrderIdOrderByCreatedAtDesc(poId)
                .stream()
                .map(this::mapMovementToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateGoodsReceiptPdf(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        GoodsReceipt grn = goodsReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Goods receipt not found with id: " + id));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(23, 23, 23));
            Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(115, 115, 115));
            Font sectionHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(70, 70, 70));
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(23, 23, 23));
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(50, 50, 50));
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(115, 115, 115));
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(23, 23, 23));

            // Header Table
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60f, 40f});
            headerTable.setSpacingAfter(12f);

            // Left
            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(Rectangle.NO_BORDER);
            leftHeader.addElement(new Paragraph(grn.getOrganization().getName(), titleFont));
            leftHeader.addElement(new Paragraph("Goods Receipt Note & Quality Inbound", subTitleFont));
            headerTable.addCell(leftHeader);

            // Right
            PdfPCell rightHeader = new PdfPCell();
            rightHeader.setBorder(Rectangle.NO_BORDER);
            rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph docTitle = new Paragraph("GOODS RECEIPT NOTE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, new Color(23, 23, 23)));
            docTitle.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(docTitle);

            Paragraph grnNum = new Paragraph(grn.getGrnNumber(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(4, 129, 64)));
            grnNum.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(grnNum);

            Paragraph meta = new Paragraph("Status: " + grn.getStatus().name() + "   Date: " + grn.getReceiptDate(), smallFont);
            meta.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(meta);

            headerTable.addCell(rightHeader);
            document.add(headerTable);

            // Divider line
            PdfPTable divider = new PdfPTable(1);
            divider.setWidthPercentage(100);
            PdfPCell divCell = new PdfPCell();
            divCell.setBorder(Rectangle.BOTTOM);
            divCell.setBorderColor(new Color(229, 231, 235));
            divCell.setBorderWidth(1f);
            divCell.setPadding(0);
            divCell.setFixedHeight(2f);
            divider.addCell(divCell);
            divider.setSpacingAfter(14f);
            document.add(divider);

            // Two-column Info Box: PO Reference & Supplier vs Receiving Warehouse
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{50f, 50f});
            infoTable.setSpacingAfter(16f);

            // Left Box: PO & Vendor
            PdfPCell vendorCell = new PdfPCell();
            vendorCell.setBorderColor(new Color(229, 231, 235));
            vendorCell.setBackgroundColor(new Color(250, 250, 250));
            vendorCell.setPadding(10f);

            vendorCell.addElement(new Paragraph("PURCHASE ORDER & VENDOR", sectionHeaderFont));
            vendorCell.addElement(new Paragraph("PO Number: " + grn.getPurchaseOrder().getPoNumber(), boldFont));
            vendorCell.addElement(new Paragraph("Supplier: " + grn.getPurchaseOrder().getSupplier().getName(), regularFont));
            if (grn.getDeliveryNoteNumber() != null) {
                vendorCell.addElement(new Paragraph("Delivery Note: " + grn.getDeliveryNoteNumber(), regularFont));
            }
            infoTable.addCell(vendorCell);

            // Right Box: Receiving Warehouse
            PdfPCell whCell = new PdfPCell();
            whCell.setBorderColor(new Color(229, 231, 235));
            whCell.setBackgroundColor(new Color(250, 250, 250));
            whCell.setPadding(10f);

            whCell.addElement(new Paragraph("RECEIVING WAREHOUSE", sectionHeaderFont));
            Warehouse w = grn.getPurchaseOrder().getReceivingWarehouse();
            whCell.addElement(new Paragraph(w.getName() + " (" + w.getWarehouseCode() + ")", boldFont));
            if (w.getAddress() != null) {
                whCell.addElement(new Paragraph("Location: " + w.getAddress(), regularFont));
            }
            infoTable.addCell(whCell);

            document.add(infoTable);

            // Received Items Table
            PdfPTable itemsTable = new PdfPTable(6);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{6f, 44f, 12f, 12f, 13f, 13f});
            itemsTable.setSpacingAfter(14f);

            String[] headers = {"#", "Item & Description", "UOM", "Ordered", "Received", "Remaining"};
            for (int i = 0; i < headers.length; i++) {
                PdfPCell th = new PdfPCell(new Phrase(headers[i], tableHeaderFont));
                th.setBackgroundColor(new Color(243, 244, 246));
                th.setBorderColor(new Color(229, 231, 235));
                th.setPaddingTop(7f);
                th.setPaddingBottom(7f);
                th.setPaddingLeft(5f);
                th.setPaddingRight(5f);
                if (i >= 3) {
                    th.setHorizontalAlignment(Element.ALIGN_RIGHT);
                } else if (i == 0 || i == 2) {
                    th.setHorizontalAlignment(Element.ALIGN_CENTER);
                }
                itemsTable.addCell(th);
            }

            int idx = 1;
            for (GoodsReceiptItem item : grn.getItems()) {
                Color rowBg = (idx % 2 == 0) ? new Color(250, 250, 250) : Color.WHITE;

                // 1. #
                PdfPCell cNum = new PdfPCell(new Phrase(String.valueOf(idx), regularFont));
                cNum.setHorizontalAlignment(Element.ALIGN_CENTER);
                styleCell(cNum, rowBg);
                itemsTable.addCell(cNum);

                // 2. Item
                PdfPCell cName = new PdfPCell(new Phrase(item.getItem().getName() + " (" + item.getItem().getItemCode() + ")", boldFont));
                styleCell(cName, rowBg);
                itemsTable.addCell(cName);

                // 3. UOM
                PdfPCell cUom = new PdfPCell(new Phrase(item.getUnitOfMeasure(), regularFont));
                cUom.setHorizontalAlignment(Element.ALIGN_CENTER);
                styleCell(cUom, rowBg);
                itemsTable.addCell(cUom);

                // 4. Ordered
                PdfPCell cOrd = new PdfPCell(new Phrase(item.getOrderedQuantity().stripTrailingZeros().toPlainString(), regularFont));
                cOrd.setHorizontalAlignment(Element.ALIGN_RIGHT);
                styleCell(cOrd, rowBg);
                itemsTable.addCell(cOrd);

                // 5. Received
                PdfPCell cRec = new PdfPCell(new Phrase(item.getReceivedQuantity().stripTrailingZeros().toPlainString(), boldFont));
                cRec.setHorizontalAlignment(Element.ALIGN_RIGHT);
                styleCell(cRec, rowBg);
                itemsTable.addCell(cRec);

                // 6. Remaining
                PdfPCell cRem = new PdfPCell(new Phrase(item.getRemainingQuantity().stripTrailingZeros().toPlainString(), regularFont));
                cRem.setHorizontalAlignment(Element.ALIGN_RIGHT);
                styleCell(cRem, rowBg);
                itemsTable.addCell(cRem);

                idx++;
            }

            document.add(itemsTable);

            // Notes
            if (grn.getNotes() != null && !grn.getNotes().isBlank()) {
                Paragraph notesP = new Paragraph("Notes & Instructions: " + grn.getNotes(), regularFont);
                notesP.setSpacingAfter(10f);
                document.add(notesP);
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF for goods receipt: {}", id, e);
            throw new RuntimeException("Failed to generate goods receipt PDF: " + e.getMessage(), e);
        }
    }

    private void styleCell(PdfPCell cell, Color bg) {
        cell.setBackgroundColor(bg);
        cell.setBorderColor(new Color(229, 231, 235));
        cell.setPaddingTop(6f);
        cell.setPaddingBottom(6f);
        cell.setPaddingLeft(5f);
        cell.setPaddingRight(5f);
    }

    private GoodsReceiptResponse mapToResponse(GoodsReceipt grn) {
        List<GoodsReceiptItemResponse> items = grn.getItems().stream()
                .map(i -> new GoodsReceiptItemResponse(
                        i.getId(),
                        i.getPurchaseOrderItem().getId(),
                        i.getItem().getId(),
                        i.getItem().getItemCode(),
                        i.getItem().getName(),
                        i.getUnitOfMeasure(),
                        i.getOrderedQuantity(),
                        i.getPreviouslyReceivedQuantity(),
                        i.getReceivedQuantity(),
                        i.getRemainingQuantity()
                ))
                .toList();

        PurchaseOrder po = grn.getPurchaseOrder();

        return new GoodsReceiptResponse(
                grn.getId(),
                grn.getGrnNumber(),
                po.getId(),
                po.getPoNumber(),
                po.getStatus(),
                po.getSupplier().getId(),
                po.getSupplier().getSupplierCode(),
                po.getSupplier().getName(),
                po.getReceivingWarehouse().getId(),
                po.getReceivingWarehouse().getWarehouseCode(),
                po.getReceivingWarehouse().getName(),
                grn.getReceiptDate(),
                grn.getDeliveryNoteNumber(),
                grn.getNotes(),
                grn.getStatus(),
                items.size(),
                items,
                grn.getCreatedAt(),
                grn.getUpdatedAt()
        );
    }

    private StockMovementResponse mapMovementToResponse(StockMovement sm) {
        return new StockMovementResponse(
                sm.getId(),
                sm.getReferenceNumber(),
                sm.getGoodsReceipt().getId(),
                sm.getGoodsReceipt().getGrnNumber(),
                sm.getPurchaseOrder().getId(),
                sm.getPurchaseOrder().getPoNumber(),
                sm.getItem().getId(),
                sm.getItem().getItemCode(),
                sm.getItem().getName(),
                sm.getWarehouse().getId(),
                sm.getWarehouse().getWarehouseCode(),
                sm.getWarehouse().getName(),
                sm.getMovementType(),
                sm.getQuantity(),
                sm.getUnitOfMeasure(),
                sm.getMovementDate(),
                sm.getCreatedAt()
        );
    }
}
