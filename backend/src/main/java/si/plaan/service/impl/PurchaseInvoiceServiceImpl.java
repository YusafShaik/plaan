package si.plaan.service.impl;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreatePurchaseInvoiceRequest;
import si.plaan.dto.request.PurchaseInvoiceItemRequest;
import si.plaan.dto.request.UpdatePurchaseInvoiceRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.*;
import si.plaan.service.PurchaseInvoiceService;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PurchaseInvoiceServiceImpl implements PurchaseInvoiceService {

    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final OrganizationRepository organizationRepository;
    private final SupplierPaymentRepository supplierPaymentRepository;

    private static final String PI_PREFIX = "PI-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PurchaseInvoiceResponse> getPurchaseInvoices(
            Long orgId,
            String search,
            PurchaseInvoiceStatus status,
            Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<PurchaseInvoice> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate invNumLike = cb.like(cb.lower(root.get("invoiceNumber")), pattern);
                Predicate suppInvLike = cb.like(cb.lower(root.get("supplierInvoiceNumber")), pattern);
                Predicate supplierLike = cb.like(cb.lower(root.get("supplier").get("name")), pattern);
                Predicate grnLike = cb.like(cb.lower(root.get("goodsReceipt").get("grnNumber")), pattern);
                Predicate poLike = cb.like(cb.lower(root.get("purchaseOrder").get("poNumber")), pattern);
                predicates.add(cb.or(invNumLike, suppInvLike, supplierLike, grnLike, poLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<PurchaseInvoice> page = purchaseInvoiceRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseInvoiceResponse getPurchaseInvoiceById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        PurchaseInvoice invoice = purchaseInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase invoice not found with id: " + id));
        return mapToResponse(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextInvoiceNumber(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = purchaseInvoiceRepository.findMaxInvoiceNumberByOrganizationId(orgId);
        return String.format("%s%03d", PI_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EligibleGrnResponse> getEligibleGoodsReceipts(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<GoodsReceipt> spec = (root, query, cb) -> cb.and(
                cb.equal(root.get("organization").get("id"), orgId),
                cb.equal(root.get("status"), GoodsReceiptStatus.POSTED)
        );

        List<GoodsReceipt> postedGrns = goodsReceiptRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));

        // Rule: Only 1 posted purchase invoice per GRN in V1
        return postedGrns.stream()
                .filter(grn -> !purchaseInvoiceRepository.existsByOrganizationIdAndGoodsReceiptIdAndStatus(
                        orgId, grn.getId(), PurchaseInvoiceStatus.POSTED))
                .map(this::mapToEligibleGrnResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EligibleGrnResponse getGoodsReceiptDetailsForInvoice(Long orgId, Long grnId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        GoodsReceipt grn = goodsReceiptRepository.findByIdAndOrganizationId(grnId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Goods receipt not found with id: " + grnId));

        if (grn.getStatus() != GoodsReceiptStatus.POSTED) {
            throw new IllegalArgumentException("Only posted Goods Receipts can be selected for purchase invoices. GRN status is " + grn.getStatus());
        }

        if (purchaseInvoiceRepository.existsByOrganizationIdAndGoodsReceiptIdAndStatus(orgId, grnId, PurchaseInvoiceStatus.POSTED)) {
            throw new IllegalStateException("A posted purchase invoice already exists for goods receipt " + grn.getGrnNumber());
        }

        return mapToEligibleGrnResponse(grn);
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseInvoiceSummaryResponse getSummary(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        long total = purchaseInvoiceRepository.countByOrganizationId(orgId);
        long draft = purchaseInvoiceRepository.countByOrganizationIdAndStatus(orgId, PurchaseInvoiceStatus.DRAFT);
        long posted = purchaseInvoiceRepository.countByOrganizationIdAndStatus(orgId, PurchaseInvoiceStatus.POSTED);
        BigDecimal totalPayable = purchaseInvoiceRepository.sumTotalPayableByOrganizationId(orgId);
        BigDecimal outstandingPayable = purchaseInvoiceRepository.sumOutstandingPayableByOrganizationId(orgId);

        return new PurchaseInvoiceSummaryResponse(total, draft, posted, totalPayable, outstandingPayable);
    }

    @Override
    @Transactional
    public PurchaseInvoiceResponse createPurchaseInvoice(Long orgId, CreatePurchaseInvoiceRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        PurchaseInvoiceStatus targetStatusEarly = request.status() != null ? request.status() : PurchaseInvoiceStatus.DRAFT;
        GoodsReceipt grn = (targetStatusEarly == PurchaseInvoiceStatus.POSTED
                ? goodsReceiptRepository.findByIdAndOrganizationIdForUpdate(request.goodsReceiptId(), orgId)
                : goodsReceiptRepository.findByIdAndOrganizationId(request.goodsReceiptId(), orgId))
                .orElseThrow(() -> new ResourceNotFoundException("Goods receipt not found with id: " + request.goodsReceiptId()));

        if (grn.getStatus() != GoodsReceiptStatus.POSTED) {
            throw new IllegalArgumentException("Only posted Goods Receipts can be selected for purchase invoices. GRN " + grn.getGrnNumber() + " status is " + grn.getStatus());
        }

        // Rule: For V1, allow one posted Purchase Invoice per GRN
        if (purchaseInvoiceRepository.existsByOrganizationIdAndGoodsReceiptIdAndStatus(orgId, grn.getId(), PurchaseInvoiceStatus.POSTED)) {
            throw new IllegalStateException("A posted purchase invoice already exists for goods receipt " + grn.getGrnNumber());
        }

        si.plaan.util.AttachmentLimits.validate(
                request.attachmentFileName(), request.attachmentContentType(), request.attachmentData());

        PurchaseOrder po = grn.getPurchaseOrder();
        Supplier supplier = po.getSupplier();

        // 2. Validate supplier invoice number uniqueness for the same supplier
        String cleanSuppInvNum = request.supplierInvoiceNumber().trim();
        if (purchaseInvoiceRepository.existsByOrganizationIdAndSupplierIdAndSupplierInvoiceNumberIgnoreCase(
                orgId, supplier.getId(), cleanSuppInvNum)) {
            throw new IllegalArgumentException("Supplier invoice number '" + cleanSuppInvNum + "' already exists for supplier '" + supplier.getName() + "' in this organization");
        }

        // 3. Invoice Number
        String finalInvoiceNumber;
        if (request.invoiceNumber() != null && !request.invoiceNumber().trim().isBlank()) {
            finalInvoiceNumber = request.invoiceNumber().trim().toUpperCase();
        } else {
            finalInvoiceNumber = getNextInvoiceNumber(orgId);
        }

        if (purchaseInvoiceRepository.existsByOrganizationIdAndInvoiceNumberIgnoreCase(orgId, finalInvoiceNumber)) {
            throw new IllegalArgumentException("Purchase invoice number '" + finalInvoiceNumber + "' already exists in this organization");
        }

        // 4. Validate Tax Amount
        BigDecimal taxAmount = request.taxAmount() != null ? request.taxAmount() : BigDecimal.ZERO;
        if (taxAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Tax amount cannot be negative");
        }

        PurchaseInvoiceStatus targetStatus = targetStatusEarly;

        PurchaseInvoice invoice = PurchaseInvoice.builder()
                .organization(org)
                .invoiceNumber(finalInvoiceNumber)
                .supplierInvoiceNumber(cleanSuppInvNum)
                .invoiceDate(request.invoiceDate())
                .paymentDueDate(request.paymentDueDate())
                .goodsReceipt(grn)
                .purchaseOrder(po)
                .supplier(supplier)
                .taxAmount(taxAmount)
                .notes(request.notes() != null ? request.notes().trim() : null)
                .attachmentFileName(request.attachmentFileName())
                .attachmentContentType(request.attachmentContentType())
                .attachmentData(request.attachmentData())
                .status(targetStatus)
                .paidAmount(BigDecimal.ZERO)
                .build();

        // 5. Build and validate invoice items from GRN items
        buildAndValidateItems(invoice, grn, request.items());

        PurchaseInvoice saved = purchaseInvoiceRepository.save(invoice);
        log.info("Created purchase invoice {} with status {} for org {}", saved.getInvoiceNumber(), saved.getStatus(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public PurchaseInvoiceResponse updatePurchaseInvoice(Long orgId, Long id, UpdatePurchaseInvoiceRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        PurchaseInvoice invoice = purchaseInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase invoice not found with id: " + id));

        // Rule: Posted invoices cannot be edited
        if (invoice.getStatus() == PurchaseInvoiceStatus.POSTED) {
            throw new IllegalStateException("Cannot edit a posted purchase invoice");
        }

        // Validate supplier invoice number uniqueness
        String cleanSuppInvNum = request.supplierInvoiceNumber().trim();
        if (purchaseInvoiceRepository.existsByOrganizationIdAndSupplierIdAndSupplierInvoiceNumberIgnoreCaseAndIdNot(
                orgId, invoice.getSupplier().getId(), cleanSuppInvNum, id)) {
            throw new IllegalArgumentException("Supplier invoice number '" + cleanSuppInvNum + "' already exists for supplier '" + invoice.getSupplier().getName() + "' in this organization");
        }

        // Validate Tax Amount
        BigDecimal taxAmount = request.taxAmount() != null ? request.taxAmount() : BigDecimal.ZERO;
        if (taxAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Tax amount cannot be negative");
        }

        PurchaseInvoiceStatus targetStatus = request.status() != null ? request.status() : invoice.getStatus();
        if (targetStatus == PurchaseInvoiceStatus.POSTED) {
            GoodsReceipt grn = goodsReceiptRepository.findByIdAndOrganizationIdForUpdate(
                            invoice.getGoodsReceipt().getId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Goods receipt not found"));
            if (purchaseInvoiceRepository.existsByOrganizationIdAndGoodsReceiptIdAndStatusAndIdNot(
                    orgId, grn.getId(), PurchaseInvoiceStatus.POSTED, id)) {
                throw new IllegalStateException("A posted purchase invoice already exists for goods receipt " + grn.getGrnNumber());
            }
        }

        invoice.setSupplierInvoiceNumber(cleanSuppInvNum);
        invoice.setInvoiceDate(request.invoiceDate());
        invoice.setPaymentDueDate(request.paymentDueDate());
        invoice.setTaxAmount(taxAmount);
        invoice.setNotes(request.notes() != null ? request.notes().trim() : null);
        if (request.attachmentFileName() != null) {
            si.plaan.util.AttachmentLimits.validate(
                    request.attachmentFileName(), request.attachmentContentType(), request.attachmentData());
            invoice.setAttachmentFileName(request.attachmentFileName());
            invoice.setAttachmentContentType(request.attachmentContentType());
            invoice.setAttachmentData(request.attachmentData());
        }
        invoice.setStatus(targetStatus);

        // Clear and rebuild items
        invoice.clearItems();
        buildAndValidateItems(invoice, invoice.getGoodsReceipt(), request.items());

        PurchaseInvoice saved = purchaseInvoiceRepository.save(invoice);
        log.info("Updated purchase invoice {} for org {}", saved.getInvoiceNumber(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public PurchaseInvoiceResponse postPurchaseInvoice(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        PurchaseInvoice invoice = purchaseInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase invoice not found with id: " + id));

        // Rule: Prevent duplicate posting
        if (invoice.getStatus() == PurchaseInvoiceStatus.POSTED) {
            throw new IllegalStateException("Purchase invoice " + invoice.getInvoiceNumber() + " is already posted");
        }

        // Serialize posts against the same GRN (check-then-write under row lock)
        GoodsReceipt grn = goodsReceiptRepository.findByIdAndOrganizationIdForUpdate(
                        invoice.getGoodsReceipt().getId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Goods receipt not found"));

        if (purchaseInvoiceRepository.existsByOrganizationIdAndGoodsReceiptIdAndStatusAndIdNot(
                orgId, grn.getId(), PurchaseInvoiceStatus.POSTED, id)) {
            throw new IllegalStateException("A posted purchase invoice already exists for goods receipt " + grn.getGrnNumber());
        }

        invoice.setStatus(PurchaseInvoiceStatus.POSTED);
        // Establish outstanding payable
        invoice.setOutstandingAmount(invoice.getTotalAmount().subtract(invoice.getPaidAmount()));

        PurchaseInvoice saved = purchaseInvoiceRepository.save(invoice);
        log.info("Posted purchase invoice {} establishing payable of {} for supplier {}",
                saved.getInvoiceNumber(), saved.getOutstandingAmount(), saved.getSupplier().getName());

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deletePurchaseInvoice(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        PurchaseInvoice invoice = purchaseInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase invoice not found with id: " + id));

        // Rule: Posted invoices cannot be deleted
        if (invoice.getStatus() == PurchaseInvoiceStatus.POSTED) {
            throw new IllegalStateException("Cannot delete a posted purchase invoice");
        }

        purchaseInvoiceRepository.delete(invoice);
        log.info("Deleted draft purchase invoice {} for org {}", invoice.getInvoiceNumber(), orgId);
    }

    private void buildAndValidateItems(PurchaseInvoice invoice, GoodsReceipt grn, List<PurchaseInvoiceItemRequest> itemRequests) {
        if (itemRequests == null || itemRequests.isEmpty()) {
            throw new IllegalArgumentException("At least one invoice line item is required");
        }

        Map<Long, GoodsReceiptItem> grnItemMap = grn.getItems().stream()
                .collect(Collectors.toMap(GoodsReceiptItem::getId, item -> item));

        BigDecimal subtotal = BigDecimal.ZERO;

        for (PurchaseInvoiceItemRequest itemReq : itemRequests) {
            GoodsReceiptItem grnItem = grnItemMap.get(itemReq.goodsReceiptItemId());
            if (grnItem == null) {
                throw new IllegalArgumentException("Goods receipt item id " + itemReq.goodsReceiptItemId() + " does not belong to GRN " + grn.getGrnNumber());
            }

            if (itemReq.unitPrice() == null || itemReq.unitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Unit price cannot be negative for item: " + grnItem.getItem().getName());
            }

            // Quantities cannot be changed; must equal actual received quantity
            BigDecimal receivedQty = grnItem.getReceivedQuantity();
            BigDecimal unitPrice = itemReq.unitPrice().setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineAmount = receivedQty.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);

            PurchaseInvoiceItem invItem = PurchaseInvoiceItem.builder()
                    .goodsReceiptItem(grnItem)
                    .item(grnItem.getItem())
                    .unitOfMeasure(grnItem.getUnitOfMeasure())
                    .quantity(receivedQty)
                    .unitPrice(unitPrice)
                    .lineAmount(lineAmount)
                    .build();

            invoice.addItem(invItem);
            subtotal = subtotal.add(lineAmount);
        }

        invoice.setSubtotal(subtotal);
        BigDecimal totalAmount = subtotal.add(invoice.getTaxAmount()).setScale(2, RoundingMode.HALF_UP);
        invoice.setTotalAmount(totalAmount);
        invoice.setOutstandingAmount(totalAmount.subtract(invoice.getPaidAmount()));
    }

    private EligibleGrnResponse mapToEligibleGrnResponse(GoodsReceipt grn) {
        List<EligibleGrnItemResponse> items = grn.getItems().stream().map(item -> {
            BigDecimal defaultPrice = item.getPurchaseOrderItem() != null
                    ? item.getPurchaseOrderItem().getUnitPrice()
                    : BigDecimal.ZERO;
            BigDecimal lineAmount = item.getReceivedQuantity().multiply(defaultPrice).setScale(2, RoundingMode.HALF_UP);

            return new EligibleGrnItemResponse(
                    item.getId(),
                    item.getPurchaseOrderItem() != null ? item.getPurchaseOrderItem().getId() : null,
                    item.getItem().getId(),
                    item.getItem().getItemCode(),
                    item.getItem().getName(),
                    item.getUnitOfMeasure(),
                    item.getReceivedQuantity(),
                    defaultPrice,
                    lineAmount
            );
        }).toList();

        PurchaseOrder po = grn.getPurchaseOrder();

        return new EligibleGrnResponse(
                grn.getId(),
                grn.getGrnNumber(),
                po.getId(),
                po.getPoNumber(),
                po.getSupplier().getId(),
                po.getSupplier().getSupplierCode(),
                po.getSupplier().getName(),
                po.getReceivingWarehouse().getId(),
                po.getReceivingWarehouse().getWarehouseCode(),
                po.getReceivingWarehouse().getName(),
                grn.getReceiptDate(),
                items
        );
    }

    private PurchaseInvoiceResponse mapToResponse(PurchaseInvoice invoice) {
        List<PurchaseInvoiceItemResponse> items = invoice.getItems().stream()
                .map(item -> new PurchaseInvoiceItemResponse(
                        item.getId(),
                        item.getGoodsReceiptItem().getId(),
                        item.getItem().getId(),
                        item.getItem().getItemCode(),
                        item.getItem().getName(),
                        item.getUnitOfMeasure(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getLineAmount()
                ))
                .toList();

        List<SupplierPaymentHistoryItemResponse> paymentHistory = supplierPaymentRepository
                .findByOrganizationIdAndPurchaseInvoiceIdAndStatusOrderByPaymentDateAscIdAsc(
                        invoice.getOrganization().getId(),
                        invoice.getId(),
                        SupplierPaymentStatus.POSTED)
                .stream()
                .map(p -> new SupplierPaymentHistoryItemResponse(
                        p.getId(),
                        p.getPaymentNumber(),
                        p.getPaymentDate(),
                        p.getPaymentMethod(),
                        p.getPaymentReference(),
                        p.getAmount()))
                .toList();

        return new PurchaseInvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getSupplierInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getPaymentDueDate(),
                invoice.getGoodsReceipt().getId(),
                invoice.getGoodsReceipt().getGrnNumber(),
                invoice.getPurchaseOrder().getId(),
                invoice.getPurchaseOrder().getPoNumber(),
                invoice.getSupplier().getId(),
                invoice.getSupplier().getSupplierCode(),
                invoice.getSupplier().getName(),
                invoice.getSubtotal(),
                invoice.getTaxAmount(),
                invoice.getTotalAmount(),
                invoice.getPaidAmount(),
                invoice.getOutstandingAmount(),
                derivePaymentStatus(invoice),
                paymentHistory,
                invoice.getAttachmentFileName(),
                invoice.getAttachmentContentType(),
                invoice.getAttachmentData() != null && !invoice.getAttachmentData().isBlank(),
                invoice.getNotes(),
                invoice.getStatus(),
                items.size(),
                items,
                invoice.getCreatedAt(),
                invoice.getUpdatedAt()
        );
    }

    private InvoicePaymentStatus derivePaymentStatus(PurchaseInvoice invoice) {
        BigDecimal paid = invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal outstanding = invoice.getOutstandingAmount() != null
                ? invoice.getOutstandingAmount()
                : invoice.getTotalAmount();
        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            return InvoicePaymentStatus.UNPAID;
        }
        if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
            return InvoicePaymentStatus.PAID;
        }
        return InvoicePaymentStatus.PARTIALLY_PAID;
    }

    @Override
    @Transactional(readOnly = true)
    public AttachmentData getAttachment(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        PurchaseInvoice invoice = purchaseInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase invoice not found with id: " + id));

        if (invoice.getAttachmentData() == null || invoice.getAttachmentData().isBlank()) {
            throw new ResourceNotFoundException("No attachment found for invoice " + invoice.getInvoiceNumber());
        }

        byte[] bytes;
        try {
            String data = invoice.getAttachmentData();
            if (data.contains(",")) {
                data = data.substring(data.indexOf(",") + 1);
            }
            bytes = Base64.getDecoder().decode(data);
        } catch (Exception e) {
            bytes = invoice.getAttachmentData().getBytes();
        }

        String fileName = invoice.getAttachmentFileName() != null ? invoice.getAttachmentFileName() : "invoice-attachment";
        String contentType = invoice.getAttachmentContentType() != null ? invoice.getAttachmentContentType() : "application/octet-stream";

        return new AttachmentData(fileName, contentType, bytes);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        PurchaseInvoice invoice = purchaseInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase invoice not found with id: " + id));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(document, out);
            document.open();

            Font headerTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(17, 24, 39));
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(55, 65, 81));
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(17, 24, 39));
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(31, 41, 55));
            Font metaLabelFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(107, 114, 128));

            // Header Section
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60f, 40f});
            headerTable.setSpacingAfter(16f);

            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(Rectangle.NO_BORDER);
            leftHeader.addElement(new Paragraph("PURCHASE INVOICE", headerTitleFont));
            leftHeader.addElement(new Paragraph("Invoice #: " + invoice.getInvoiceNumber(), boldFont));
            leftHeader.addElement(new Paragraph("Status: " + invoice.getStatus().name(), regularFont));
            headerTable.addCell(leftHeader);

            PdfPCell rightHeader = new PdfPCell();
            rightHeader.setBorder(Rectangle.NO_BORDER);
            rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph orgP = new Paragraph(invoice.getOrganization().getName(), boldFont);
            orgP.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(orgP);
            headerTable.addCell(rightHeader);

            document.add(headerTable);

            // Details info table
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{50f, 50f});
            infoTable.setSpacingAfter(18f);

            PdfPCell supplierCell = new PdfPCell();
            supplierCell.setBorder(Rectangle.BOX);
            supplierCell.setBorderColor(new Color(229, 231, 235));
            supplierCell.setPadding(8f);
            supplierCell.addElement(new Paragraph("Supplier Details:", metaLabelFont));
            supplierCell.addElement(new Paragraph(invoice.getSupplier().getName() + " (" + invoice.getSupplier().getSupplierCode() + ")", boldFont));
            supplierCell.addElement(new Paragraph("Supplier Bill #: " + invoice.getSupplierInvoiceNumber(), regularFont));
            infoTable.addCell(supplierCell);

            PdfPCell metaCell = new PdfPCell();
            metaCell.setBorder(Rectangle.BOX);
            metaCell.setBorderColor(new Color(229, 231, 235));
            metaCell.setPadding(8f);
            metaCell.addElement(new Paragraph("Invoice Date: " + invoice.getInvoiceDate(), regularFont));
            metaCell.addElement(new Paragraph("Payment Due: " + (invoice.getPaymentDueDate() != null ? invoice.getPaymentDueDate().toString() : "Not Specified"), regularFont));
            metaCell.addElement(new Paragraph("Goods Receipt: " + invoice.getGoodsReceipt().getGrnNumber(), regularFont));
            metaCell.addElement(new Paragraph("Purchase Order: " + invoice.getPurchaseOrder().getPoNumber(), regularFont));
            infoTable.addCell(metaCell);

            document.add(infoTable);

            // Items table
            PdfPTable itemsTable = new PdfPTable(5);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{40f, 15f, 15f, 15f, 15f});
            itemsTable.setSpacingAfter(14f);

            String[] headers = {"Item", "Qty", "UOM", "Unit Price", "Amount"};
            for (String header : headers) {
                PdfPCell th = new PdfPCell(new Phrase(header, tableHeaderFont));
                th.setBackgroundColor(new Color(243, 244, 246));
                th.setBorderColor(new Color(229, 231, 235));
                th.setPadding(6f);
                itemsTable.addCell(th);
            }

            NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));

            for (PurchaseInvoiceItem item : invoice.getItems()) {
                PdfPCell cName = new PdfPCell(new Phrase(item.getItem().getName() + " (" + item.getItem().getItemCode() + ")", regularFont));
                cName.setPadding(6f);
                itemsTable.addCell(cName);

                PdfPCell cQty = new PdfPCell(new Phrase(item.getQuantity().stripTrailingZeros().toPlainString(), regularFont));
                cQty.setPadding(6f);
                itemsTable.addCell(cQty);

                PdfPCell cUom = new PdfPCell(new Phrase(item.getUnitOfMeasure(), regularFont));
                cUom.setPadding(6f);
                itemsTable.addCell(cUom);

                PdfPCell cPrice = new PdfPCell(new Phrase("₹" + item.getUnitPrice().toPlainString(), regularFont));
                cPrice.setPadding(6f);
                itemsTable.addCell(cPrice);

                PdfPCell cAmt = new PdfPCell(new Phrase("₹" + item.getLineAmount().toPlainString(), regularFont));
                cAmt.setPadding(6f);
                itemsTable.addCell(cAmt);
            }

            document.add(itemsTable);

            // Totals table
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setWidthPercentage(40);
            totalsTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalsTable.setWidths(new float[]{50f, 50f});
            totalsTable.setSpacingAfter(14f);

            addTotalRow(totalsTable, "Subtotal:", "₹" + invoice.getSubtotal().toPlainString(), regularFont);
            addTotalRow(totalsTable, "Tax Amount:", "₹" + invoice.getTaxAmount().toPlainString(), regularFont);
            addTotalRow(totalsTable, "Invoice Total:", "₹" + invoice.getTotalAmount().toPlainString(), boldFont);
            addTotalRow(totalsTable, "Outstanding:", "₹" + invoice.getOutstandingAmount().toPlainString(), boldFont);

            document.add(totalsTable);

            if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
                Paragraph notesTitle = new Paragraph("Notes:", boldFont);
                document.add(notesTitle);
                Paragraph notesP = new Paragraph(invoice.getNotes(), regularFont);
                document.add(notesP);
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF for purchase invoice {}", id, e);
            throw new RuntimeException("Error generating invoice PDF", e);
        }
    }

    private void addTotalRow(PdfPTable table, String label, String value, Font font) {
        PdfPCell lCell = new PdfPCell(new Phrase(label, font));
        lCell.setBorder(Rectangle.NO_BORDER);
        lCell.setPadding(4f);
        table.addCell(lCell);

        PdfPCell vCell = new PdfPCell(new Phrase(value, font));
        vCell.setBorder(Rectangle.NO_BORDER);
        vCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        vCell.setPadding(4f);
        table.addCell(vCell);
    }
}
