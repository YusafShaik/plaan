package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.BomItemRequest;
import si.plaan.dto.request.CreateBomRequest;
import si.plaan.dto.request.CreateMaterialIssueRequest;
import si.plaan.dto.request.CreateOpeningStockRequest;
import si.plaan.dto.request.CreateProductionOrderRequest;
import si.plaan.dto.request.MaterialIssueItemRequest;
import si.plaan.dto.request.OpeningStockItemRequest;
import si.plaan.dto.request.UpdateMaterialIssueRequest;
import si.plaan.dto.response.MaterialIssueResponse;
import si.plaan.dto.response.ProductionOrderAvailabilityResponse;
import si.plaan.dto.response.ProductionOrderResponse;
import si.plaan.dto.response.StockLedgerResponse;
import si.plaan.dto.response.StockOverviewItemResponse;
import si.plaan.entity.Item;
import si.plaan.entity.ItemType;
import si.plaan.entity.MaterialIssueStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.entity.Warehouse;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.ItemTypeRepository;
import si.plaan.repository.MaterialIssueRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.ProductionOrderRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.repository.WarehouseRepository;
import si.plaan.service.BomService;
import si.plaan.service.InventoryService;
import si.plaan.service.MaterialIssueService;
import si.plaan.service.OpeningStockService;
import si.plaan.service.ProductionOrderService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class MaterialIssueTests {

    @Autowired
    private MaterialIssueService materialIssueService;

    @Autowired
    private MaterialIssueRepository materialIssueRepository;

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

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private Organization orgA;
    private Organization orgB;

    private Item woodenTable;
    private Item woodenBoard;
    private Item woodenLegs;
    private Item screws;

    private Warehouse rawMaterialStore;
    private Warehouse fgStore;

    private Warehouse whB;
    private Item itemB;

    private ProductionOrderResponse orderA;

    @BeforeEach
    void setUp() {
        orgA = organizationRepository.save(Organization.builder()
                .name("Issue Org A " + UUID.randomUUID())
                .slug("issue-org-a-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());

        orgB = organizationRepository.save(Organization.builder()
                .name("Issue Org B " + UUID.randomUUID())
                .slug("issue-org-b-" + UUID.randomUUID())
                .baseCurrency("EUR")
                .active(true)
                .build());

        ItemType finishedGoodType = itemTypeRepository.save(ItemType.builder()
                .organization(orgA)
                .name("Finished Goods")
                .description("Manufactured Products")
                .build());

        ItemType rawMaterialType = itemTypeRepository.save(ItemType.builder()
                .organization(orgA)
                .name("Raw Materials")
                .description("Component materials")
                .build());

        woodenTable = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemType(finishedGoodType)
                .itemCode("ITM-TBL-001")
                .name("Wooden Table")
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        woodenBoard = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemType(rawMaterialType)
                .itemCode("ITM-BRD-001")
                .name("Wooden Board")
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        woodenLegs = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemType(rawMaterialType)
                .itemCode("ITM-LEG-001")
                .name("Wooden Legs")
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        screws = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemType(rawMaterialType)
                .itemCode("ITM-SCR-001")
                .name("Screws")
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        rawMaterialStore = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("WH-RAW")
                .name("Raw Material Store")
                .active(true)
                .build());

        fgStore = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("WH-FG")
                .name("Finished Goods Store")
                .active(true)
                .build());

        // Org B setup
        ItemType typeB = itemTypeRepository.save(ItemType.builder()
                .organization(orgB)
                .name("Raw Materials B")
                .build());

        itemB = itemRepository.save(Item.builder()
                .organization(orgB)
                .itemType(typeB)
                .itemCode("ITM-B-RAW")
                .name("Material B")
                .unitOfMeasure("kg")
                .active(true)
                .build());

        whB = warehouseRepository.save(Warehouse.builder()
                .organization(orgB)
                .warehouseCode("WH-B-RAW")
                .name("Warehouse B")
                .active(true)
                .build());

        // Recipe: 1 Table = 1 Board, 4 Legs, 16 Screws
        bomService.createBom(orgA.getId(), CreateBomRequest.builder()
                .bomCode("BOM-TBL-001")
                .productId(woodenTable.getId())
                .outputQuantity(BigDecimal.ONE)
                .items(List.of(
                        BomItemRequest.builder().materialId(woodenBoard.getId()).quantity(new BigDecimal("1.0000")).build(),
                        BomItemRequest.builder().materialId(woodenLegs.getId()).quantity(new BigDecimal("4.0000")).build(),
                        BomItemRequest.builder().materialId(screws.getId()).quantity(new BigDecimal("16.0000")).build()
                ))
                .saveAndActivate(true)
                .build());

        // Stock in rawMaterialStore:
        // Wooden Board: 20 Nos
        // Wooden Legs: 60 Nos
        // Screws: 500 Nos
        openingStockService.createOpeningStock(orgA.getId(), CreateOpeningStockRequest.builder()
                .openingStockNumber("OS-INIT-01")
                .openingDate(LocalDate.now())
                .warehouseId(rawMaterialStore.getId())
                .items(List.of(
                        OpeningStockItemRequest.builder().itemId(woodenBoard.getId()).quantity(new BigDecimal("20.0000")).build(),
                        OpeningStockItemRequest.builder().itemId(woodenLegs.getId()).quantity(new BigDecimal("60.0000")).build(),
                        OpeningStockItemRequest.builder().itemId(screws.getId()).quantity(new BigDecimal("500.0000")).build()
                ))
                .postImmediately(true)
                .build());

        // Create Released Production Order for 10 Tables
        // Required: 10 Boards, 40 Legs, 160 Screws
        orderA = productionOrderService.createProductionOrder(orgA.getId(), CreateProductionOrderRequest.builder()
                .orderNumber("MO-001")
                .orderDate(LocalDate.now())
                .productId(woodenTable.getId())
                .productionQuantity(new BigDecimal("10.0000"))
                .sourceWarehouseId(rawMaterialStore.getId())
                .finishedGoodsWarehouseId(fgStore.getId())
                .releaseImmediately(true)
                .build());
    }

    @Test
    void testNextIssueNumberFormat() {
        String num1 = materialIssueService.getNextMaterialIssueNumber(orgA.getId());
        Assertions.assertEquals("MI-001", num1);
    }

    @Test
    void testCreateDraftAndEditIssueWithoutAffectingInventory() {
        long countBefore = stockMovementRepository.count();

        CreateMaterialIssueRequest createReq = CreateMaterialIssueRequest.builder()
                .issueNumber("MI-001")
                .issueDate(LocalDate.now())
                .productionOrderId(orderA.getId())
                .postImmediately(false)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(woodenBoard.getId()).issueQuantity(new BigDecimal("5.0000")).build()
                ))
                .build();

        MaterialIssueResponse draft = materialIssueService.createMaterialIssue(orgA.getId(), createReq);
        Assertions.assertNotNull(draft);
        Assertions.assertEquals(MaterialIssueStatus.DRAFT, draft.getStatus());
        Assertions.assertEquals(countBefore, stockMovementRepository.count(), "Draft must not create stock movements");

        // Edit draft
        UpdateMaterialIssueRequest updateReq = UpdateMaterialIssueRequest.builder()
                .issueDate(LocalDate.now())
                .notes("Updated draft")
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(woodenBoard.getId()).issueQuantity(new BigDecimal("8.0000")).build()
                ))
                .postImmediately(false)
                .build();

        MaterialIssueResponse updated = materialIssueService.updateMaterialIssue(orgA.getId(), draft.getId(), updateReq);
        Assertions.assertEquals(new BigDecimal("8.0000"), updated.getItems().get(0).getIssueQuantity());
        Assertions.assertEquals(countBefore, stockMovementRepository.count());

        // Delete draft
        materialIssueService.deleteDraftMaterialIssue(orgA.getId(), draft.getId());
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                materialIssueService.getMaterialIssueById(orgA.getId(), draft.getId())
        );
    }

    @Test
    void testPostMaterialIssueAtomicallyUpdatesInventoryAndOrderStatus() {
        // Post issue: 10 Boards, 40 Legs, 160 Screws
        MaterialIssueResponse posted = materialIssueService.createMaterialIssue(orgA.getId(), CreateMaterialIssueRequest.builder()
                .issueNumber("MI-001")
                .issueDate(LocalDate.now())
                .productionOrderId(orderA.getId())
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(woodenBoard.getId()).issueQuantity(new BigDecimal("10.0000")).build(),
                        MaterialIssueItemRequest.builder().materialId(woodenLegs.getId()).issueQuantity(new BigDecimal("40.0000")).build(),
                        MaterialIssueItemRequest.builder().materialId(screws.getId()).issueQuantity(new BigDecimal("160.0000")).build()
                ))
                .build());

        Assertions.assertEquals(MaterialIssueStatus.POSTED, posted.getStatus());

        // 1. Verify Production Order status transitioned to IN_PROGRESS
        ProductionOrderResponse updatedOrder = productionOrderService.getProductionOrderById(orgA.getId(), orderA.getId());
        Assertions.assertEquals(ProductionOrderStatus.IN_PROGRESS, updatedOrder.getStatus());

        // 2. Verify issued and pending quantities on order
        for (var it : updatedOrder.getItems()) {
            if (it.getMaterialId().equals(woodenBoard.getId())) {
                Assertions.assertEquals(0, new BigDecimal("10.0000").compareTo(it.getIssuedQuantity()));
                Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(it.getPendingQuantity()));
            } else if (it.getMaterialId().equals(woodenLegs.getId())) {
                Assertions.assertEquals(0, new BigDecimal("40.0000").compareTo(it.getIssuedQuantity()));
                Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(it.getPendingQuantity()));
            } else if (it.getMaterialId().equals(screws.getId())) {
                Assertions.assertEquals(0, new BigDecimal("160.0000").compareTo(it.getIssuedQuantity()));
                Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(it.getPendingQuantity()));
            }
        }

        // 3. Verify warehouse on-hand stock updated
        BigDecimal boardStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), woodenBoard.getId(), rawMaterialStore.getId());
        BigDecimal legStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), woodenLegs.getId(), rawMaterialStore.getId());
        BigDecimal screwStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), screws.getId(), rawMaterialStore.getId());

        Assertions.assertEquals(0, new BigDecimal("10.0000").compareTo(boardStock)); // 20 - 10 = 10
        Assertions.assertEquals(0, new BigDecimal("20.0000").compareTo(legStock));   // 60 - 40 = 20
        Assertions.assertEquals(0, new BigDecimal("340.0000").compareTo(screwStock)); // 500 - 160 = 340

        // 4. Verify Stock Ledger has "Material Issue" entries
        StockLedgerResponse ledger = inventoryService.getStockLedger(orgA.getId(), woodenLegs.getId(), rawMaterialStore.getId());
        Assertions.assertNotNull(ledger);
        var legMovements = ledger.movements();
        Assertions.assertTrue(legMovements.size() >= 2);
        var issueMovement = legMovements.get(legMovements.size() - 1);
        Assertions.assertEquals("MI-001", issueMovement.referenceNumber());
        Assertions.assertEquals("Material Issue", issueMovement.transactionType());
        Assertions.assertEquals(new BigDecimal("40.0000"), issueMovement.quantityOut());
        Assertions.assertEquals(new BigDecimal("20.0000"), issueMovement.runningBalance());

        // 5. Verify Material Availability Check compares against remaining (pending) quantity
        ProductionOrderAvailabilityResponse avail = productionOrderService.checkMaterialAvailability(orgA.getId(), orderA.getId());
        Assertions.assertEquals("ALL_MATERIALS_AVAILABLE", avail.getOverallAvailability());
        Assertions.assertEquals(0, avail.getShortageCount());
    }

    @Test
    void testPartialAndMultipleMaterialIssues() {
        // Step 1: Issue 25 wooden legs out of 40 required
        MaterialIssueResponse mi1 = materialIssueService.createMaterialIssue(orgA.getId(), CreateMaterialIssueRequest.builder()
                .issueNumber("MI-001")
                .issueDate(LocalDate.now())
                .productionOrderId(orderA.getId())
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(woodenLegs.getId()).issueQuantity(new BigDecimal("25.0000")).build()
                ))
                .build());
        Assertions.assertEquals(MaterialIssueStatus.POSTED, mi1.getStatus());

        ProductionOrderResponse orderAfter1 = productionOrderService.getProductionOrderById(orgA.getId(), orderA.getId());
        var legsAfter1 = orderAfter1.getItems().stream().filter(i -> i.getMaterialId().equals(woodenLegs.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("25.0000").compareTo(legsAfter1.getIssuedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("15.0000").compareTo(legsAfter1.getPendingQuantity())); // 40 - 25 = 15

        // Step 2: Issue 10 more wooden legs (leaving 5 pending)
        MaterialIssueResponse mi2 = materialIssueService.createMaterialIssue(orgA.getId(), CreateMaterialIssueRequest.builder()
                .issueNumber("MI-002")
                .issueDate(LocalDate.now())
                .productionOrderId(orderA.getId())
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(woodenLegs.getId()).issueQuantity(new BigDecimal("10.0000")).build()
                ))
                .build());
        Assertions.assertEquals(MaterialIssueStatus.POSTED, mi2.getStatus());

        ProductionOrderResponse orderAfter2 = productionOrderService.getProductionOrderById(orgA.getId(), orderA.getId());
        var legsAfter2 = orderAfter2.getItems().stream().filter(i -> i.getMaterialId().equals(woodenLegs.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("35.0000").compareTo(legsAfter2.getIssuedQuantity())); // 25 + 10 = 35
        Assertions.assertEquals(0, new BigDecimal("5.0000").compareTo(legsAfter2.getPendingQuantity()));  // 40 - 35 = 5

        // Step 3: Trying to issue 10 more when only 5 are pending must throw error
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                materialIssueService.createMaterialIssue(orgA.getId(), CreateMaterialIssueRequest.builder()
                        .issueNumber("MI-003")
                        .issueDate(LocalDate.now())
                        .productionOrderId(orderA.getId())
                        .postImmediately(true)
                        .items(List.of(
                                MaterialIssueItemRequest.builder().materialId(woodenLegs.getId()).issueQuantity(new BigDecimal("10.0000")).build()
                        ))
                        .build())
        );
    }

    @Test
    void testPreventIssuingMoreThanWarehouseStock() {
        // Warehouse stock for woodenBoard is 20. If requirement was 50 and user requests 30, it fails.
        // Even if requirement is 10, requesting 25 exceeds warehouse stock (and exceeds pending)
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                materialIssueService.createMaterialIssue(orgA.getId(), CreateMaterialIssueRequest.builder()
                        .issueNumber("MI-FAIL-01")
                        .issueDate(LocalDate.now())
                        .productionOrderId(orderA.getId())
                        .postImmediately(true)
                        .items(List.of(
                                MaterialIssueItemRequest.builder().materialId(woodenBoard.getId()).issueQuantity(new BigDecimal("25.0000")).build()
                        ))
                        .build())
        );
    }

    @Test
    void testPreventDuplicatePostingAndEditingPostedIssue() {
        MaterialIssueResponse draft = materialIssueService.createMaterialIssue(orgA.getId(), CreateMaterialIssueRequest.builder()
                .issueNumber("MI-001")
                .issueDate(LocalDate.now())
                .productionOrderId(orderA.getId())
                .postImmediately(false)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(woodenBoard.getId()).issueQuantity(new BigDecimal("5.0000")).build()
                ))
                .build());

        // First post succeeds
        materialIssueService.postMaterialIssue(orgA.getId(), draft.getId());

        // Duplicate post throws IllegalStateException
        Assertions.assertThrows(IllegalStateException.class, () ->
                materialIssueService.postMaterialIssue(orgA.getId(), draft.getId())
        );

        // Edit posted issue throws IllegalStateException
        Assertions.assertThrows(IllegalStateException.class, () ->
                materialIssueService.updateMaterialIssue(orgA.getId(), draft.getId(), UpdateMaterialIssueRequest.builder()
                        .issueDate(LocalDate.now())
                        .items(List.of(
                                MaterialIssueItemRequest.builder().materialId(woodenBoard.getId()).issueQuantity(new BigDecimal("6.0000")).build()
                        ))
                        .build())
        );

        // Delete posted issue throws IllegalStateException
        Assertions.assertThrows(IllegalStateException.class, () ->
                materialIssueService.deleteDraftMaterialIssue(orgA.getId(), draft.getId())
        );
    }

    @Test
    void testPreventCancellingProductionOrderWithPostedIssues() {
        materialIssueService.createMaterialIssue(orgA.getId(), CreateMaterialIssueRequest.builder()
                .issueNumber("MI-001")
                .issueDate(LocalDate.now())
                .productionOrderId(orderA.getId())
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(woodenBoard.getId()).issueQuantity(new BigDecimal("2.0000")).build()
                ))
                .build());

        // Production order cannot be cancelled directly
        Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.cancelProductionOrder(orgA.getId(), orderA.getId())
        );
    }

    @Test
    void testTenantIsolation() {
        // Org B cannot access Org A's production order to issue materials
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                materialIssueService.createMaterialIssue(orgB.getId(), CreateMaterialIssueRequest.builder()
                        .issueDate(LocalDate.now())
                        .productionOrderId(orderA.getId())
                        .items(List.of(
                                MaterialIssueItemRequest.builder().materialId(woodenBoard.getId()).issueQuantity(BigDecimal.ONE).build()
                        ))
                        .build())
        );
    }
}
