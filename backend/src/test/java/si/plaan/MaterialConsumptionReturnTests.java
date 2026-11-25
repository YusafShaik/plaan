package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.*;
import si.plaan.dto.response.*;
import si.plaan.entity.*;
import si.plaan.repository.*;
import si.plaan.service.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class MaterialConsumptionReturnTests {

    @Autowired
    private MaterialIssueService materialIssueService;

    @Autowired
    private MaterialConsumptionService materialConsumptionService;

    @Autowired
    private MaterialReturnService materialReturnService;

    @Autowired
    private ProductionOrderService productionOrderService;

    @Autowired
    private ProductionOrderRepository productionOrderRepository;

    @Autowired
    private BomService bomService;

    @Autowired
    private OpeningStockService openingStockService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    private Long orgId;
    private Long otherOrgId;
    private Warehouse sourceWarehouse;
    private Warehouse fgWarehouse;
    private Item productItem;
    private Item boardItem;
    private Item screwItem;

    @BeforeEach
    void setup() {
        Organization org = organizationRepository.save(Organization.builder()
                .name("Org-" + UUID.randomUUID())
                .slug("org-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());
        orgId = org.getId();

        Organization otherOrg = organizationRepository.save(Organization.builder()
                .name("OtherOrg-" + UUID.randomUUID())
                .slug("other-org-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());
        otherOrgId = otherOrg.getId();

        ItemType rawType = itemTypeRepository.save(ItemType.builder()
                .organization(org)
                .name("Raw Material")
                .description("Raw components")
                .build());

        ItemType fgType = itemTypeRepository.save(ItemType.builder()
                .organization(org)
                .name("Finished Goods")
                .description("Manufactured goods")
                .build());

        productItem = itemRepository.save(Item.builder()
                .organization(org)
                .name("Wooden Table")
                .itemCode("FG-TBL-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(fgType)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        boardItem = itemRepository.save(Item.builder()
                .organization(org)
                .name("Wooden Board")
                .itemCode("RAW-BRD-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(rawType)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        screwItem = itemRepository.save(Item.builder()
                .organization(org)
                .name("Screws")
                .itemCode("RAW-SCR-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(rawType)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        sourceWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org)
                .name("Raw Material Store")
                .warehouseCode("RMS-" + UUID.randomUUID().toString().substring(0, 4))
                .active(true)
                .build());

        fgWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org)
                .name("Finished Goods Store")
                .warehouseCode("FGS-" + UUID.randomUUID().toString().substring(0, 4))
                .active(true)
                .build());

        // Create Active BOM: 1 Table requires 1 Board + 16 Screws
        bomService.createBom(orgId, CreateBomRequest.builder()
                .productId(productItem.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        BomItemRequest.builder().materialId(boardItem.getId()).quantity(BigDecimal.ONE).build(),
                        BomItemRequest.builder().materialId(screwItem.getId()).quantity(new BigDecimal("16")).build()
                ))
                .build());

        // Seed Warehouse Stock: 50 Boards, 500 Screws
        openingStockService.createOpeningStock(orgId, CreateOpeningStockRequest.builder()
                .warehouseId(sourceWarehouse.getId())
                .openingDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        OpeningStockItemRequest.builder().itemId(boardItem.getId()).quantity(new BigDecimal("50")).build(),
                        OpeningStockItemRequest.builder().itemId(screwItem.getId()).quantity(new BigDecimal("500")).build()
                ))
                .build());
    }

    private ProductionOrderResponse createAndReleaseOrder(int tableQty) {
        return productionOrderService.createProductionOrder(orgId, CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(productItem.getId())
                .productionQuantity(new BigDecimal(tableQty))
                .sourceWarehouseId(sourceWarehouse.getId())
                .finishedGoodsWarehouseId(fgWarehouse.getId())
                .releaseImmediately(true)
                .build());
    }

    @Test
    void testMaterialConsumptionAndReturnFullLifecycle() {
        // 1. Create order for 10 tables -> Requires 10 Boards, 160 Screws
        ProductionOrderResponse order = createAndReleaseOrder(10);
        Assertions.assertEquals(ProductionOrderStatus.RELEASED, order.getStatus());

        // Cannot consume or return before materials are issued (order must be IN_PROGRESS)
        Assertions.assertThrows(IllegalStateException.class, () ->
                materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                        .productionOrderId(order.getId())
                        .consumptionDate(LocalDate.now())
                        .items(List.of(MaterialConsumptionItemRequest.builder().materialId(screwItem.getId()).consumedQuantity(new BigDecimal("100")).build()))
                        .build())
        );

        // 2. Issue 160 screws & 10 boards -> Order becomes IN_PROGRESS
        materialIssueService.createMaterialIssue(orgId, CreateMaterialIssueRequest.builder()
                .productionOrderId(order.getId())
                .issueDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(boardItem.getId()).issueQuantity(new BigDecimal("10")).build(),
                        MaterialIssueItemRequest.builder().materialId(screwItem.getId()).issueQuantity(new BigDecimal("160")).build()
                ))
                .build());

        ProductionOrderResponse inProgressOrder = productionOrderService.getProductionOrderById(orgId, order.getId());
        Assertions.assertEquals(ProductionOrderStatus.IN_PROGRESS, inProgressOrder.getStatus());

        // Screws in warehouse deducted: 500 - 160 = 340
        StockLedgerResponse ledgerAfterIssue = inventoryService.getStockLedger(orgId, screwItem.getId(), sourceWarehouse.getId());
        Assertions.assertEquals(0, new BigDecimal("340").compareTo(ledgerAfterIssue.closingBalance()));

        // 3. Record Material Consumption: 150 Screws consumed, 10 Boards consumed
        // Cannot consume > 160 screws
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                        .productionOrderId(order.getId())
                        .consumptionDate(LocalDate.now())
                        .postImmediately(true)
                        .items(List.of(MaterialConsumptionItemRequest.builder().materialId(screwItem.getId()).consumedQuantity(new BigDecimal("170")).build()))
                        .build())
        );

        MaterialConsumptionResponse consumption = materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                .productionOrderId(order.getId())
                .consumptionDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialConsumptionItemRequest.builder().materialId(boardItem.getId()).consumedQuantity(new BigDecimal("10")).build(),
                        MaterialConsumptionItemRequest.builder().materialId(screwItem.getId()).consumedQuantity(new BigDecimal("150")).build()
                ))
                .build());
        Assertions.assertEquals(MaterialConsumptionStatus.POSTED, consumption.getStatus());

        // IMPORTANT: Warehouse stock MUST NOT be deducted again! Still 340!
        StockLedgerResponse ledgerAfterConsumption = inventoryService.getStockLedger(orgId, screwItem.getId(), sourceWarehouse.getId());
        Assertions.assertEquals(0, new BigDecimal("340").compareTo(ledgerAfterConsumption.closingBalance()));

        // Order balances updated: Boards (10 issued, 10 consumed, 0 returned, 0 remaining)
        // Screws (160 issued, 150 consumed, 0 returned, 10 remaining)
        ProductionOrderResponse orderAfterCons = productionOrderService.getProductionOrderById(orgId, order.getId());
        ProductionOrderItemResponse screwItemResp = orderAfterCons.getItems().stream()
                .filter(i -> i.getMaterialId().equals(screwItem.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("160").compareTo(screwItemResp.getIssuedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("150").compareTo(screwItemResp.getConsumedQuantity()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(screwItemResp.getReturnedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(screwItemResp.getRemainingQuantity()));

        // 4. Return unused materials: 10 Screws returned to Raw Material Store
        // Cannot return > 10 screws
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                materialReturnService.createMaterialReturn(orgId, CreateMaterialReturnRequest.builder()
                        .productionOrderId(order.getId())
                        .returnDate(LocalDate.now())
                        .postImmediately(true)
                        .items(List.of(MaterialReturnItemRequest.builder().materialId(screwItem.getId()).returnQuantity(new BigDecimal("15")).build()))
                        .build())
        );

        MaterialReturnResponse returnResp = materialReturnService.createMaterialReturn(orgId, CreateMaterialReturnRequest.builder()
                .productionOrderId(order.getId())
                .returnDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialReturnItemRequest.builder().materialId(screwItem.getId()).returnQuantity(new BigDecimal("10")).build()
                ))
                .build());
        Assertions.assertEquals(MaterialReturnStatus.POSTED, returnResp.getStatus());

        // Warehouse stock increased by +10: 340 + 10 = 350
        StockLedgerResponse ledgerAfterReturn = inventoryService.getStockLedger(orgId, screwItem.getId(), sourceWarehouse.getId());
        Assertions.assertEquals(0, new BigDecimal("350").compareTo(ledgerAfterReturn.closingBalance()));

        // Check Stock Ledger entries: Contains "Material Return"
        boolean hasMaterialReturnEntry = ledgerAfterReturn.movements().stream()
                .anyMatch(e -> "Material Return".equals(e.transactionType()) && e.quantityIn() != null && e.quantityIn().compareTo(new BigDecimal("10")) == 0);
        Assertions.assertTrue(hasMaterialReturnEntry, "Stock Ledger should contain Material Return entry");

        // 5. Material Accountability: Remaining in production is now 0
        ProductionOrderResponse orderAfterReturn = productionOrderService.getProductionOrderById(orgId, order.getId());
        ProductionOrderItemResponse finalScrewItem = orderAfterReturn.getItems().stream()
                .filter(i -> i.getMaterialId().equals(screwItem.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("160").compareTo(finalScrewItem.getIssuedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("150").compareTo(finalScrewItem.getConsumedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(finalScrewItem.getReturnedQuantity()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(finalScrewItem.getRemainingQuantity()));

        // 6. Formula verification: Pending Issue = Max(0, Required - (Issued - Returned))
        // Required = 160, Issued = 160, Returned = 10 -> Net Issued = 150 -> Pending Issue = 10!
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(finalScrewItem.getPendingQuantity()));

        // We can now re-issue up to 10 returned screws!
        MaterialIssueResponse reissue = materialIssueService.createMaterialIssue(orgId, CreateMaterialIssueRequest.builder()
                .productionOrderId(order.getId())
                .issueDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(screwItem.getId()).issueQuantity(new BigDecimal("10")).build()
                ))
                .build());
        Assertions.assertEquals(MaterialIssueStatus.POSTED, reissue.getStatus());

        // 7. Verify unified Material Transaction History
        List<MaterialTransactionResponse> txHistory = productionOrderService.getMaterialTransactions(orgId, order.getId());
        Assertions.assertEquals(4, txHistory.size()); // 2 Issues, 1 Consumption, 1 Return
    }

    @Test
    void testPreventDuplicateAndConflictingPosting() {
        ProductionOrderResponse order = createAndReleaseOrder(5);
        materialIssueService.createMaterialIssue(orgId, CreateMaterialIssueRequest.builder()
                .productionOrderId(order.getId())
                .issueDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(screwItem.getId()).issueQuantity(new BigDecimal("80")).build()
                ))
                .build());

        // Draft consumption
        MaterialConsumptionResponse draftCons = materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                .productionOrderId(order.getId())
                .consumptionDate(LocalDate.now())
                .postImmediately(false)
                .items(List.of(MaterialConsumptionItemRequest.builder().materialId(screwItem.getId()).consumedQuantity(new BigDecimal("50")).build()))
                .build());

        // Post once
        materialConsumptionService.postMaterialConsumption(orgId, draftCons.getId());

        // Duplicate post throws
        Assertions.assertThrows(IllegalStateException.class, () ->
                materialConsumptionService.postMaterialConsumption(orgId, draftCons.getId())
        );

        // Cannot cancel order with posted transactions
        Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.cancelProductionOrder(orgId, order.getId())
        );
    }

    @Test
    void testTenantIsolation() {
        ProductionOrderResponse order = createAndReleaseOrder(2);
        materialIssueService.createMaterialIssue(orgId, CreateMaterialIssueRequest.builder()
                .productionOrderId(order.getId())
                .issueDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(screwItem.getId()).issueQuantity(new BigDecimal("32")).build()
                ))
                .build());

        MaterialConsumptionResponse cons = materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                .productionOrderId(order.getId())
                .consumptionDate(LocalDate.now())
                .postImmediately(false)
                .items(List.of(MaterialConsumptionItemRequest.builder().materialId(screwItem.getId()).consumedQuantity(new BigDecimal("20")).build()))
                .build());

        // Other tenant cannot access or post
        Assertions.assertThrows(Exception.class, () ->
                materialConsumptionService.getMaterialConsumptionById(otherOrgId, cons.getId())
        );
        Assertions.assertThrows(Exception.class, () ->
                materialConsumptionService.postMaterialConsumption(otherOrgId, cons.getId())
        );
    }
}
