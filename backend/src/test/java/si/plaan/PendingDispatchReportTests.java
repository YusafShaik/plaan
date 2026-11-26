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
import si.plaan.service.impl.PendingDispatchReportServiceImpl;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class PendingDispatchReportTests {

    @Autowired private PendingDispatchReportService reportService;
    @Autowired private SalesOrderService salesOrderService;
    @Autowired private DispatchOrderService dispatchOrderService;
    @Autowired private CustomerService customerService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private ItemService itemService;
    @Autowired private SupplierService supplierService;
    @Autowired private PurchaseOrderService purchaseOrderService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private InspectionTemplateService inspectionTemplateService;
    @Autowired private IncomingInspectionService incomingInspectionService;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private StockAvailabilityService stockAvailabilityService;

    private Organization org1;
    private Organization org2;
    private CustomerResponse customerA;
    private CustomerResponse customerB;
    private WarehouseResponse warehouse;
    private ItemResponse table;
    private ItemResponse chair;
    private LocalDate today;

    @BeforeEach
    void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("PD Org " + uid).slug("pd-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("PD Other " + uid).slug("pd-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));

        customerA = customerService.createCustomer(org1.getId(), new CreateCustomerRequest(
                "CUS-A", "ABC Furniture", null, null, null, null, null, null, true));
        customerB = customerService.createCustomer(org1.getId(), new CreateCustomerRequest(
                "CUS-B", "Royal Interiors", null, null, null, null, null, null, true));
        warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-FG", "Finished Goods Store", "Bangalore", null, true));
        table = itemService.createItem(org1.getId(), new CreateItemRequest(
                "FG-TBL", "Wooden Table", null, "Finished Goods", null, null, "Nos", null, true));
        chair = itemService.createItem(org1.getId(), new CreateItemRequest(
                "FG-CHR", "Wooden Chair", null, "Finished Goods", null, null, "Nos", null, true));
    }

    private void addStock(Long itemId, BigDecimal qty) {
        SupplierResponse supplier = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                null, "Supplier " + UUID.randomUUID(), null, null, null, null, null, true));
        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(org1.getId(),
                new CreatePurchaseOrderRequest(
                        null, supplier.id(), warehouse.id(), today.minusDays(5), null, null,
                        PurchaseOrderStatus.ISSUED,
                        List.of(new PurchaseOrderItemRequest(itemId, qty, BigDecimal.TEN))));
        GoodsReceiptResponse gr = goodsReceiptService.createGoodsReceipt(org1.getId(),
                new CreateGoodsReceiptRequest(
                        null, po.id(), today.minusDays(4), null, null, GoodsReceiptStatus.DRAFT,
                        List.of(new GoodsReceiptItemRequest(po.items().get(0).id(), itemId, qty))));
        goodsReceiptService.postGoodsReceipt(org1.getId(), gr.id());
    }

    private SalesOrderResponse createConfirmed(
            Long customerId, Long itemId, BigDecimal qty, BigDecimal price, LocalDate expected) {
        SalesOrderResponse order = salesOrderService.createSalesOrder(org1.getId(),
                new CreateSalesOrderRequest(
                        null, customerId, warehouse.id(), today.minusDays(3), expected,
                        null, null, null, null, SalesOrderStatus.DRAFT,
                        List.of(new SalesOrderItemRequest(null, itemId, qty, price))));
        return salesOrderService.confirmSalesOrder(org1.getId(), order.id());
    }

    @Test
    public void testPendingQuantitiesShortageDeliveryFiltersAndIsolation() {
        addStock(table.id(), new BigDecimal("100"));
        addStock(chair.id(), new BigDecimal("15"));

        SalesOrderResponse overdue = createConfirmed(
                customerA.id(), table.id(), new BigDecimal("100"), new BigDecimal("2500"),
                today.minusDays(2));
        SalesOrderResponse dueToday = createConfirmed(
                customerB.id(), chair.id(), new BigDecimal("50"), new BigDecimal("1200"),
                today);
        SalesOrderResponse upcoming = createConfirmed(
                customerA.id(), table.id(), new BigDecimal("20"), new BigDecimal("2500"),
                today.plusDays(5));

        // Partial dispatch on overdue order: 60 of 100 (stock left = 40)
        Long overdueItemId = overdue.items().get(0).id();
        dispatchOrderService.createDispatchOrder(org1.getId(), new CreateDispatchOrderRequest(
                null, overdue.id(), today, null, null, null, null, null,
                DispatchOrderStatus.POSTED,
                List.of(new DispatchOrderItemRequest(overdueItemId, table.id(), new BigDecimal("60")))));

        // Draft SO excluded
        salesOrderService.createSalesOrder(org1.getId(), new CreateSalesOrderRequest(
                null, customerA.id(), warehouse.id(), today, today.plusDays(1),
                null, null, null, null, SalesOrderStatus.DRAFT,
                List.of(new SalesOrderItemRequest(null, table.id(), BigDecimal.TEN, BigDecimal.TEN))));

        PendingDispatchReportResponse report = reportService.getReport(
                org1.getId(), null, null, null, null, null, null, null, PageRequest.of(0, 50));

        Assertions.assertEquals("INR", report.currency());
        Assertions.assertEquals(3, report.summary().pendingSalesOrders());
        Assertions.assertEquals(1, report.summary().overdueOrders());
        Assertions.assertEquals(1, report.summary().linesWithStockShortage());
        // Pending values: table 40*2500=100000 + chair 50*1200=60000 + table 20*2500=50000 = 210000
        Assertions.assertEquals(0, new BigDecimal("210000.00").compareTo(report.summary().pendingOrderValue()));
        Assertions.assertEquals(3, report.lines().totalElements());
        Assertions.assertEquals(DeliveryScheduleStatus.OVERDUE, report.lines().content().get(0).deliveryStatus());

        PendingDispatchRowResponse overdueRow = report.lines().content().stream()
                .filter(r -> r.salesOrderId().equals(overdue.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("100").compareTo(overdueRow.orderedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("60").compareTo(overdueRow.dispatchedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("40").compareTo(overdueRow.pendingQuantity()));
        Assertions.assertEquals(0, new BigDecimal("40").compareTo(overdueRow.availableStock()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(overdueRow.shortageQuantity()));
        Assertions.assertTrue(overdueRow.readyForDispatch());
        Assertions.assertEquals(2, overdueRow.daysOverdue());

        PendingDispatchRowResponse shortageRow = report.lines().content().stream()
                .filter(r -> r.salesOrderId().equals(dueToday.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(DeliveryScheduleStatus.DUE_TODAY, shortageRow.deliveryStatus());
        Assertions.assertEquals(0, new BigDecimal("50").compareTo(shortageRow.pendingQuantity()));
        Assertions.assertEquals(0, new BigDecimal("15").compareTo(shortageRow.availableStock()));
        Assertions.assertEquals(0, new BigDecimal("35").compareTo(shortageRow.shortageQuantity()));
        Assertions.assertEquals(0, new BigDecimal("15").compareTo(shortageRow.canDispatchNow()));
        Assertions.assertFalse(shortageRow.readyForDispatch());

        PendingDispatchReportResponse overdueOnly = reportService.getReport(
                org1.getId(), null, null, null, DeliveryScheduleStatus.OVERDUE,
                null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(1, overdueOnly.summary().pendingSalesOrders());

        PendingDispatchReportResponse shortageOnly = reportService.getReport(
                org1.getId(), null, null, null, null, null, null,
                PendingDispatchReportServiceImpl.STOCK_SHORTAGE, PageRequest.of(0, 20));
        Assertions.assertEquals(1, shortageOnly.lines().totalElements());
        Assertions.assertEquals(dueToday.id(), shortageOnly.lines().content().get(0).salesOrderId());

        PendingDispatchReportResponse readyOnly = reportService.getReport(
                org1.getId(), null, null, null, null, null, null,
                PendingDispatchReportServiceImpl.STOCK_READY, PageRequest.of(0, 20));
        Assertions.assertEquals(2, readyOnly.lines().totalElements());

        PendingDispatchReportResponse customerFilter = reportService.getReport(
                org1.getId(), customerB.id(), null, null, null, null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(1, customerFilter.summary().pendingSalesOrders());

        PendingDispatchReportResponse itemFilter = reportService.getReport(
                org1.getId(), null, chair.id(), null, null, null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(1, itemFilter.lines().totalElements());

        byte[] csv = reportService.exportCsv(org1.getId(), null, null, null, null, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains(overdue.orderNumber()));
        Assertions.assertTrue(text.contains("Wooden Chair"));
        Assertions.assertTrue(text.contains("OVERDUE"));

        // Fully dispatched line disappears
        Long upcomingItemId = upcoming.items().get(0).id();
        dispatchOrderService.createDispatchOrder(org1.getId(), new CreateDispatchOrderRequest(
                null, upcoming.id(), today, null, null, null, null, null,
                DispatchOrderStatus.POSTED,
                List.of(new DispatchOrderItemRequest(upcomingItemId, table.id(), new BigDecimal("20")))));
        PendingDispatchReportResponse afterFull = reportService.getReport(
                org1.getId(), null, null, null, null, null, null, null, PageRequest.of(0, 50));
        Assertions.assertEquals(2, afterFull.summary().pendingSalesOrders());
        Assertions.assertFalse(afterFull.lines().content().stream()
                .anyMatch(r -> r.salesOrderId().equals(upcoming.id())));

        PendingDispatchReportResponse other = reportService.getReport(
                org2.getId(), null, null, null, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().pendingSalesOrders());
        Assertions.assertEquals(0, other.lines().totalElements());
    }

    @Test
    public void testQualityHoldReducesAvailableStock() {
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Table IQC", table.id(), InspectionType.INCOMING, null, true,
                List.of(
                        new InspectionTemplateParameterRequest("Finish", "OK"),
                        new InspectionTemplateParameterRequest("Size", "OK"),
                        new InspectionTemplateParameterRequest("Condition", "OK")
                )));

        addStock(table.id(), new BigDecimal("30"));
        // Available should be 0 while IQC pending
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(
                stockAvailabilityService.getAvailable(org1.getId(), table.id(), warehouse.id())));
        Assertions.assertEquals(1, incomingInspectionService.getInspections(
                org1.getId(), null, IncomingInspectionStatus.PENDING, PageRequest.of(0, 5))
                .totalElements());

        SalesOrderResponse order = createConfirmed(
                customerA.id(), table.id(), new BigDecimal("10"), new BigDecimal("100"),
                today.plusDays(3));

        PendingDispatchReportResponse report = reportService.getReport(
                org1.getId(), null, null, null, null, null, null, null, PageRequest.of(0, 10));
        PendingDispatchRowResponse row = report.lines().content().stream()
                .filter(r -> r.salesOrderId().equals(order.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(row.availableStock()));
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(row.shortageQuantity()));
        Assertions.assertFalse(row.readyForDispatch());
    }
}
