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
public class MaterialConsumptionReportTests {

    @Autowired private MaterialConsumptionReportService reportService;
    @Autowired private ProductionOrderService productionOrderService;
    @Autowired private MaterialIssueService materialIssueService;
    @Autowired private MaterialConsumptionService materialConsumptionService;
    @Autowired private MaterialReturnService materialReturnService;
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
    private Item tableItem;
    private Item boardItem;
    private Item screwItem;

    @BeforeEach
    void setup() {
        Organization org = organizationRepository.save(Organization.builder()
                .name("MCR Org-" + UUID.randomUUID())
                .slug("mcr-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());
        orgId = org.getId();

        Organization otherOrg = organizationRepository.save(Organization.builder()
                .name("MCR Other-" + UUID.randomUUID())
                .slug("mcr-o-" + UUID.randomUUID())
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

        bomService.createBom(orgId, CreateBomRequest.builder()
                .productId(tableItem.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        BomItemRequest.builder().materialId(boardItem.getId()).quantity(BigDecimal.ONE).build(),
                        BomItemRequest.builder().materialId(screwItem.getId()).quantity(new BigDecimal("16")).build()
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

    private ProductionOrderResponse createReleased(int qty, LocalDate orderDate) {
        return productionOrderService.createProductionOrder(orgId, CreateProductionOrderRequest.builder()
                .orderDate(orderDate)
                .productId(tableItem.getId())
                .productionQuantity(new BigDecimal(qty))
                .sourceWarehouseId(sourceWarehouse.getId())
                .finishedGoodsWarehouseId(fgWarehouse.getId())
                .releaseImmediately(true)
                .build());
    }

    @Test
    public void testQuantitiesFiltersUnreconciledAndIsolation() {
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 30);

        ProductionOrderResponse order = createReleased(10, LocalDate.of(2026, 11, 5));
        // Required: boards 10, screws 160
        materialIssueService.createMaterialIssue(orgId, CreateMaterialIssueRequest.builder()
                .productionOrderId(order.getId())
                .issueDate(LocalDate.of(2026, 11, 6))
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(boardItem.getId()).issueQuantity(new BigDecimal("10")).build(),
                        MaterialIssueItemRequest.builder().materialId(screwItem.getId()).issueQuantity(new BigDecimal("160")).build()
                ))
                .build());

        materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                .productionOrderId(order.getId())
                .consumptionDate(LocalDate.of(2026, 11, 7))
                .postImmediately(true)
                .items(List.of(
                        MaterialConsumptionItemRequest.builder().materialId(boardItem.getId()).consumedQuantity(new BigDecimal("10")).build(),
                        MaterialConsumptionItemRequest.builder().materialId(screwItem.getId()).consumedQuantity(new BigDecimal("140")).build()
                ))
                .build());

        materialReturnService.createMaterialReturn(orgId, CreateMaterialReturnRequest.builder()
                .productionOrderId(order.getId())
                .returnDate(LocalDate.of(2026, 11, 8))
                .postImmediately(true)
                .items(List.of(
                        MaterialReturnItemRequest.builder().materialId(screwItem.getId()).returnQuantity(new BigDecimal("10")).build()
                ))
                .build());

        ProductionOrderResponse releasedOnly = createReleased(5, LocalDate.of(2026, 11, 12));
        // Out of range / excluded
        createReleased(3, LocalDate.of(2026, 10, 1));
        productionOrderService.createProductionOrder(orgId, CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.of(2026, 11, 15))
                .productId(tableItem.getId())
                .productionQuantity(BigDecimal.ONE)
                .sourceWarehouseId(sourceWarehouse.getId())
                .finishedGoodsWarehouseId(fgWarehouse.getId())
                .releaseImmediately(false)
                .build());
        ProductionOrderResponse cancelled = createReleased(2, LocalDate.of(2026, 11, 18));
        productionOrderService.cancelProductionOrder(orgId, cancelled.getId());

        MaterialConsumptionReportResponse report = reportService.getReport(
                orgId, from, to, null, null, null, null, null, false, PageRequest.of(0, 20));

        Assertions.assertEquals(2, report.summary().productionOrders());
        Assertions.assertEquals(2, report.summary().uniqueMaterials());
        Assertions.assertEquals(1, report.summary().unreconciledLines());

        MaterialConsumptionGroupResponse inProgressGroup = report.orders().content().stream()
                .filter(g -> g.productionOrderId().equals(order.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(ProductionOrderStatus.IN_PROGRESS, inProgressGroup.status());
        Assertions.assertEquals(2, inProgressGroup.lines().size());

        MaterialConsumptionLineResponse boardLine = inProgressGroup.lines().stream()
                .filter(l -> l.materialId().equals(boardItem.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(boardLine.requiredQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(boardLine.issuedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(boardLine.consumedQuantity()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(boardLine.returnedQuantity()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(boardLine.remainingQuantity()));
        Assertions.assertFalse(boardLine.unreconciled());

        MaterialConsumptionLineResponse screwLine = inProgressGroup.lines().stream()
                .filter(l -> l.materialId().equals(screwItem.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("160").compareTo(screwLine.requiredQuantity()));
        Assertions.assertEquals(0, new BigDecimal("160").compareTo(screwLine.issuedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("140").compareTo(screwLine.consumedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(screwLine.returnedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(screwLine.remainingQuantity()));
        Assertions.assertTrue(screwLine.unreconciled());

        MaterialConsumptionGroupResponse releasedGroup = report.orders().content().stream()
                .filter(g -> g.productionOrderId().equals(releasedOnly.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(ProductionOrderStatus.RELEASED, releasedGroup.status());
        Assertions.assertTrue(releasedGroup.lines().stream()
                .allMatch(l -> l.issuedQuantity().compareTo(BigDecimal.ZERO) == 0));

        MaterialConsumptionReportResponse unreconciledOnly = reportService.getReport(
                orgId, from, to, null, null, null, null, null, true, PageRequest.of(0, 20));
        Assertions.assertEquals(1, unreconciledOnly.summary().productionOrders());
        Assertions.assertEquals(1, unreconciledOnly.summary().uniqueMaterials());
        Assertions.assertEquals(1, unreconciledOnly.summary().unreconciledLines());
        Assertions.assertEquals(1, unreconciledOnly.orders().content().get(0).lines().size());
        Assertions.assertEquals(screwItem.getId(), unreconciledOnly.orders().content().get(0).lines().get(0).materialId());

        MaterialConsumptionReportResponse screwFilter = reportService.getReport(
                orgId, from, to, null, null, screwItem.getId(), null, null, false, PageRequest.of(0, 20));
        Assertions.assertEquals(2, screwFilter.summary().productionOrders());
        Assertions.assertTrue(screwFilter.orders().content().stream()
                .flatMap(g -> g.lines().stream())
                .allMatch(l -> l.materialId().equals(screwItem.getId())));

        MaterialConsumptionReportResponse orderFilter = reportService.getReport(
                orgId, from, to, order.getId(), null, null, null, null, false, PageRequest.of(0, 20));
        Assertions.assertEquals(1, orderFilter.summary().productionOrders());
        Assertions.assertEquals(order.getOrderNumber(), orderFilter.orders().content().get(0).orderNumber());

        MaterialConsumptionReportResponse productFilter = reportService.getReport(
                orgId, from, to, null, tableItem.getId(), null, null, null, false, PageRequest.of(0, 20));
        Assertions.assertEquals(2, productFilter.summary().productionOrders());

        MaterialConsumptionReportResponse warehouseFilter = reportService.getReport(
                orgId, from, to, null, null, null, sourceWarehouse.getId(), null, false, PageRequest.of(0, 20));
        Assertions.assertEquals(2, warehouseFilter.summary().productionOrders());

        MaterialConsumptionReportResponse statusFilter = reportService.getReport(
                orgId, from, to, null, null, null, null, ProductionOrderStatus.RELEASED, false, PageRequest.of(0, 20));
        Assertions.assertEquals(1, statusFilter.summary().productionOrders());
        Assertions.assertEquals(0, statusFilter.summary().unreconciledLines());

        byte[] csv = reportService.exportCsv(orgId, from, to, null, null, null, null, null, false);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains(order.getOrderNumber()));
        Assertions.assertTrue(text.contains("Screws"));
        Assertions.assertTrue(text.contains("Wooden Board"));
        Assertions.assertFalse(text.contains(cancelled.getOrderNumber()));

        // Align with Production Order details
        ProductionOrderResponse details = productionOrderService.getProductionOrderById(orgId, order.getId());
        ProductionOrderItemResponse detailScrew = details.getItems().stream()
                .filter(i -> i.getMaterialId().equals(screwItem.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, detailScrew.getRemainingQuantity().compareTo(screwLine.remainingQuantity()));
        Assertions.assertEquals(0, detailScrew.getIssuedQuantity().compareTo(screwLine.issuedQuantity()));
        Assertions.assertEquals(0, detailScrew.getConsumedQuantity().compareTo(screwLine.consumedQuantity()));
        Assertions.assertEquals(0, detailScrew.getReturnedQuantity().compareTo(screwLine.returnedQuantity()));

        MaterialConsumptionReportResponse other = reportService.getReport(
                otherOrgId, from, to, null, null, null, null, null, false, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().productionOrders());
        Assertions.assertEquals(0, other.orders().totalElements());
    }
}
