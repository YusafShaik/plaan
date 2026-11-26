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
import si.plaan.dto.request.CreateSalesInvoiceRequest;
import si.plaan.dto.request.UpdateSalesInvoiceRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.CustomerReceiptRepository;
import si.plaan.repository.DispatchOrderRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.SalesInvoiceRepository;
import si.plaan.service.SalesInvoiceService;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalesInvoiceServiceImpl implements SalesInvoiceService {

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final DispatchOrderRepository dispatchOrderRepository;
    private final OrganizationRepository organizationRepository;
    private final CustomerReceiptRepository customerReceiptRepository;

    private static final String SI_PREFIX = "SI-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SalesInvoiceResponse> getSalesInvoices(
            Long orgId,
            String search,
            SalesInvoiceStatus status,
            Pageable pageable) {
        requireOrg(orgId);

        Specification<SalesInvoice> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate invNumLike = cb.like(cb.lower(root.get("invoiceNumber")), pattern);
                Predicate customerLike = cb.like(cb.lower(root.get("customer").get("name")), pattern);
                Predicate dispatchLike = cb.like(cb.lower(root.get("dispatchOrder").get("dispatchNumber")), pattern);
                Predicate soLike = cb.like(cb.lower(root.get("salesOrder").get("orderNumber")), pattern);
                predicates.add(cb.or(invNumLike, customerLike, dispatchLike, soLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<SalesInvoice> page = salesInvoiceRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public SalesInvoiceResponse getSalesInvoiceById(Long orgId, Long id) {
        requireOrg(orgId);
        SalesInvoice invoice = salesInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found with id: " + id));
        return mapToResponse(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextInvoiceNumber(Long orgId) {
        requireOrg(orgId);
        int maxNum = salesInvoiceRepository.findMaxInvoiceNumberByOrganizationId(orgId);
        return String.format("%s%03d", SI_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EligibleDispatchResponse> getEligibleDispatches(Long orgId) {
        requireOrg(orgId);

        Specification<DispatchOrder> spec = (root, query, cb) -> cb.and(
                cb.equal(root.get("organization").get("id"), orgId),
                cb.equal(root.get("status"), DispatchOrderStatus.POSTED)
        );

        List<DispatchOrder> postedDispatches = dispatchOrderRepository.findAll(
                spec, Sort.by(Sort.Direction.DESC, "createdAt"));

        // Rule: Only 1 posted sales invoice per Dispatch in V1
        return postedDispatches.stream()
                .filter(dispatch -> !salesInvoiceRepository.existsByOrganizationIdAndDispatchOrderIdAndStatus(
                        orgId, dispatch.getId(), SalesInvoiceStatus.POSTED))
                .map(this::mapToEligibleDispatchResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EligibleDispatchResponse getDispatchDetailsForInvoice(Long orgId, Long dispatchId) {
        requireOrg(orgId);
        DispatchOrder dispatch = dispatchOrderRepository.findByIdAndOrganizationIdWithItems(dispatchId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispatch not found with id: " + dispatchId));

        if (dispatch.getStatus() != DispatchOrderStatus.POSTED) {
            throw new IllegalArgumentException(
                    "Only posted Dispatch documents can be selected for sales invoices. Dispatch status is "
                            + dispatch.getStatus());
        }

        if (salesInvoiceRepository.existsByOrganizationIdAndDispatchOrderIdAndStatus(
                orgId, dispatchId, SalesInvoiceStatus.POSTED)) {
            throw new IllegalStateException(
                    "A posted sales invoice already exists for dispatch " + dispatch.getDispatchNumber());
        }

        return mapToEligibleDispatchResponse(dispatch);
    }

    @Override
    @Transactional(readOnly = true)
    public SalesInvoiceSummaryResponse getSummary(Long orgId) {
        requireOrg(orgId);

        long total = salesInvoiceRepository.countByOrganizationId(orgId);
        long draft = salesInvoiceRepository.countByOrganizationIdAndStatus(orgId, SalesInvoiceStatus.DRAFT);
        long posted = salesInvoiceRepository.countByOrganizationIdAndStatus(orgId, SalesInvoiceStatus.POSTED);
        BigDecimal totalReceivable = salesInvoiceRepository.sumTotalReceivableByOrganizationId(orgId);
        BigDecimal outstandingReceivable = salesInvoiceRepository.sumOutstandingReceivableByOrganizationId(orgId);

        return new SalesInvoiceSummaryResponse(total, draft, posted, totalReceivable, outstandingReceivable);
    }

    @Override
    @Transactional
    public SalesInvoiceResponse createSalesInvoice(Long orgId, CreateSalesInvoiceRequest request) {
        requireOrg(orgId);

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        SalesInvoiceStatus targetStatusEarly = request.status() != null ? request.status() : SalesInvoiceStatus.DRAFT;
        DispatchOrder dispatch = (targetStatusEarly == SalesInvoiceStatus.POSTED
                ? dispatchOrderRepository.findByIdAndOrganizationIdWithItemsForUpdate(request.dispatchOrderId(), orgId)
                : dispatchOrderRepository.findByIdAndOrganizationIdWithItems(request.dispatchOrderId(), orgId))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Dispatch not found with id: " + request.dispatchOrderId()));

        if (dispatch.getStatus() != DispatchOrderStatus.POSTED) {
            throw new IllegalArgumentException(
                    "Only posted Dispatch documents can be selected for sales invoices. Dispatch "
                            + dispatch.getDispatchNumber() + " status is " + dispatch.getStatus());
        }

        if (salesInvoiceRepository.existsByOrganizationIdAndDispatchOrderIdAndStatus(
                orgId, dispatch.getId(), SalesInvoiceStatus.POSTED)) {
            throw new IllegalStateException(
                    "A posted sales invoice already exists for dispatch " + dispatch.getDispatchNumber());
        }

        SalesOrder salesOrder = dispatch.getSalesOrder();
        Customer customer = dispatch.getCustomer();

        String finalInvoiceNumber;
        if (request.invoiceNumber() != null && !request.invoiceNumber().trim().isBlank()) {
            finalInvoiceNumber = request.invoiceNumber().trim().toUpperCase();
        } else {
            finalInvoiceNumber = getNextInvoiceNumber(orgId);
        }

        if (salesInvoiceRepository.existsByOrganizationIdAndInvoiceNumberIgnoreCase(orgId, finalInvoiceNumber)) {
            throw new IllegalArgumentException(
                    "Sales invoice number '" + finalInvoiceNumber + "' already exists in this organization");
        }

        BigDecimal taxAmount = request.taxAmount() != null ? request.taxAmount() : BigDecimal.ZERO;
        if (taxAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Tax amount cannot be negative");
        }

        SalesInvoiceStatus targetStatus = targetStatusEarly;

        SalesInvoice invoice = SalesInvoice.builder()
                .organization(org)
                .invoiceNumber(finalInvoiceNumber)
                .invoiceDate(request.invoiceDate())
                .paymentDueDate(request.paymentDueDate())
                .dispatchOrder(dispatch)
                .salesOrder(salesOrder)
                .customer(customer)
                .billingAddress(salesOrder.getBillingAddress())
                .shippingAddress(
                        dispatch.getShippingAddress() != null && !dispatch.getShippingAddress().isBlank()
                                ? dispatch.getShippingAddress()
                                : salesOrder.getShippingAddress())
                .taxAmount(taxAmount)
                .notes(request.notes() != null ? request.notes().trim() : null)
                .status(targetStatus)
                .receivedAmount(BigDecimal.ZERO)
                .build();

        buildItemsFromDispatch(invoice, dispatch);

        if (targetStatus == SalesInvoiceStatus.POSTED) {
            invoice.setOutstandingAmount(invoice.getTotalAmount().subtract(invoice.getReceivedAmount()));
        }

        SalesInvoice saved = salesInvoiceRepository.save(invoice);
        log.info("Created sales invoice {} with status {} for org {}",
                saved.getInvoiceNumber(), saved.getStatus(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SalesInvoiceResponse updateSalesInvoice(Long orgId, Long id, UpdateSalesInvoiceRequest request) {
        requireOrg(orgId);

        SalesInvoice invoice = salesInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found with id: " + id));

        if (invoice.getStatus() == SalesInvoiceStatus.POSTED) {
            throw new IllegalStateException("Cannot edit a posted sales invoice");
        }

        BigDecimal taxAmount = request.taxAmount() != null ? request.taxAmount() : BigDecimal.ZERO;
        if (taxAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Tax amount cannot be negative");
        }

        SalesInvoiceStatus targetStatus = request.status() != null ? request.status() : invoice.getStatus();
        if (targetStatus == SalesInvoiceStatus.POSTED) {
            DispatchOrder lockedDispatch = dispatchOrderRepository.findByIdAndOrganizationIdForUpdate(
                            invoice.getDispatchOrder().getId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dispatch order not found"));
            if (salesInvoiceRepository.existsByOrganizationIdAndDispatchOrderIdAndStatusAndIdNot(
                    orgId, lockedDispatch.getId(), SalesInvoiceStatus.POSTED, id)) {
                throw new IllegalStateException(
                        "A posted sales invoice already exists for dispatch " + lockedDispatch.getDispatchNumber());
            }
        }

        invoice.setInvoiceDate(request.invoiceDate());
        invoice.setPaymentDueDate(request.paymentDueDate());
        invoice.setTaxAmount(taxAmount);
        invoice.setNotes(request.notes() != null ? request.notes().trim() : null);
        invoice.setStatus(targetStatus);

        // Rebuild line items from the linked dispatch (prices/qty remain source-of-truth)
        DispatchOrder dispatch = dispatchOrderRepository
                .findByIdAndOrganizationIdWithItems(invoice.getDispatchOrder().getId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Dispatch not found with id: " + invoice.getDispatchOrder().getId()));
        invoice.clearItems();
        buildItemsFromDispatch(invoice, dispatch);

        if (targetStatus == SalesInvoiceStatus.POSTED) {
            invoice.setOutstandingAmount(invoice.getTotalAmount().subtract(invoice.getReceivedAmount()));
        }

        SalesInvoice saved = salesInvoiceRepository.save(invoice);
        log.info("Updated sales invoice {} for org {}", saved.getInvoiceNumber(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SalesInvoiceResponse postSalesInvoice(Long orgId, Long id) {
        requireOrg(orgId);

        SalesInvoice invoice = salesInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found with id: " + id));

        if (invoice.getStatus() == SalesInvoiceStatus.POSTED) {
            throw new IllegalStateException(
                    "Sales invoice " + invoice.getInvoiceNumber() + " is already posted");
        }

        // Serialize posts against the same dispatch
        DispatchOrder dispatch = dispatchOrderRepository.findByIdAndOrganizationIdForUpdate(
                        invoice.getDispatchOrder().getId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispatch order not found"));

        if (salesInvoiceRepository.existsByOrganizationIdAndDispatchOrderIdAndStatusAndIdNot(
                orgId, dispatch.getId(), SalesInvoiceStatus.POSTED, id)) {
            throw new IllegalStateException(
                    "A posted sales invoice already exists for dispatch " + dispatch.getDispatchNumber());
        }

        invoice.setStatus(SalesInvoiceStatus.POSTED);
        invoice.setOutstandingAmount(invoice.getTotalAmount().subtract(invoice.getReceivedAmount()));

        SalesInvoice saved = salesInvoiceRepository.save(invoice);
        log.info("Posted sales invoice {} establishing receivable of {} for customer {}",
                saved.getInvoiceNumber(), saved.getOutstandingAmount(), saved.getCustomer().getName());

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteSalesInvoice(Long orgId, Long id) {
        requireOrg(orgId);

        SalesInvoice invoice = salesInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found with id: " + id));

        if (invoice.getStatus() == SalesInvoiceStatus.POSTED) {
            throw new IllegalStateException("Cannot delete a posted sales invoice");
        }

        salesInvoiceRepository.delete(invoice);
        log.info("Deleted draft sales invoice {} for org {}", invoice.getInvoiceNumber(), orgId);
    }

    private void buildItemsFromDispatch(SalesInvoice invoice, DispatchOrder dispatch) {
        BigDecimal subtotal = BigDecimal.ZERO;
        int lineCount = 0;

        for (DispatchOrderItem dispatchItem : dispatch.getItems()) {
            if (dispatchItem.getDispatchQuantity() == null
                    || dispatchItem.getDispatchQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal unitPrice = dispatchItem.getSalesOrderItem() != null
                    ? dispatchItem.getSalesOrderItem().getUnitPrice()
                    : BigDecimal.ZERO;
            if (unitPrice == null) {
                unitPrice = BigDecimal.ZERO;
            }
            unitPrice = unitPrice.setScale(2, RoundingMode.HALF_UP);

            BigDecimal quantity = dispatchItem.getDispatchQuantity();
            BigDecimal lineAmount = quantity.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);

            SalesInvoiceItem invItem = SalesInvoiceItem.builder()
                    .dispatchOrderItem(dispatchItem)
                    .item(dispatchItem.getItem())
                    .unitOfMeasure(dispatchItem.getUnitOfMeasure())
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .lineAmount(lineAmount)
                    .build();

            invoice.addItem(invItem);
            subtotal = subtotal.add(lineAmount);
            lineCount++;
        }

        if (lineCount == 0) {
            throw new IllegalArgumentException(
                    "Dispatch " + dispatch.getDispatchNumber()
                            + " has no dispatched quantities to invoice");
        }

        invoice.setSubtotal(subtotal);
        BigDecimal totalAmount = subtotal.add(invoice.getTaxAmount()).setScale(2, RoundingMode.HALF_UP);
        invoice.setTotalAmount(totalAmount);
        invoice.setOutstandingAmount(totalAmount.subtract(invoice.getReceivedAmount()));
    }

    private EligibleDispatchResponse mapToEligibleDispatchResponse(DispatchOrder dispatch) {
        SalesOrder salesOrder = dispatch.getSalesOrder();

        List<EligibleDispatchItemResponse> items = dispatch.getItems().stream()
                .filter(item -> item.getDispatchQuantity() != null
                        && item.getDispatchQuantity().compareTo(BigDecimal.ZERO) > 0)
                .map(item -> {
                    BigDecimal unitPrice = item.getSalesOrderItem() != null
                            ? item.getSalesOrderItem().getUnitPrice()
                            : BigDecimal.ZERO;
                    if (unitPrice == null) {
                        unitPrice = BigDecimal.ZERO;
                    }
                    BigDecimal lineAmount = item.getDispatchQuantity()
                            .multiply(unitPrice)
                            .setScale(2, RoundingMode.HALF_UP);

                    return new EligibleDispatchItemResponse(
                            item.getId(),
                            item.getSalesOrderItem() != null ? item.getSalesOrderItem().getId() : null,
                            item.getItem().getId(),
                            item.getItem().getItemCode(),
                            item.getItem().getName(),
                            item.getUnitOfMeasure(),
                            item.getDispatchQuantity(),
                            unitPrice.setScale(2, RoundingMode.HALF_UP),
                            lineAmount
                    );
                })
                .toList();

        return new EligibleDispatchResponse(
                dispatch.getId(),
                dispatch.getDispatchNumber(),
                salesOrder.getId(),
                salesOrder.getOrderNumber(),
                dispatch.getCustomer().getId(),
                dispatch.getCustomer().getCustomerCode(),
                dispatch.getCustomer().getName(),
                salesOrder.getBillingAddress(),
                dispatch.getShippingAddress() != null && !dispatch.getShippingAddress().isBlank()
                        ? dispatch.getShippingAddress()
                        : salesOrder.getShippingAddress(),
                dispatch.getDispatchWarehouse().getId(),
                dispatch.getDispatchWarehouse().getWarehouseCode(),
                dispatch.getDispatchWarehouse().getName(),
                dispatch.getDispatchDate(),
                items
        );
    }

    private SalesInvoiceResponse mapToResponse(SalesInvoice invoice) {
        List<SalesInvoiceItemResponse> items = invoice.getItems().stream()
                .map(item -> new SalesInvoiceItemResponse(
                        item.getId(),
                        item.getDispatchOrderItem().getId(),
                        item.getItem().getId(),
                        item.getItem().getItemCode(),
                        item.getItem().getName(),
                        item.getUnitOfMeasure(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getLineAmount()
                ))
                .toList();

        List<CustomerReceiptHistoryItemResponse> receiptHistory = customerReceiptRepository
                .findByOrganizationIdAndSalesInvoiceIdAndStatusOrderByReceiptDateAscIdAsc(
                        invoice.getOrganization().getId(),
                        invoice.getId(),
                        CustomerReceiptStatus.POSTED)
                .stream()
                .map(r -> new CustomerReceiptHistoryItemResponse(
                        r.getId(),
                        r.getReceiptNumber(),
                        r.getReceiptDate(),
                        r.getPaymentMethod(),
                        r.getPaymentReference(),
                        r.getAmount()))
                .toList();

        return new SalesInvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getPaymentDueDate(),
                invoice.getDispatchOrder().getId(),
                invoice.getDispatchOrder().getDispatchNumber(),
                invoice.getSalesOrder().getId(),
                invoice.getSalesOrder().getOrderNumber(),
                invoice.getCustomer().getId(),
                invoice.getCustomer().getCustomerCode(),
                invoice.getCustomer().getName(),
                invoice.getBillingAddress(),
                invoice.getShippingAddress(),
                invoice.getSubtotal(),
                invoice.getTaxAmount(),
                invoice.getTotalAmount(),
                invoice.getReceivedAmount(),
                invoice.getOutstandingAmount(),
                derivePaymentStatus(invoice),
                receiptHistory,
                invoice.getNotes(),
                invoice.getStatus(),
                items.size(),
                items,
                invoice.getCreatedAt(),
                invoice.getUpdatedAt()
        );
    }

    private InvoicePaymentStatus derivePaymentStatus(SalesInvoice invoice) {
        BigDecimal received = invoice.getReceivedAmount() != null ? invoice.getReceivedAmount() : BigDecimal.ZERO;
        BigDecimal outstanding = invoice.getOutstandingAmount() != null
                ? invoice.getOutstandingAmount()
                : invoice.getTotalAmount();
        if (received.compareTo(BigDecimal.ZERO) <= 0) {
            return InvoicePaymentStatus.UNPAID;
        }
        if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
            return InvoicePaymentStatus.PAID;
        }
        return InvoicePaymentStatus.PARTIALLY_PAID;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long orgId, Long id) {
        requireOrg(orgId);
        SalesInvoice invoice = salesInvoiceRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found with id: " + id));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(document, out);
            document.open();

            Font headerTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(17, 24, 39));
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(55, 65, 81));
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(17, 24, 39));
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(31, 41, 55));
            Font metaLabelFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(107, 114, 128));

            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60f, 40f});
            headerTable.setSpacingAfter(16f);

            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(Rectangle.NO_BORDER);
            leftHeader.addElement(new Paragraph("SALES INVOICE", headerTitleFont));
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

            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{50f, 50f});
            infoTable.setSpacingAfter(18f);

            PdfPCell customerCell = new PdfPCell();
            customerCell.setBorder(Rectangle.BOX);
            customerCell.setBorderColor(new Color(229, 231, 235));
            customerCell.setPadding(8f);
            customerCell.addElement(new Paragraph("Bill To:", metaLabelFont));
            customerCell.addElement(new Paragraph(
                    invoice.getCustomer().getName() + " (" + invoice.getCustomer().getCustomerCode() + ")",
                    boldFont));
            if (invoice.getBillingAddress() != null && !invoice.getBillingAddress().isBlank()) {
                customerCell.addElement(new Paragraph(invoice.getBillingAddress(), regularFont));
            }
            if (invoice.getShippingAddress() != null && !invoice.getShippingAddress().isBlank()) {
                customerCell.addElement(new Paragraph("Ship To: " + invoice.getShippingAddress(), regularFont));
            }
            infoTable.addCell(customerCell);

            PdfPCell metaCell = new PdfPCell();
            metaCell.setBorder(Rectangle.BOX);
            metaCell.setBorderColor(new Color(229, 231, 235));
            metaCell.setPadding(8f);
            metaCell.addElement(new Paragraph("Invoice Date: " + invoice.getInvoiceDate(), regularFont));
            metaCell.addElement(new Paragraph(
                    "Payment Due: " + (invoice.getPaymentDueDate() != null
                            ? invoice.getPaymentDueDate().toString()
                            : "Not Specified"),
                    regularFont));
            metaCell.addElement(new Paragraph(
                    "Dispatch: " + invoice.getDispatchOrder().getDispatchNumber(), regularFont));
            metaCell.addElement(new Paragraph(
                    "Sales Order: " + invoice.getSalesOrder().getOrderNumber(), regularFont));
            infoTable.addCell(metaCell);

            document.add(infoTable);

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

            for (SalesInvoiceItem item : invoice.getItems()) {
                PdfPCell cName = new PdfPCell(new Phrase(
                        item.getItem().getName() + " (" + item.getItem().getItemCode() + ")", regularFont));
                cName.setPadding(6f);
                itemsTable.addCell(cName);

                PdfPCell cQty = new PdfPCell(new Phrase(
                        item.getQuantity().stripTrailingZeros().toPlainString(), regularFont));
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

            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setWidthPercentage(40);
            totalsTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalsTable.setWidths(new float[]{50f, 50f});
            totalsTable.setSpacingAfter(14f);

            addTotalRow(totalsTable, "Subtotal:", "₹" + invoice.getSubtotal().toPlainString(), regularFont);
            addTotalRow(totalsTable, "Tax Amount:", "₹" + invoice.getTaxAmount().toPlainString(), regularFont);
            addTotalRow(totalsTable, "Invoice Total:", "₹" + invoice.getTotalAmount().toPlainString(), boldFont);
            addTotalRow(totalsTable, "Amount Received:", "₹" + invoice.getReceivedAmount().toPlainString(), regularFont);
            addTotalRow(totalsTable, "Outstanding Receivable:",
                    "₹" + invoice.getOutstandingAmount().toPlainString(), boldFont);

            document.add(totalsTable);

            if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
                document.add(new Paragraph("Notes:", boldFont));
                document.add(new Paragraph(invoice.getNotes(), regularFont));
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF for sales invoice {}", id, e);
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

    private void requireOrg(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
    }
}
