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
import si.plaan.repository.ItemRepository;
import si.plaan.repository.ItemTypeRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.WarehouseRepository;
import si.plaan.service.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class ProductionSummaryReportTests {

    @Autowired private ProductionSummaryReportService reportService;
    @Autowired private ProductionOrderService productionOrderService;
    @Autowired private ProductionReceiptService productionReceiptService;
    @Autowired private MaterialIssueService materialIssueService;
    @Autowired private MaterialConsumptionService materialConsumptionService;
    @Autowired private BomService bomService;
    @Autowired private OpeningStockService openingStockService;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private ItemTypeRepository itemTypeRepository;
    @Autowired private WarehouseRepository warehouseRepository;

    private Long orgId;
    private Long otherOrgId;
    private Warehouse sourceWarehouse;
    private Warehouse fgWarehouse;
    private Warehouse otherFgWarehouse;
    private Item tableItem;
    private Item chairItem;
    private Item boardItem;
    private Item screwItem;

    @BeforeEach
    void setup() {
        Organization org = organizationRepository.save(Organization.builder()
                .name("PSR Org-" + UUID.randomUUID())
                .slug("psr-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());
        orgId = org.getId();

        Organization otherOrg = organizationRepository.save(Organization.builder()
                .name("PSR Other-" + UUID.randomUUID())
                .slug("psr-o-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());
        otherOrgId = otherOrg.getId();

        ItemType rawType = itemTypeRepository.save(ItemType.builder()
                .organization(org).name("Raw Material").build());
        ItemType fgType = itemTypeRepository.save(ItemType.builder()
                .organization(org).name("Finished Goods").build());

        tableItem = itemRepository.save(Item.builder()
                .organization(org).name("Wooden Table")
                .itemCode("FG-TBL-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(fgType).unitOfMeasure("Nos").active(true).build());
        chairItem = itemRepository.save(Item.builder()
                .organization(org).name("Wooden Chair")
                .itemCode("FG-CHR-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(fgType).unitOfMeasure("Nos").active(true).build());
        boardItem = itemRepository.save(Item.builder()
                .organization(org).name("Wooden Board")
                .itemCode("RAW-BRD-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(rawType).unitOfMeasure("Nos").active(true).build());
        screwItem = itemRepository.save(Item.builder()
                .organization(org).name("Screws")
                .itemCode("RAW-SCR-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(rawType).unitOfMeasure("Nos").active(true).build());

        sourceWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org).name("Raw Material Store")
                .warehouseCode("RMS-" + UUID.randomUUID().toString().substring(0, 4))
                .active(true).build());
        fgWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org).name("Finished Goods Store")
                .warehouseCode("FGS-" + UUID.randomUUID().toString().substring(0, 4))
                .active(true).build());
        otherFgWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org).name("Secondary FG")
                .warehouseCode("FG2-" + UUID.randomUUID().toString().substring(0, 4))
                .active(true).build());

        bomService.createBom(orgId, CreateBomRequest.builder()
                .productId(tableItem.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        BomItemRequest.builder().materialId(boardItem.getId()).quantity(BigDecimal.ONE).build(),
                        BomItemRequest.builder().materialId(screwItem.getId()).quantity(new BigDecimal("16")).build()
                ))
                .build());
        bomService.createBom(orgId, CreateBomRequest.builder()
                .productId(chairItem.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        BomItemRequest.builder().materialId(boardItem.getId()).quantity(BigDecimal.ONE).build(),
                        BomItemRequest.builder().materialId(screwItem.getId()).quantity(new BigDecimal("8")).build()
                ))
                .build());

        openingStockService.createOpeningStock(orgId, CreateOpeningStockRequest.builder()
                .warehouseId(sourceWarehouse.getId())
                .openingDate(LocalDate.of(2026, 10, 1))
                .postImmediately(true)
                .items(List.of(
                        OpeningStockItemRequest.builder().itemId(boardItem.getId()).quantity(new BigDecimal("500")).build(),
                        OpeningStockItemRequest.builder().itemId(screwItem.getId()).quantity(new BigDecimal("5000")).build()
                ))
                .build());
    }

    private ProductionOrderResponse createReleased(
            Item product, int qty, LocalDate orderDate, Long fgWarehouseId) {
        return productionOrderService.createProductionOrder(orgId, CreateProductionOrderRequest.builder()
                .orderDate(orderDate)
                .productId(product.getId())
                .productionQuantity(new BigDecimal(qty))
                .plannedEndDate(orderDate.plusDays(14))
                .sourceWarehouseId(sourceWarehouse.getId())
                .finishedGoodsWarehouseId(fgWarehouseId)
                .releaseImmediately(true)
                .build());
    }

    private void advanceToInProgressWithReceipts(ProductionOrderResponse order, BigDecimal... receiptQtys) {
        List<MaterialIssueItemRequest> issueItems = order.getItems().stream()
                .map(item -> MaterialIssueItemRequest.builder()
                        .materialId(item.getMaterialId())
                        .issueQuantity(item.getRequiredQuantity())
                        .build())
                .toList();
        materialIssueService.createMaterialIssue(orgId, CreateMaterialIssueRequest.builder()
                .productionOrderId(order.getId())
                .issueDate(order.getOrderDate())
                .postImmediately(true)
                .items(issueItems)
                .build());

        List<MaterialConsumptionItemRequest> consumeItems = order.getItems().stream()
                .map(item -> MaterialConsumptionItemRequest.builder()
                        .materialId(item.getMaterialId())
                        .consumedQuantity(item.getRequiredQuantity())
                        .build())
                .toList();
        materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                .productionOrderId(order.getId())
                .consumptionDate(order.getOrderDate())
                .postImmediately(true)
                .items(consumeItems)
                .build());

        for (BigDecimal qty : receiptQtys) {
            productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                    .productionOrderId(order.getId())
                    .receiptDate(order.getOrderDate())
                    .receiptQuantity(qty)
                    .postImmediately(true)
                    .build());
        }
    }

    @Test
    public void testSummaryFiltersProductProgressReceiptsAndIsolation() {
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 30);

        ProductionOrderResponse released = createReleased(tableItem, 40, LocalDate.of(2026, 11, 3), fgWarehouse.getId());
        Assertions.assertEquals(ProductionOrderStatus.RELEASED, released.getStatus());

        ProductionOrderResponse partial = createReleased(tableItem, 100, LocalDate.of(2026, 11, 8), fgWarehouse.getId());
        advanceToInProgressWithReceipts(partial, new BigDecimal("60"));
        ProductionOrderResponse partialAfter = productionOrderService.getProductionOrderById(orgId, partial.getId());
        Assertions.assertEquals(ProductionOrderStatus.IN_PROGRESS, partialAfter.getStatus());
        Assertions.assertEquals(0, new BigDecimal("60").compareTo(partialAfter.getReceivedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("40").compareTo(partialAfter.getPendingProductionQuantity()));

        ProductionOrderResponse full = createReleased(chairItem, 20, LocalDate.of(2026, 11, 12), fgWarehouse.getId());
        // Chair BOM uses 8 screws; helper multiplies by 16 — issue/consume based on board=planned which works for chair BOM board qty.
        // Screws issued = planned*16 but chair only needs planned*8; leftover is fine for receipts/complete.
        advanceToInProgressWithReceipts(full, new BigDecimal("10"), new BigDecimal("10"));
        ProductionOrderResponse completed = productionOrderService.completeProductionOrder(
                orgId, full.getId(), "tester@plaan.si");
        Assertions.assertEquals(ProductionOrderStatus.COMPLETED, completed.getStatus());
        Assertions.assertEquals(0, new BigDecimal("20").compareTo(completed.getReceivedQuantity()));

        ProductionOrderResponse otherWh = createReleased(
                chairItem, 15, LocalDate.of(2026, 11, 15), otherFgWarehouse.getId());

        // Exclusions
        createReleased(tableItem, 5, LocalDate.of(2026, 10, 10), fgWarehouse.getId()); // out of range
        productionOrderService.createProductionOrder(orgId, CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.of(2026, 11, 20))
                .productId(tableItem.getId())
                .productionQuantity(BigDecimal.TEN)
                .sourceWarehouseId(sourceWarehouse.getId())
                .finishedGoodsWarehouseId(fgWarehouse.getId())
                .releaseImmediately(false)
                .build());
        ProductionOrderResponse cancelled = createReleased(
                tableItem, 8, LocalDate.of(2026, 11, 22), fgWarehouse.getId());
        productionOrderService.cancelProductionOrder(orgId, cancelled.getId());

        ProductionSummaryReportResponse report = reportService.getReport(
                orgId, from, to, null, null, null, null, PageRequest.of(0, 50));

        Assertions.assertEquals(4, report.summary().productionOrders());
        Assertions.assertEquals(2, report.summary().released()); // released + otherWh
        Assertions.assertEquals(1, report.summary().inProgress());
        Assertions.assertEquals(1, report.summary().completedOrClosed());
        Assertions.assertEquals(4, report.orders().totalElements());

        ProductionSummaryProductProgressResponse tableProgress = report.byProduct().stream()
                .filter(p -> p.productId().equals(tableItem.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("140").compareTo(tableProgress.plannedQuantity())); // 40+100
        Assertions.assertEquals(0, new BigDecimal("60").compareTo(tableProgress.producedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("80").compareTo(tableProgress.pendingQuantity()));
        Assertions.assertEquals(0, new BigDecimal("42.86").compareTo(tableProgress.completionPercent()));

        ProductionSummaryProductProgressResponse chairProgress = report.byProduct().stream()
                .filter(p -> p.productId().equals(chairItem.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("35").compareTo(chairProgress.plannedQuantity())); // 20+15
        Assertions.assertEquals(0, new BigDecimal("20").compareTo(chairProgress.producedQuantity()));

        ProductionSummaryRowResponse partialRow = report.orders().content().stream()
                .filter(r -> r.id().equals(partial.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("100").compareTo(partialRow.plannedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("60").compareTo(partialRow.producedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("40").compareTo(partialRow.pendingQuantity()));
        Assertions.assertEquals(0, new BigDecimal("60.00").compareTo(partialRow.completionPercent()));
        Assertions.assertEquals(ProductionOrderStatus.IN_PROGRESS, partialRow.status());

        ProductionSummaryReportResponse tableOnly = reportService.getReport(
                orgId, from, to, tableItem.getId(), null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, tableOnly.summary().productionOrders());
        Assertions.assertTrue(tableOnly.orders().content().stream()
                .allMatch(r -> r.productId().equals(tableItem.getId())));

        ProductionSummaryReportResponse completedOnly = reportService.getReport(
                orgId, from, to, null, null, null, ProductionOrderStatus.COMPLETED, PageRequest.of(0, 20));
        Assertions.assertEquals(1, completedOnly.summary().productionOrders());
        Assertions.assertEquals(1, completedOnly.summary().completedOrClosed());
        Assertions.assertEquals(0, completedOnly.summary().released());

        ProductionSummaryReportResponse fg2Only = reportService.getReport(
                orgId, from, to, null, null, otherFgWarehouse.getId(), null, PageRequest.of(0, 20));
        Assertions.assertEquals(1, fg2Only.summary().productionOrders());
        Assertions.assertEquals(otherWh.getOrderNumber(), fg2Only.orders().content().get(0).orderNumber());

        ProductionSummaryReportResponse sourceOnly = reportService.getReport(
                orgId, from, to, null, sourceWarehouse.getId(), null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(4, sourceOnly.summary().productionOrders());

        byte[] csv = reportService.exportCsv(orgId, from, to, null, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains(partial.getOrderNumber()));
        Assertions.assertTrue(text.contains("Wooden Table"));
        Assertions.assertTrue(text.contains("IN_PROGRESS"));
        Assertions.assertFalse(text.contains(cancelled.getOrderNumber()));

        ProductionSummaryReportResponse other = reportService.getReport(
                otherOrgId, from, to, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().productionOrders());
        Assertions.assertEquals(0, other.orders().totalElements());
        Assertions.assertTrue(other.byProduct().isEmpty());
    }
}
