package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateGoodsReceiptRequest;
import si.plaan.dto.request.CreateItemRequest;
import si.plaan.dto.request.CreatePurchaseOrderRequest;
import si.plaan.dto.request.CreateSupplierRequest;
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.GoodsReceiptItemRequest;
import si.plaan.dto.request.PurchaseOrderItemRequest;
import si.plaan.dto.response.GoodsReceiptResponse;
import si.plaan.dto.response.ItemResponse;
import si.plaan.dto.response.PendingPurchaseOrderReportResponse;
import si.plaan.dto.response.PendingPurchaseOrderRowResponse;
import si.plaan.dto.response.PurchaseOrderResponse;
import si.plaan.dto.response.SupplierResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.entity.GoodsReceiptStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.PurchaseOrderStatus;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.GoodsReceiptService;
import si.plaan.service.ItemService;
import si.plaan.service.PendingPurchaseOrderReportService;
import si.plaan.service.PurchaseOrderService;
import si.plaan.service.SupplierService;
import si.plaan.service.WarehouseService;
import si.plaan.service.impl.PendingPurchaseOrderReportServiceImpl;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class PendingPurchaseOrderReportTests {

    @Autowired private PendingPurchaseOrderReportService reportService;
    @Autowired private PurchaseOrderService purchaseOrderService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private SupplierService supplierService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private ItemService itemService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private SupplierResponse timber;
    private SupplierResponse hardware;
    private WarehouseResponse warehouse;
    private ItemResponse board;
    private ItemResponse legs;
    private ItemResponse screws;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("PPO Org " + uid).slug("ppo-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("PPO Other " + uid).slug("ppo-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        timber = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-T", "ABC Timber", null, null, null, null, null, true));
        hardware = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-H", "XYZ Hardware", null, null, null, null, null, true));
        warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-1", "Main Store", "Bangalore", null, true));
        board = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITM-BOARD", "Wooden Board", null, "Raw Materials", null, null, "Nos", null, true));
        legs = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITM-LEGS", "Table Legs", null, "Raw Materials", null, null, "Nos", null, true));
        screws = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITM-SCRW", "Screws", null, "Consumables", null, null, "Nos", null, true));
    }

    private PurchaseOrderResponse createIssuedPo(
            String number,
            Long supplierId,
            LocalDate expected,
            Long itemId,
            BigDecimal qty,
            BigDecimal price) {
        return purchaseOrderService.createPurchaseOrder(org1.getId(),
                new CreatePurchaseOrderRequest(
                        number, supplierId, warehouse.id(), LocalDate.now().minusDays(10), expected, null,
                        PurchaseOrderStatus.ISSUED,
                        List.of(new PurchaseOrderItemRequest(itemId, qty, price))));
    }

    private void postPartialReceipt(PurchaseOrderResponse po, BigDecimal receivedQty) {
        GoodsReceiptResponse draft = goodsReceiptService.createGoodsReceipt(org1.getId(),
                new CreateGoodsReceiptRequest(
                        null, po.id(), LocalDate.now(), null, null, GoodsReceiptStatus.DRAFT,
                        List.of(new GoodsReceiptItemRequest(
                                po.items().get(0).id(), po.items().get(0).itemId(), receivedQty))));
        goodsReceiptService.postGoodsReceipt(org1.getId(), draft.id());
    }

    @Test
    public void testPendingLinesSummaryAndPartialReceipts() {
        LocalDate overdue = LocalDate.now().minusDays(6);
        LocalDate upcoming = LocalDate.now().plusDays(4);

        PurchaseOrderResponse po1 = createIssuedPo("PO-001", timber.id(), overdue,
                board.id(), new BigDecimal("100"), new BigDecimal("500"));
        postPartialReceipt(po1, new BigDecimal("60"));

        PurchaseOrderResponse po2 = createIssuedPo("PO-002", hardware.id(), overdue,
                legs.id(), new BigDecimal("200"), new BigDecimal("100"));
        postPartialReceipt(po2, new BigDecimal("150"));

        createIssuedPo("PO-003", hardware.id(), upcoming,
                screws.id(), new BigDecimal("1000"), new BigDecimal("5"));

        // Fully received line should disappear
        PurchaseOrderResponse poFull = createIssuedPo("PO-004", timber.id(), upcoming,
                board.id(), new BigDecimal("10"), new BigDecimal("500"));
        postPartialReceipt(poFull, new BigDecimal("10"));

        // Draft GRN must not count as received
        PurchaseOrderResponse poDraftGrn = createIssuedPo("PO-005", timber.id(), upcoming,
                board.id(), new BigDecimal("20"), new BigDecimal("500"));
        goodsReceiptService.createGoodsReceipt(org1.getId(),
                new CreateGoodsReceiptRequest(
                        null, poDraftGrn.id(), LocalDate.now(), null, null, GoodsReceiptStatus.DRAFT,
                        List.of(new GoodsReceiptItemRequest(
                                poDraftGrn.items().get(0).id(), board.id(), new BigDecimal("20")))));

        PendingPurchaseOrderReportResponse report = reportService.getReport(
                org1.getId(), null, null, null, null, null, null, PageRequest.of(0, 50));

        Assertions.assertEquals(4, report.summary().pendingPos()); // PO-001,002,003,005
        Assertions.assertEquals(2, report.summary().overduePos()); // PO-001,002
        Assertions.assertEquals(0, new BigDecimal("40000.00").compareTo(report.summary().pendingValue()));
        // 40*500 + 50*100 + 1000*5 + 20*500 = 20000 + 5000 + 5000 + 10000 = 40000

        Assertions.assertEquals(4, report.lines().totalElements());
        Assertions.assertTrue(report.lines().content().stream().noneMatch(r -> r.poNumber().equals("PO-004")));

        PendingPurchaseOrderRowResponse boardLine = report.lines().content().stream()
                .filter(r -> r.poNumber().equals("PO-001"))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("40").compareTo(boardLine.pendingQuantity()));
        Assertions.assertEquals(0, new BigDecimal("20000.00").compareTo(boardLine.pendingValue()));
        Assertions.assertEquals(DeliveryScheduleStatus.OVERDUE, boardLine.deliveryStatus());
        Assertions.assertTrue(boardLine.daysOverdue() != null && boardLine.daysOverdue() >= 6);

        PendingPurchaseOrderReportResponse overdueOnly = reportService.getReport(
                org1.getId(), null, null, null, DeliveryScheduleStatus.OVERDUE,
                null, null, PageRequest.of(0, 50));
        Assertions.assertEquals(2, overdueOnly.summary().pendingPos());
        Assertions.assertEquals(2, overdueOnly.lines().totalElements());

        PendingPurchaseOrderReportResponse timberOnly = reportService.getReport(
                org1.getId(), timber.id(), null, null, null, null, null, PageRequest.of(0, 50));
        Assertions.assertEquals(2, timberOnly.summary().pendingPos());

        byte[] csv = reportService.exportCsv(org1.getId(), null, null, null, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains("PO-001"));
        Assertions.assertTrue(text.contains("Wooden Board"));
        Assertions.assertFalse(text.contains("PO-004"));
    }

    @Test
    public void testDeliveryStatusResolverAndTenantIsolation() {
        LocalDate today = LocalDate.now();
        Assertions.assertEquals(DeliveryScheduleStatus.NOT_SCHEDULED,
                PendingPurchaseOrderReportServiceImpl.resolveDeliveryStatus(null, today));
        Assertions.assertEquals(DeliveryScheduleStatus.DUE_TODAY,
                PendingPurchaseOrderReportServiceImpl.resolveDeliveryStatus(today, today));
        Assertions.assertEquals(DeliveryScheduleStatus.OVERDUE,
                PendingPurchaseOrderReportServiceImpl.resolveDeliveryStatus(today.minusDays(1), today));
        Assertions.assertEquals(DeliveryScheduleStatus.UPCOMING,
                PendingPurchaseOrderReportServiceImpl.resolveDeliveryStatus(today.plusDays(1), today));

        createIssuedPo("PO-T1", timber.id(), today.plusDays(2),
                board.id(), BigDecimal.TEN, BigDecimal.TEN);

        PendingPurchaseOrderReportResponse other = reportService.getReport(
                org2.getId(), null, null, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().pendingPos());
        Assertions.assertEquals(0, other.lines().totalElements());
    }
}
