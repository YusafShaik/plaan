package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.*;
import si.plaan.dto.response.*;
import si.plaan.entity.*;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

@SpringBootTest
@Transactional
public class SupplierOutstandingReportTests {

    @Autowired private SupplierOutstandingReportService reportService;
    @Autowired private PurchaseInvoiceService purchaseInvoiceService;
    @Autowired private SupplierPaymentService supplierPaymentService;
    @Autowired private PurchaseOrderService purchaseOrderService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private ItemService itemService;
    @Autowired private SupplierService supplierService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private SupplierResponse timber;
    private SupplierResponse hardware;
    private SupplierResponse packaging;
    private WarehouseResponse warehouse;
    private ItemResponse item;
    private LocalDate today;
    private final AtomicInteger billSeq = new AtomicInteger(1);

    @BeforeEach
    void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("SO Org " + uid).slug("so-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("SO Other " + uid).slug("so-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));

        timber = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-T", "ABC Timber", null, null, null, null, null, true));
        hardware = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-H", "XYZ Hardware", null, null, null, null, null, true));
        packaging = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-P", "Royal Packaging", null, null, null, null, null, false));
        warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-SO", "Main Store", "Bangalore", null, true));
        item = itemService.createItem(org1.getId(), new CreateItemRequest(
                "RM-SO", "Raw Board", null, "Raw Materials", null, null, "Nos", null, true));
    }

    private PurchaseInvoiceResponse createPostedInvoice(
            SupplierResponse supplier,
            BigDecimal qty,
            BigDecimal unitPrice,
            BigDecimal tax,
            LocalDate dueDate) {
        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(org1.getId(),
                new CreatePurchaseOrderRequest(
                        null, supplier.id(), warehouse.id(), today.minusDays(10), null, null,
                        PurchaseOrderStatus.ISSUED,
                        List.of(new PurchaseOrderItemRequest(item.id(), qty, unitPrice))));
        GoodsReceiptResponse grn = goodsReceiptService.createGoodsReceipt(org1.getId(),
                new CreateGoodsReceiptRequest(
                        null, po.id(), today.minusDays(8), null, null, GoodsReceiptStatus.DRAFT,
                        List.of(new GoodsReceiptItemRequest(
                                po.items().get(0).id(), item.id(), qty))));
        grn = goodsReceiptService.postGoodsReceipt(org1.getId(), grn.id());

        EligibleGrnResponse details =
                purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), grn.id());
        return purchaseInvoiceService.createPurchaseInvoice(org1.getId(),
                new CreatePurchaseInvoiceRequest(
                        null,
                        "BILL-" + billSeq.getAndIncrement(),
                        today.minusDays(5),
                        dueDate,
                        grn.id(),
                        tax,
                        null, null, null, null,
                        PurchaseInvoiceStatus.POSTED,
                        List.of(new PurchaseInvoiceItemRequest(
                                details.items().get(0).goodsReceiptItemId(),
                                item.id(),
                                unitPrice))));
    }

    @Test
    public void testOutstandingSummaryBreakdownFiltersPartialFullAndIsolation() {
        // PI-1 timber: 50*1000 + 0 tax = 50000, pay 20000 → outstanding 30000, overdue
        PurchaseInvoiceResponse overdue = createPostedInvoice(
                timber, new BigDecimal("50"), new BigDecimal("1000"), BigDecimal.ZERO,
                today.minusDays(3));
        supplierPaymentService.createPayment(org1.getId(), new CreateSupplierPaymentRequest(
                null, today, overdue.id(), new BigDecimal("20000.00"),
                PaymentMethod.BANK_TRANSFER, "TXN-1", null, SupplierPaymentStatus.POSTED));

        // PI-2 hardware: 25*1000 = 25000 unpaid, due today
        PurchaseInvoiceResponse dueToday = createPostedInvoice(
                hardware, new BigDecimal("25"), new BigDecimal("1000"), BigDecimal.ZERO, today);

        // PI-3 timber: 40*1000 = 40000, pay 15000 → outstanding 25000, upcoming
        PurchaseInvoiceResponse upcomingTimber = createPostedInvoice(
                timber, new BigDecimal("40"), new BigDecimal("1000"), BigDecimal.ZERO,
                today.plusDays(7));
        supplierPaymentService.createPayment(org1.getId(), new CreateSupplierPaymentRequest(
                null, today, upcomingTimber.id(), new BigDecimal("15000.00"),
                PaymentMethod.UPI, null, null, SupplierPaymentStatus.POSTED));

        // PI-4 packaging (inactive supplier): 15*1000 = 15000 unpaid, upcoming
        PurchaseInvoiceResponse upcomingPack = createPostedInvoice(
                packaging, new BigDecimal("15"), new BigDecimal("1000"), BigDecimal.ZERO,
                today.plusDays(10));

        // Draft payment must not affect outstanding
        supplierPaymentService.createPayment(org1.getId(), new CreateSupplierPaymentRequest(
                null, today, dueToday.id(), new BigDecimal("5000.00"),
                PaymentMethod.CASH, null, null, SupplierPaymentStatus.DRAFT));

        // Draft invoice excluded
        PurchaseOrderResponse draftPo = purchaseOrderService.createPurchaseOrder(org1.getId(),
                new CreatePurchaseOrderRequest(
                        null, timber.id(), warehouse.id(), today, null, null,
                        PurchaseOrderStatus.ISSUED,
                        List.of(new PurchaseOrderItemRequest(
                                item.id(), BigDecimal.TEN, new BigDecimal("100")))));
        GoodsReceiptResponse draftGrn = goodsReceiptService.createGoodsReceipt(org1.getId(),
                new CreateGoodsReceiptRequest(
                        null, draftPo.id(), today, null, null, GoodsReceiptStatus.DRAFT,
                        List.of(new GoodsReceiptItemRequest(
                                draftPo.items().get(0).id(), item.id(), BigDecimal.TEN))));
        draftGrn = goodsReceiptService.postGoodsReceipt(org1.getId(), draftGrn.id());
        EligibleGrnResponse draftDetails =
                purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), draftGrn.id());
        purchaseInvoiceService.createPurchaseInvoice(org1.getId(), new CreatePurchaseInvoiceRequest(
                null, "BILL-DRAFT", today, today.plusDays(1), draftGrn.id(), BigDecimal.ZERO,
                null, null, null, null, PurchaseInvoiceStatus.DRAFT,
                List.of(new PurchaseInvoiceItemRequest(
                        draftDetails.items().get(0).goodsReceiptItemId(),
                        item.id(), new BigDecimal("100")))));

        SupplierOutstandingReportResponse report = reportService.getReport(
                org1.getId(), null, null, null, null, null, null, null, PageRequest.of(0, 50));

        Assertions.assertEquals("INR", report.currency());
        Assertions.assertEquals(4, report.summary().outstandingInvoices());
        Assertions.assertEquals(3, report.summary().suppliersToPay());
        // 30000 + 25000 + 25000 + 15000 = 95000
        Assertions.assertEquals(0, new BigDecimal("95000.00").compareTo(report.summary().totalOutstanding()));
        Assertions.assertEquals(0, new BigDecimal("30000.00").compareTo(report.summary().overdueAmount()));
        Assertions.assertEquals(3, report.bySupplier().size());
        Assertions.assertEquals("ABC Timber", report.bySupplier().get(0).supplierName());
        Assertions.assertEquals(0, new BigDecimal("55000.00").compareTo(
                report.bySupplier().get(0).outstandingAmount()));
        Assertions.assertEquals(DeliveryScheduleStatus.OVERDUE, report.invoices().content().get(0).dueStatus());

        SupplierOutstandingRowResponse overdueRow = report.invoices().content().stream()
                .filter(r -> r.purchaseInvoiceId().equals(overdue.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(InvoicePaymentStatus.PARTIALLY_PAID, overdueRow.paymentStatus());
        Assertions.assertEquals(0, new BigDecimal("50000.00").compareTo(overdueRow.invoiceAmount()));
        Assertions.assertEquals(0, new BigDecimal("20000.00").compareTo(overdueRow.paidAmount()));
        Assertions.assertEquals(0, new BigDecimal("30000.00").compareTo(overdueRow.outstandingAmount()));
        Assertions.assertEquals(3, overdueRow.daysOverdue());

        SupplierOutstandingRowResponse dueTodayRow = report.invoices().content().stream()
                .filter(r -> r.purchaseInvoiceId().equals(dueToday.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(InvoicePaymentStatus.UNPAID, dueTodayRow.paymentStatus());
        Assertions.assertEquals(DeliveryScheduleStatus.DUE_TODAY, dueTodayRow.dueStatus());
        Assertions.assertEquals(0, new BigDecimal("25000.00").compareTo(dueTodayRow.outstandingAmount()));

        // Inactive supplier still included
        Assertions.assertTrue(report.invoices().content().stream()
                .anyMatch(r -> r.purchaseInvoiceId().equals(upcomingPack.id())));

        SupplierOutstandingReportResponse overdueOnly = reportService.getReport(
                org1.getId(), null, null, null, null, null, null,
                DeliveryScheduleStatus.OVERDUE, PageRequest.of(0, 20));
        Assertions.assertEquals(1, overdueOnly.summary().outstandingInvoices());
        Assertions.assertEquals(0, new BigDecimal("30000.00").compareTo(
                overdueOnly.summary().totalOutstanding()));

        SupplierOutstandingReportResponse partialOnly = reportService.getReport(
                org1.getId(), null, null, null, null, null,
                InvoicePaymentStatus.PARTIALLY_PAID, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, partialOnly.summary().outstandingInvoices());

        SupplierOutstandingReportResponse timberOnly = reportService.getReport(
                org1.getId(), timber.id(), null, null, null, null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, timberOnly.summary().outstandingInvoices());
        Assertions.assertEquals(1, timberOnly.summary().suppliersToPay());
        Assertions.assertEquals(0, new BigDecimal("55000.00").compareTo(
                timberOnly.summary().totalOutstanding()));

        byte[] csv = reportService.exportCsv(org1.getId(), null, null, null, null, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains(overdue.invoiceNumber()));
        Assertions.assertTrue(text.contains("ABC Timber"));
        Assertions.assertTrue(text.contains("OVERDUE"));
        Assertions.assertTrue(text.contains("PARTIALLY_PAID"));

        // Full payment removes invoice from report
        supplierPaymentService.createPayment(org1.getId(), new CreateSupplierPaymentRequest(
                null, today, upcomingPack.id(), new BigDecimal("15000.00"),
                PaymentMethod.CASH, null, null, SupplierPaymentStatus.POSTED));
        SupplierOutstandingReportResponse afterFull = reportService.getReport(
                org1.getId(), null, null, null, null, null, null, null, PageRequest.of(0, 50));
        Assertions.assertEquals(3, afterFull.summary().outstandingInvoices());
        Assertions.assertFalse(afterFull.invoices().content().stream()
                .anyMatch(r -> r.purchaseInvoiceId().equals(upcomingPack.id())));
        Assertions.assertEquals(2, afterFull.summary().suppliersToPay());

        SupplierOutstandingReportResponse other = reportService.getReport(
                org2.getId(), null, null, null, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().outstandingInvoices());
        Assertions.assertEquals(0, other.summary().suppliersToPay());
        Assertions.assertTrue(other.bySupplier().isEmpty());
    }
}
