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

@SpringBootTest
@Transactional
public class CustomerOutstandingReportTests {

    @Autowired private CustomerOutstandingReportService reportService;
    @Autowired private SalesInvoiceService salesInvoiceService;
    @Autowired private CustomerReceiptService customerReceiptService;
    @Autowired private DispatchOrderService dispatchOrderService;
    @Autowired private SalesOrderService salesOrderService;
    @Autowired private CustomerService customerService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private ItemService itemService;
    @Autowired private SupplierService supplierService;
    @Autowired private PurchaseOrderService purchaseOrderService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private CustomerResponse furniture;
    private CustomerResponse interiors;
    private CustomerResponse homes;
    private WarehouseResponse warehouse;
    private ItemResponse table;
    private LocalDate today;

    @BeforeEach
    void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("CO Org " + uid).slug("co-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("CO Other " + uid).slug("co-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));

        furniture = customerService.createCustomer(org1.getId(), new CreateCustomerRequest(
                "CUS-F", "ABC Furniture", null, null, null, "Bill", "Ship", null, true));
        interiors = customerService.createCustomer(org1.getId(), new CreateCustomerRequest(
                "CUS-I", "Royal Interiors", null, null, null, "Bill", "Ship", null, true));
        homes = customerService.createCustomer(org1.getId(), new CreateCustomerRequest(
                "CUS-H", "Modern Homes", null, null, null, "Bill", "Ship", null, true));
        warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-CO", "FG Store", "Bangalore", null, true));
        table = itemService.createItem(org1.getId(), new CreateItemRequest(
                "FG-CO", "Wooden Table", null, "Finished Goods", null, null, "Nos", null, true));

        addStock(new BigDecimal("200"));
    }

    private void addStock(BigDecimal qty) {
        SupplierResponse supplier = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                null, "Supplier " + UUID.randomUUID(), null, null, null, null, null, true));
        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(org1.getId(),
                new CreatePurchaseOrderRequest(
                        null, supplier.id(), warehouse.id(), today.minusDays(10), null, null,
                        PurchaseOrderStatus.ISSUED,
                        List.of(new PurchaseOrderItemRequest(table.id(), qty, BigDecimal.TEN))));
        GoodsReceiptResponse gr = goodsReceiptService.createGoodsReceipt(org1.getId(),
                new CreateGoodsReceiptRequest(
                        null, po.id(), today.minusDays(8), null, null, GoodsReceiptStatus.DRAFT,
                        List.of(new GoodsReceiptItemRequest(
                                po.items().get(0).id(), table.id(), qty))));
        goodsReceiptService.postGoodsReceipt(org1.getId(), gr.id());
    }

    private SalesInvoiceResponse createPostedInvoice(
            CustomerResponse customer, BigDecimal qty, BigDecimal unitPrice, LocalDate dueDate) {
        SalesOrderResponse so = salesOrderService.createSalesOrder(org1.getId(),
                new CreateSalesOrderRequest(
                        null, customer.id(), warehouse.id(), today.minusDays(5), null, null,
                        "Bill", "Ship", null, SalesOrderStatus.DRAFT,
                        List.of(new SalesOrderItemRequest(null, table.id(), qty, unitPrice))));
        so = salesOrderService.confirmSalesOrder(org1.getId(), so.id());

        DispatchOrderResponse dispatch = dispatchOrderService.createDispatchOrder(org1.getId(),
                new CreateDispatchOrderRequest(
                        null, so.id(), today.minusDays(3), "Ship", null, null, null, null,
                        DispatchOrderStatus.POSTED,
                        List.of(new DispatchOrderItemRequest(
                                so.items().get(0).id(), table.id(), qty))));

        return salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                null, today.minusDays(2), dueDate, dispatch.id(), BigDecimal.ZERO, null,
                SalesInvoiceStatus.POSTED));
    }

    @Test
    public void testReceivableSummaryBreakdownFiltersPartialFullAndIsolation() {
        // SI-1 furniture: 30*2500=75000, receive 25000 → 50000 overdue
        SalesInvoiceResponse overdue = createPostedInvoice(
                furniture, new BigDecimal("30"), new BigDecimal("2500"), today.minusDays(4));
        customerReceiptService.createReceipt(org1.getId(), new CreateCustomerReceiptRequest(
                null, today, overdue.id(), new BigDecimal("25000.00"),
                PaymentMethod.BANK_TRANSFER, "TXN-1", null, CustomerReceiptStatus.POSTED));

        // SI-2 interiors: 16*2500=40000 unpaid, due today
        SalesInvoiceResponse dueToday = createPostedInvoice(
                interiors, new BigDecimal("16"), new BigDecimal("2500"), today);

        // SI-3 furniture: 20*2500=50000, receive 30000 → 20000 upcoming
        SalesInvoiceResponse upcomingFurniture = createPostedInvoice(
                furniture, new BigDecimal("20"), new BigDecimal("2500"), today.plusDays(7));
        customerReceiptService.createReceipt(org1.getId(), new CreateCustomerReceiptRequest(
                null, today, upcomingFurniture.id(), new BigDecimal("30000.00"),
                PaymentMethod.UPI, null, null, CustomerReceiptStatus.POSTED));

        // SI-4 homes: 40*2500=100000, receive 60000 → 40000 upcoming; then deactivate customer
        SalesInvoiceResponse upcomingHomes = createPostedInvoice(
                homes, new BigDecimal("40"), new BigDecimal("2500"), today.plusDays(10));
        customerReceiptService.createReceipt(org1.getId(), new CreateCustomerReceiptRequest(
                null, today, upcomingHomes.id(), new BigDecimal("60000.00"),
                PaymentMethod.CASH, null, null, CustomerReceiptStatus.POSTED));
        homes = customerService.toggleStatus(org1.getId(), homes.id());
        Assertions.assertFalse(homes.active());

        // Draft receipt must not affect outstanding
        customerReceiptService.createReceipt(org1.getId(), new CreateCustomerReceiptRequest(
                null, today, dueToday.id(), new BigDecimal("5000.00"),
                PaymentMethod.CASH, null, null, CustomerReceiptStatus.DRAFT));

        CustomerOutstandingReportResponse report = reportService.getReport(
                org1.getId(), null, null, null, null, null, null, null, PageRequest.of(0, 50));

        Assertions.assertEquals("INR", report.currency());
        Assertions.assertEquals(4, report.summary().outstandingInvoices());
        Assertions.assertEquals(3, report.summary().customersWithOutstanding());
        // 50000 + 40000 + 20000 + 40000 = 150000
        Assertions.assertEquals(0, new BigDecimal("150000.00").compareTo(report.summary().totalReceivable()));
        Assertions.assertEquals(0, new BigDecimal("50000.00").compareTo(report.summary().overdueAmount()));
        Assertions.assertEquals(3, report.byCustomer().size());
        Assertions.assertEquals("ABC Furniture", report.byCustomer().get(0).customerName());
        Assertions.assertEquals(0, new BigDecimal("70000.00").compareTo(
                report.byCustomer().get(0).outstandingAmount()));
        Assertions.assertEquals(DeliveryScheduleStatus.OVERDUE, report.invoices().content().get(0).dueStatus());

        CustomerOutstandingRowResponse overdueRow = report.invoices().content().stream()
                .filter(r -> r.salesInvoiceId().equals(overdue.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(InvoicePaymentStatus.PARTIALLY_PAID, overdueRow.paymentStatus());
        Assertions.assertEquals(0, new BigDecimal("75000.00").compareTo(overdueRow.invoiceAmount()));
        Assertions.assertEquals(0, new BigDecimal("25000.00").compareTo(overdueRow.receivedAmount()));
        Assertions.assertEquals(0, new BigDecimal("50000.00").compareTo(overdueRow.outstandingAmount()));
        Assertions.assertEquals(4, overdueRow.daysOverdue());

        CustomerOutstandingRowResponse dueTodayRow = report.invoices().content().stream()
                .filter(r -> r.salesInvoiceId().equals(dueToday.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(InvoicePaymentStatus.UNPAID, dueTodayRow.paymentStatus());
        Assertions.assertEquals(DeliveryScheduleStatus.DUE_TODAY, dueTodayRow.dueStatus());
        Assertions.assertEquals(0, new BigDecimal("40000.00").compareTo(dueTodayRow.outstandingAmount()));

        // Inactive customer still included
        Assertions.assertTrue(report.invoices().content().stream()
                .anyMatch(r -> r.salesInvoiceId().equals(upcomingHomes.id())));

        CustomerOutstandingReportResponse overdueOnly = reportService.getReport(
                org1.getId(), null, null, null, null, null, null,
                DeliveryScheduleStatus.OVERDUE, PageRequest.of(0, 20));
        Assertions.assertEquals(1, overdueOnly.summary().outstandingInvoices());
        Assertions.assertEquals(0, new BigDecimal("50000.00").compareTo(
                overdueOnly.summary().totalReceivable()));

        CustomerOutstandingReportResponse partialOnly = reportService.getReport(
                org1.getId(), null, null, null, null, null,
                InvoicePaymentStatus.PARTIALLY_PAID, null, PageRequest.of(0, 20));
        Assertions.assertEquals(3, partialOnly.summary().outstandingInvoices());

        CustomerOutstandingReportResponse furnitureOnly = reportService.getReport(
                org1.getId(), furniture.id(), null, null, null, null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, furnitureOnly.summary().outstandingInvoices());
        Assertions.assertEquals(1, furnitureOnly.summary().customersWithOutstanding());
        Assertions.assertEquals(0, new BigDecimal("70000.00").compareTo(
                furnitureOnly.summary().totalReceivable()));

        byte[] csv = reportService.exportCsv(org1.getId(), null, null, null, null, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains(overdue.invoiceNumber()));
        Assertions.assertTrue(text.contains("ABC Furniture"));
        Assertions.assertTrue(text.contains("OVERDUE"));
        Assertions.assertTrue(text.contains("PARTIALLY_PAID"));

        // Full settlement removes invoice
        customerReceiptService.createReceipt(org1.getId(), new CreateCustomerReceiptRequest(
                null, today, dueToday.id(), new BigDecimal("40000.00"),
                PaymentMethod.CASH, null, null, CustomerReceiptStatus.POSTED));
        CustomerOutstandingReportResponse afterFull = reportService.getReport(
                org1.getId(), null, null, null, null, null, null, null, PageRequest.of(0, 50));
        Assertions.assertEquals(3, afterFull.summary().outstandingInvoices());
        Assertions.assertFalse(afterFull.invoices().content().stream()
                .anyMatch(r -> r.salesInvoiceId().equals(dueToday.id())));
        Assertions.assertEquals(2, afterFull.summary().customersWithOutstanding());

        CustomerOutstandingReportResponse other = reportService.getReport(
                org2.getId(), null, null, null, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().outstandingInvoices());
        Assertions.assertEquals(0, other.summary().customersWithOutstanding());
        Assertions.assertTrue(other.byCustomer().isEmpty());
    }
}
