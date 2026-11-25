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
import si.plaan.dto.request.CreatePurchaseOrderRequest;
import si.plaan.dto.request.PurchaseOrderItemRequest;
import si.plaan.dto.request.UpdatePurchaseOrderRequest;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.PurchaseOrderItemResponse;
import si.plaan.dto.response.PurchaseOrderResponse;
import si.plaan.dto.response.PurchaseOrderSummaryResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.*;
import si.plaan.service.PurchaseOrderService;

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

@Slf4j
@Service
@RequiredArgsConstructor
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final OrganizationRepository organizationRepository;
    private final SupplierRepository supplierRepository;
    private final WarehouseRepository warehouseRepository;
    private final ItemRepository itemRepository;

    private static final String PO_PREFIX = "PO-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PurchaseOrderResponse> getPurchaseOrders(
            Long orgId,
            String search,
            PurchaseOrderStatus status,
            Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<PurchaseOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate poLike = cb.like(cb.lower(root.get("poNumber")), pattern);
                Predicate supplierLike = cb.like(cb.lower(root.get("supplier").get("name")), pattern);
                Predicate warehouseLike = cb.like(cb.lower(root.get("receivingWarehouse").get("name")), pattern);
                predicates.add(cb.or(poLike, supplierLike, warehouseLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<PurchaseOrder> page = purchaseOrderRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseOrderResponse getPurchaseOrderById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        PurchaseOrder po = purchaseOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with id: " + id));
        return mapToResponse(po);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextPoNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = purchaseOrderRepository.findMaxPoNumberByOrganizationId(orgId);
        return String.format("%s%03d", PO_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseOrderSummaryResponse getSummary(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        long total = purchaseOrderRepository.countByOrganizationId(orgId);
        long draft = purchaseOrderRepository.countByOrganizationIdAndStatus(orgId, PurchaseOrderStatus.DRAFT);
        long issued = purchaseOrderRepository.countByOrganizationIdAndStatus(orgId, PurchaseOrderStatus.ISSUED);
        long partiallyReceived = purchaseOrderRepository.countByOrganizationIdAndStatus(orgId, PurchaseOrderStatus.PARTIALLY_RECEIVED);
        long completed = purchaseOrderRepository.countByOrganizationIdAndStatus(orgId, PurchaseOrderStatus.COMPLETED);
        long cancelled = purchaseOrderRepository.countByOrganizationIdAndStatus(orgId, PurchaseOrderStatus.CANCELLED);
        BigDecimal totalVal = purchaseOrderRepository.sumTotalValueByOrganizationId(orgId);

        return new PurchaseOrderSummaryResponse(total, draft, issued, partiallyReceived, completed, cancelled, totalVal != null ? totalVal : BigDecimal.ZERO);
    }

    @Override
    @Transactional
    public PurchaseOrderResponse createPurchaseOrder(Long orgId, CreatePurchaseOrderRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        Supplier supplier = supplierRepository.findByIdAndOrganizationId(request.supplierId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + request.supplierId()));

        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(request.receivingWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + request.receivingWarehouseId()));

        String finalPoNumber;
        if (request.poNumber() != null && !request.poNumber().trim().isBlank()) {
            finalPoNumber = request.poNumber().trim().toUpperCase();
        } else {
            finalPoNumber = getNextPoNumber(orgId);
        }

        if (purchaseOrderRepository.existsByOrganizationIdAndPoNumberIgnoreCase(orgId, finalPoNumber)) {
            throw new IllegalArgumentException("Purchase order number '" + finalPoNumber + "' already exists in this organization");
        }

        PurchaseOrderStatus initialStatus = request.status() != null ? request.status() : PurchaseOrderStatus.DRAFT;
        String currency = org.getBaseCurrency() != null && !org.getBaseCurrency().isBlank() ? org.getBaseCurrency() : "INR";

        PurchaseOrder po = PurchaseOrder.builder()
                .organization(org)
                .poNumber(finalPoNumber)
                .supplier(supplier)
                .receivingWarehouse(warehouse)
                .orderDate(request.orderDate())
                .expectedDeliveryDate(request.expectedDeliveryDate())
                .notes(request.notes() != null && !request.notes().isBlank() ? request.notes().trim() : null)
                .status(initialStatus)
                .currency(currency)
                .build();

        java.util.Set<Long> seenItemIds = new java.util.HashSet<>();
        BigDecimal total = BigDecimal.ZERO;
        for (PurchaseOrderItemRequest itemReq : request.items()) {
            if (!seenItemIds.add(itemReq.itemId())) {
                Item dup = itemRepository.findByIdAndOrganizationId(itemReq.itemId(), orgId).orElse(null);
                String dupName = dup != null ? dup.getName() : "ID " + itemReq.itemId();
                throw new IllegalArgumentException("Item '" + dupName + "' is added more than once. Please adjust the quantity instead of adding the same item repeatedly.");
            }

            Item item = itemRepository.findByIdAndOrganizationId(itemReq.itemId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemReq.itemId()));

            BigDecimal lineAmount = itemReq.quantity()
                    .multiply(itemReq.unitPrice())
                    .setScale(2, RoundingMode.HALF_UP);

            PurchaseOrderItem orderItem = PurchaseOrderItem.builder()
                    .purchaseOrder(po)
                    .item(item)
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .quantity(itemReq.quantity())
                    .unitPrice(itemReq.unitPrice().setScale(2, RoundingMode.HALF_UP))
                    .lineAmount(lineAmount)
                    .build();

            po.addItem(orderItem);
            total = total.add(lineAmount);
        }

        po.setTotalAmount(total);
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        log.info("Created purchase order {} (id: {}) for org {}", saved.getPoNumber(), saved.getId(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public PurchaseOrderResponse updatePurchaseOrder(Long orgId, Long id, UpdatePurchaseOrderRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        PurchaseOrder po = purchaseOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with id: " + id));

        if (po.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT purchase orders can be modified. Current status: " + po.getStatus());
        }

        Supplier supplier = supplierRepository.findByIdAndOrganizationId(request.supplierId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + request.supplierId()));

        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(request.receivingWarehouseId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + request.receivingWarehouseId()));

        po.setSupplier(supplier);
        po.setReceivingWarehouse(warehouse);
        po.setOrderDate(request.orderDate());
        po.setExpectedDeliveryDate(request.expectedDeliveryDate());
        po.setNotes(request.notes() != null && !request.notes().isBlank() ? request.notes().trim() : null);

        if (request.status() != null) {
            po.setStatus(request.status());
        }

        // Update items
        po.clearItems();
        java.util.Set<Long> seenItemIds = new java.util.HashSet<>();
        BigDecimal total = BigDecimal.ZERO;

        for (PurchaseOrderItemRequest itemReq : request.items()) {
            if (!seenItemIds.add(itemReq.itemId())) {
                Item dup = itemRepository.findByIdAndOrganizationId(itemReq.itemId(), orgId).orElse(null);
                String dupName = dup != null ? dup.getName() : "ID " + itemReq.itemId();
                throw new IllegalArgumentException("Item '" + dupName + "' is added more than once. Please adjust the quantity instead of adding the same item repeatedly.");
            }

            Item item = itemRepository.findByIdAndOrganizationId(itemReq.itemId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemReq.itemId()));

            BigDecimal lineAmount = itemReq.quantity()
                    .multiply(itemReq.unitPrice())
                    .setScale(2, RoundingMode.HALF_UP);

            PurchaseOrderItem orderItem = PurchaseOrderItem.builder()
                    .purchaseOrder(po)
                    .item(item)
                    .unitOfMeasure(item.getUnitOfMeasure())
                    .quantity(itemReq.quantity())
                    .unitPrice(itemReq.unitPrice().setScale(2, RoundingMode.HALF_UP))
                    .lineAmount(lineAmount)
                    .build();

            po.addItem(orderItem);
            total = total.add(lineAmount);
        }

        po.setTotalAmount(total);
        PurchaseOrder updated = purchaseOrderRepository.save(po);
        log.info("Updated purchase order {} (id: {}) for org {}", updated.getPoNumber(), updated.getId(), orgId);

        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public PurchaseOrderResponse updateStatus(Long orgId, Long id, PurchaseOrderStatus newStatus) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        PurchaseOrder po = purchaseOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with id: " + id));

        PurchaseOrderStatus currentStatus = po.getStatus();

        if (currentStatus == PurchaseOrderStatus.CANCELLED) {
            throw new IllegalStateException("Cannot change status of an already CANCELLED purchase order");
        }

        if (currentStatus == PurchaseOrderStatus.ISSUED && newStatus == PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Cannot revert an ISSUED purchase order back to DRAFT");
        }

        po.setStatus(newStatus);
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        log.info("Updated purchase order {} status from {} to {}", saved.getPoNumber(), currentStatus, newStatus);

        return mapToResponse(saved);
    }

    private PurchaseOrderResponse mapToResponse(PurchaseOrder po) {
        List<PurchaseOrderItemResponse> itemResponses = po.getItems().stream()
                .map(item -> new PurchaseOrderItemResponse(
                        item.getId(),
                        item.getItem().getId(),
                        item.getItem().getItemCode(),
                        item.getItem().getName(),
                        item.getUnitOfMeasure(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getLineAmount()
                ))
                .toList();

        return new PurchaseOrderResponse(
                po.getId(),
                po.getPoNumber(),
                po.getSupplier().getId(),
                po.getSupplier().getSupplierCode(),
                po.getSupplier().getName(),
                po.getReceivingWarehouse().getId(),
                po.getReceivingWarehouse().getWarehouseCode(),
                po.getReceivingWarehouse().getName(),
                po.getOrderDate(),
                po.getExpectedDeliveryDate(),
                po.getNotes(),
                po.getStatus(),
                po.getTotalAmount(),
                po.getCurrency(),
                po.getItems().size(),
                itemResponses,
                po.getCreatedAt(),
                po.getUpdatedAt()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generatePurchaseOrderPdf(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        PurchaseOrder po = purchaseOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with id: " + id));

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
            Font totalFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(23, 23, 23));

            // Top Header: Organization Name on Left, PURCHASE ORDER on Right
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60f, 40f});
            headerTable.setSpacingAfter(12f);

            // Left: Company
            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(Rectangle.NO_BORDER);
            leftHeader.addElement(new Paragraph(po.getOrganization().getName(), titleFont));
            leftHeader.addElement(new Paragraph("Procurement & Supply Chain Management", subTitleFont));
            headerTable.addCell(leftHeader);

            // Right: PO title & meta
            PdfPCell rightHeader = new PdfPCell();
            rightHeader.setBorder(Rectangle.NO_BORDER);
            rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph poTitle = new Paragraph("PURCHASE ORDER", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(23, 23, 23)));
            poTitle.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(poTitle);

            Paragraph poNum = new Paragraph(po.getPoNumber(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(4, 129, 64)));
            poNum.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(poNum);

            Paragraph poStatus = new Paragraph("Status: " + po.getStatus().name() + "   Date: " + po.getOrderDate(), smallFont);
            poStatus.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(poStatus);

            headerTable.addCell(rightHeader);
            document.add(headerTable);

            // Subtle divider line
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

            // Two-column Info Box: Supplier / Vendor vs Warehouse / Deliver To
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{50f, 50f});
            infoTable.setSpacingAfter(16f);

            // Supplier Box
            PdfPCell vendorCell = new PdfPCell();
            vendorCell.setBorderColor(new Color(229, 231, 235));
            vendorCell.setBackgroundColor(new Color(250, 250, 250));
            vendorCell.setPadding(10f);

            Paragraph vTitle = new Paragraph("VENDOR / SUPPLIER", sectionHeaderFont);
            vTitle.setSpacingAfter(3f);
            vendorCell.addElement(vTitle);

            Supplier s = po.getSupplier();
            vendorCell.addElement(new Paragraph(s.getName() + " (" + s.getSupplierCode() + ")", boldFont));
            if (s.getContactPerson() != null && !s.getContactPerson().isBlank()) {
                vendorCell.addElement(new Paragraph("Attn: " + s.getContactPerson(), regularFont));
            }
            if (s.getEmail() != null && !s.getEmail().isBlank()) {
                vendorCell.addElement(new Paragraph("Email: " + s.getEmail(), regularFont));
            }
            if (s.getPhone() != null && !s.getPhone().isBlank()) {
                vendorCell.addElement(new Paragraph("Phone: " + s.getPhone(), regularFont));
            }
            if (s.getAddress() != null && !s.getAddress().isBlank()) {
                vendorCell.addElement(new Paragraph("Address: " + s.getAddress(), regularFont));
            }
            infoTable.addCell(vendorCell);

            // Warehouse Box
            PdfPCell whCell = new PdfPCell();
            whCell.setBorderColor(new Color(229, 231, 235));
            whCell.setBackgroundColor(new Color(250, 250, 250));
            whCell.setPadding(10f);

            Paragraph whTitle = new Paragraph("DELIVER TO / WAREHOUSE", sectionHeaderFont);
            whTitle.setSpacingAfter(3f);
            whCell.addElement(whTitle);

            Warehouse w = po.getReceivingWarehouse();
            whCell.addElement(new Paragraph(w.getName() + " (" + w.getWarehouseCode() + ")", boldFont));
            if (w.getAddress() != null && !w.getAddress().isBlank()) {
                whCell.addElement(new Paragraph("Location: " + w.getAddress(), regularFont));
            }
            if (po.getExpectedDeliveryDate() != null) {
                whCell.addElement(new Paragraph("Expected Delivery: " + po.getExpectedDeliveryDate(), boldFont));
            }
            infoTable.addCell(whCell);

            document.add(infoTable);

            // Line Items Table
            PdfPTable itemsTable = new PdfPTable(6);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{6f, 42f, 12f, 12f, 14f, 14f});
            itemsTable.setSpacingAfter(14f);

            // Headers
            String currencyStr = po.getCurrency() != null ? po.getCurrency() : "INR";
            String[] headers = {"#", "Item & Description", "UOM", "Qty", "Rate (" + currencyStr + ")", "Amount (" + currencyStr + ")"};
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

            // Rows
            int index = 1;
            for (PurchaseOrderItem item : po.getItems()) {
                Color rowBg = (index % 2 == 0) ? new Color(250, 250, 250) : Color.WHITE;

                // 1. #
                PdfPCell cNum = new PdfPCell(new Phrase(String.valueOf(index), regularFont));
                cNum.setHorizontalAlignment(Element.ALIGN_CENTER);
                stylePdfCell(cNum, rowBg);
                itemsTable.addCell(cNum);

                // 2. Item name & code
                String itemText = item.getItem().getName() + " (" + item.getItem().getItemCode() + ")";
                PdfPCell cName = new PdfPCell(new Phrase(itemText, boldFont));
                stylePdfCell(cName, rowBg);
                itemsTable.addCell(cName);

                // 3. UOM
                PdfPCell cUom = new PdfPCell(new Phrase(item.getUnitOfMeasure(), regularFont));
                cUom.setHorizontalAlignment(Element.ALIGN_CENTER);
                stylePdfCell(cUom, rowBg);
                itemsTable.addCell(cUom);

                // 4. Qty
                PdfPCell cQty = new PdfPCell(new Phrase(item.getQuantity().stripTrailingZeros().toPlainString(), regularFont));
                cQty.setHorizontalAlignment(Element.ALIGN_RIGHT);
                stylePdfCell(cQty, rowBg);
                itemsTable.addCell(cQty);

                // 5. Rate
                PdfPCell cRate = new PdfPCell(new Phrase(String.format("%.2f", item.getUnitPrice()), regularFont));
                cRate.setHorizontalAlignment(Element.ALIGN_RIGHT);
                stylePdfCell(cRate, rowBg);
                itemsTable.addCell(cRate);

                // 6. Amount
                PdfPCell cAmount = new PdfPCell(new Phrase(String.format("%.2f", item.getLineAmount()), boldFont));
                cAmount.setHorizontalAlignment(Element.ALIGN_RIGHT);
                stylePdfCell(cAmount, rowBg);
                itemsTable.addCell(cAmount);

                index++;
            }

            document.add(itemsTable);

            // Summary Table: Notes on Left, Totals on Right
            PdfPTable footerTable = new PdfPTable(2);
            footerTable.setWidthPercentage(100);
            footerTable.setWidths(new float[]{60f, 40f});

            // Notes
            PdfPCell notesCell = new PdfPCell();
            notesCell.setBorder(Rectangle.NO_BORDER);
            if (po.getNotes() != null && !po.getNotes().isBlank()) {
                notesCell.addElement(new Paragraph("Notes & Instructions:", boldFont));
                notesCell.addElement(new Paragraph(po.getNotes(), regularFont));
            }
            footerTable.addCell(notesCell);

            // Totals Box
            PdfPCell totalsCell = new PdfPCell();
            totalsCell.setBorderColor(new Color(229, 231, 235));
            totalsCell.setBackgroundColor(new Color(248, 250, 252));
            totalsCell.setPadding(10f);

            Paragraph totalLabel = new Paragraph("TOTAL AMOUNT (" + currencyStr + ")", sectionHeaderFont);
            totalLabel.setAlignment(Element.ALIGN_RIGHT);
            totalsCell.addElement(totalLabel);

            Paragraph totalVal = new Paragraph(String.format("%.2f", po.getTotalAmount()), totalFont);
            totalVal.setAlignment(Element.ALIGN_RIGHT);
            totalsCell.addElement(totalVal);

            footerTable.addCell(totalsCell);
            document.add(footerTable);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF for purchase order: {}", id, e);
            throw new RuntimeException("Failed to generate purchase order PDF: " + e.getMessage(), e);
        }
    }

    private void stylePdfCell(PdfPCell cell, Color bg) {
        cell.setBackgroundColor(bg);
        cell.setBorderColor(new Color(229, 231, 235));
        cell.setPaddingTop(6f);
        cell.setPaddingBottom(6f);
        cell.setPaddingLeft(5f);
        cell.setPaddingRight(5f);
    }
}
