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
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.*;
import si.plaan.service.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class ProductionReceiptTests {

    @Autowired
    private ProductionReceiptService productionReceiptService;

    @Autowired
    private MaterialIssueService materialIssueService;

    @Autowired
    private MaterialConsumptionService materialConsumptionService;

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
    void testProductionReceiptFullLifecycle() {
        // 1. Create order for 10 tables -> Requires 10 Boards, 160 Screws
        ProductionOrderResponse order = createAndReleaseOrder(10);
        Assertions.assertEquals(ProductionOrderStatus.RELEASED, order.getStatus());

        // Precondition 1: Cannot receive finished goods if order is not IN_PROGRESS
        Assertions.assertThrows(IllegalStateException.class, () ->
                productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                        .productionOrderId(order.getId())
                        .receiptDate(LocalDate.now())
                        .receiptQuantity(new BigDecimal("6"))
                        .build())
        );

        // Issue materials to move order to IN_PROGRESS
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

        // Precondition 2: Cannot receive finished goods before raw materials have been consumed
        IllegalStateException noConsumptionEx = Assertions.assertThrows(IllegalStateException.class, () ->
                productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                        .productionOrderId(order.getId())
                        .receiptDate(LocalDate.now())
                        .receiptQuantity(new BigDecimal("6"))
                        .build())
        );
        Assertions.assertTrue(noConsumptionEx.getMessage().contains("Cannot record production receipt before raw materials have been consumed"));

        // Consume raw materials (10 boards, 150 screws)
        materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                .productionOrderId(order.getId())
                .consumptionDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialConsumptionItemRequest.builder().materialId(boardItem.getId()).consumedQuantity(new BigDecimal("10")).build(),
                        MaterialConsumptionItemRequest.builder().materialId(screwItem.getId()).consumedQuantity(new BigDecimal("150")).build()
                ))
                .build());

        // Now test sequence number generation
        String nextPr = productionReceiptService.getNextReceiptNumber(orgId);
        Assertions.assertEquals("PR-001", nextPr);

        // Cannot receive quantity > pending quantity (10)
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                        .productionOrderId(order.getId())
                        .receiptDate(LocalDate.now())
                        .receiptQuantity(new BigDecimal("11"))
                        .build())
        );

        // 2. Create partial draft receipt PR-001 for 6 tables
        ProductionReceiptResponse draft1 = productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                .productionOrderId(order.getId())
                .receiptDate(LocalDate.now())
                .receiptQuantity(new BigDecimal("5"))
                .notes("Partial test draft")
                .postImmediately(false)
                .build());
        Assertions.assertEquals(ProductionReceiptStatus.DRAFT, draft1.getStatus());
        Assertions.assertEquals(new BigDecimal("5"), draft1.getReceiptQuantity());

        // Draft should not affect stock or order received quantity
        ProductionOrderResponse orderAfterDraft = productionOrderService.getProductionOrderById(orgId, order.getId());
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(orderAfterDraft.getReceivedQuantity()));

        // Update draft to 6 tables
        ProductionReceiptResponse updatedDraft = productionReceiptService.updateProductionReceipt(orgId, draft1.getId(), UpdateProductionReceiptRequest.builder()
                .receiptDate(LocalDate.now())
                .receiptQuantity(new BigDecimal("6"))
                .notes("Updated to 6 tables")
                .postImmediately(false)
                .build());
        Assertions.assertEquals(new BigDecimal("6"), updatedDraft.getReceiptQuantity());

        // Post receipt PR-001
        ProductionReceiptResponse postedPr1 = productionReceiptService.postProductionReceipt(orgId, draft1.getId());
        Assertions.assertEquals(ProductionReceiptStatus.POSTED, postedPr1.getStatus());
        Assertions.assertEquals(new BigDecimal("6"), postedPr1.getReceiptQuantity());

        // Check order receivedQuantity and pending
        ProductionOrderResponse orderAfterPost1 = productionOrderService.getProductionOrderById(orgId, order.getId());
        Assertions.assertEquals(0, new BigDecimal("6").compareTo(orderAfterPost1.getReceivedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("4").compareTo(orderAfterPost1.getPendingProductionQuantity()));
        Assertions.assertEquals(0, new BigDecimal("60.00").compareTo(orderAfterPost1.getProductionProgress()));
        Assertions.assertEquals(ProductionOrderStatus.IN_PROGRESS, orderAfterPost1.getStatus());

        // Check stock overview for FG Warehouse: 6 tables present!
        StockLedgerResponse fgLedger = inventoryService.getStockLedger(orgId, productItem.getId(), fgWarehouse.getId());
        Assertions.assertEquals(1, fgLedger.movements().size());
        StockLedgerEntryResponse ledgerEntry = fgLedger.movements().get(0);
        Assertions.assertEquals("Production Receipt", ledgerEntry.transactionType());
        Assertions.assertEquals(0, new BigDecimal("6").compareTo(ledgerEntry.quantityIn()));
        Assertions.assertEquals(0, new BigDecimal("6").compareTo(ledgerEntry.runningBalance()));
        Assertions.assertEquals(postedPr1.getId(), ledgerEntry.productionReceiptId());

        // Check that raw materials in source warehouse were NOT deducted again by the receipt
        StockLedgerResponse boardLedger = inventoryService.getStockLedger(orgId, boardItem.getId(), sourceWarehouse.getId());
        // Remaining in source warehouse is 50 - 10 = 40 (from material issue, unchanged by production receipt)
        Assertions.assertEquals(0, new BigDecimal("40").compareTo(boardLedger.closingBalance()));

        // Cannot cancel order with posted production receipts
        IllegalStateException cancelEx = Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.cancelProductionOrder(orgId, order.getId())
        );
        Assertions.assertTrue(cancelEx.getMessage().contains("posted material or receipt transactions"));

        // 3. Post second receipt PR-002 for remaining 4 tables directly
        ProductionReceiptResponse pr2 = productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                .productionOrderId(order.getId())
                .receiptDate(LocalDate.now())
                .receiptQuantity(new BigDecimal("4"))
                .notes("Remaining 4 tables completed")
                .postImmediately(true)
                .build());
        Assertions.assertEquals(ProductionReceiptStatus.POSTED, pr2.getStatus());

        ProductionOrderResponse orderAfterPost2 = productionOrderService.getProductionOrderById(orgId, order.getId());
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(orderAfterPost2.getReceivedQuantity()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(orderAfterPost2.getPendingProductionQuantity()));
        Assertions.assertEquals(0, new BigDecimal("100.00").compareTo(orderAfterPost2.getProductionProgress()));
        // Requirement: Order remains IN_PROGRESS until formal completion in next feature
        Assertions.assertEquals(ProductionOrderStatus.IN_PROGRESS, orderAfterPost2.getStatus());

        // Check FG Ledger closing balance is now 10
        StockLedgerResponse fgLedgerFinal = inventoryService.getStockLedger(orgId, productItem.getId(), fgWarehouse.getId());
        Assertions.assertEquals(2, fgLedgerFinal.movements().size());
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(fgLedgerFinal.closingBalance()));

        // Attempting another receipt now fails as pending quantity is 0
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                        .productionOrderId(order.getId())
                        .receiptDate(LocalDate.now())
                        .receiptQuantity(BigDecimal.ONE)
                        .build())
        );

        // 4. Multi-tenancy isolation
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                productionReceiptService.getProductionReceiptById(otherOrgId, pr2.getId())
        );
    }
}
