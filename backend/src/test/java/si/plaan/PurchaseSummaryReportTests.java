package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateItemRequest;
import si.plaan.dto.request.CreatePurchaseOrderRequest;
import si.plaan.dto.request.CreateSupplierRequest;
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.PurchaseOrderItemRequest;
import si.plaan.dto.response.ItemResponse;
import si.plaan.dto.response.PurchaseOrderResponse;
import si.plaan.dto.response.PurchaseSummaryReportResponse;
import si.plaan.dto.response.SupplierResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.entity.Organization;
import si.plaan.entity.PurchaseOrderStatus;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ItemService;
import si.plaan.service.PurchaseOrderService;
import si.plaan.service.PurchaseSummaryReportService;
import si.plaan.service.SupplierService;
import si.plaan.service.WarehouseService;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class PurchaseSummaryReportTests {

    @Autowired private PurchaseSummaryReportService reportService;
    @Autowired private PurchaseOrderService purchaseOrderService;
    @Autowired private SupplierService supplierService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private ItemService itemService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private SupplierResponse timber;
    private SupplierResponse hardware;
    private WarehouseResponse warehouse;
    private WarehouseResponse warehouse2;
    private ItemResponse board;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("PS Org " + uid).slug("ps-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("PS Other " + uid).slug("ps-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        timber = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-T", "ABC Timber", null, null, null, null, null, true));
        hardware = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-H", "XYZ Hardware", null, null, null, null, null, true));
        warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-1", "Main Store", "Bangalore", null, true));
        warehouse2 = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-2", "Yard", "Mysore", null, true));
        board = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITM-B", "Wooden Board", null, "Raw Materials", null, null, "Nos", null, true));
    }

    private PurchaseOrderResponse createPo(
            String number,
            Long supplierId,
            Long warehouseId,
            LocalDate orderDate,
            BigDecimal qty,
            BigDecimal price,
            PurchaseOrderStatus status) {
        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(org1.getId(),
                new CreatePurchaseOrderRequest(
                        number, supplierId, warehouseId, orderDate, orderDate.plusDays(7), null,
                        PurchaseOrderStatus.ISSUED,
                        List.of(new PurchaseOrderItemRequest(board.id(), qty, price))));
        if (status != PurchaseOrderStatus.ISSUED) {
            po = purchaseOrderService.updateStatus(org1.getId(), po.id(), status);
        }
        return po;
    }

    @Test
    public void testSummaryTotalsFiltersAndSupplierBreakdown() {
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 30);

        createPo("PO-001", timber.id(), warehouse.id(), LocalDate.of(2026, 11, 5),
                new BigDecimal("100"), new BigDecimal("500"), PurchaseOrderStatus.COMPLETED);
        createPo("PO-002", hardware.id(), warehouse.id(), LocalDate.of(2026, 11, 10),
                new BigDecimal("50"), new BigDecimal("500"), PurchaseOrderStatus.PARTIALLY_RECEIVED);
        createPo("PO-003", timber.id(), warehouse2.id(), LocalDate.of(2026, 11, 15),
                new BigDecimal("70"), new BigDecimal("500"), PurchaseOrderStatus.ISSUED);
        createPo("PO-004", hardware.id(), warehouse.id(), LocalDate.of(2026, 11, 20),
                new BigDecimal("80"), new BigDecimal("500"), PurchaseOrderStatus.COMPLETED);

        // Outside range / excluded statuses
        createPo("PO-OLD", timber.id(), warehouse.id(), LocalDate.of(2026, 10, 1),
                BigDecimal.TEN, BigDecimal.TEN, PurchaseOrderStatus.ISSUED);
        PurchaseOrderResponse draft = purchaseOrderService.createPurchaseOrder(org1.getId(),
                new CreatePurchaseOrderRequest(
                        "PO-DRAFT", timber.id(), warehouse.id(), LocalDate.of(2026, 11, 12), null, null,
                        PurchaseOrderStatus.DRAFT,
                        List.of(new PurchaseOrderItemRequest(board.id(), BigDecimal.ONE, BigDecimal.TEN))));
        Assertions.assertEquals(PurchaseOrderStatus.DRAFT, draft.status());
        createPo("PO-CAN", timber.id(), warehouse.id(), LocalDate.of(2026, 11, 18),
                BigDecimal.ONE, BigDecimal.TEN, PurchaseOrderStatus.CANCELLED);

        PurchaseSummaryReportResponse report = reportService.getReport(
                org1.getId(), from, to, null, null, null, PageRequest.of(0, 20));

        Assertions.assertEquals("INR", report.currency());
        Assertions.assertEquals(4, report.summary().totalPurchaseOrders());
        Assertions.assertEquals(0, new BigDecimal("150000.00").compareTo(report.summary().totalOrderValue()));
        Assertions.assertEquals(2, report.summary().fullyReceived());
        Assertions.assertEquals(2, report.summary().pendingOrders());
        Assertions.assertEquals(4, report.orders().totalElements());
        Assertions.assertEquals(2, report.bySupplier().size());
        Assertions.assertEquals("ABC Timber", report.bySupplier().get(0).supplierName());
        Assertions.assertEquals(0, new BigDecimal("85000.00").compareTo(report.bySupplier().get(0).orderValue()));
        Assertions.assertEquals(0, new BigDecimal("65000.00").compareTo(report.bySupplier().get(1).orderValue()));

        PurchaseSummaryReportResponse timberOnly = reportService.getReport(
                org1.getId(), from, to, timber.id(), null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, timberOnly.summary().totalPurchaseOrders());
        Assertions.assertEquals(0, new BigDecimal("85000.00").compareTo(timberOnly.summary().totalOrderValue()));

        PurchaseSummaryReportResponse completedOnly = reportService.getReport(
                org1.getId(), from, to, null, null, PurchaseOrderStatus.COMPLETED, PageRequest.of(0, 20));
        Assertions.assertEquals(2, completedOnly.summary().totalPurchaseOrders());
        Assertions.assertEquals(2, completedOnly.summary().fullyReceived());
        Assertions.assertEquals(0, completedOnly.summary().pendingOrders());

        PurchaseSummaryReportResponse wh2Only = reportService.getReport(
                org1.getId(), from, to, null, warehouse2.id(), null, PageRequest.of(0, 20));
        Assertions.assertEquals(1, wh2Only.summary().totalPurchaseOrders());
        Assertions.assertEquals("PO-003", wh2Only.orders().content().get(0).poNumber());

        byte[] csv = reportService.exportCsv(org1.getId(), from, to, null, null, null);
        String csvText = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(csvText.contains("PO-001"));
        Assertions.assertTrue(csvText.contains("PO-004"));
        Assertions.assertFalse(csvText.contains("PO-DRAFT"));
        Assertions.assertFalse(csvText.contains("PO-OLD"));
    }

    @Test
    public void testTenantIsolation() {
        createPo("PO-T1", timber.id(), warehouse.id(), LocalDate.now(),
                BigDecimal.TEN, BigDecimal.TEN, PurchaseOrderStatus.ISSUED);

        PurchaseSummaryReportResponse other = reportService.getReport(
                org2.getId(), LocalDate.now().minusDays(30), LocalDate.now(),
                null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().totalPurchaseOrders());
        Assertions.assertEquals(0, other.orders().totalElements());
    }
}
