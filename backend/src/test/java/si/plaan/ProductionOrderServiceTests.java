package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.BomItemRequest;
import si.plaan.dto.request.CreateBomRequest;
import si.plaan.dto.request.CreateProductionOrderRequest;
import si.plaan.dto.request.UpdateProductionOrderRequest;
import si.plaan.dto.response.BomResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.ProductionOrderItemResponse;
import si.plaan.dto.response.ProductionOrderResponse;
import si.plaan.entity.BomStatus;
import si.plaan.entity.Item;
import si.plaan.entity.ItemType;
import si.plaan.entity.Organization;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.entity.Warehouse;
import si.plaan.repository.BomRepository;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.ItemTypeRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.ProductionOrderRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.repository.WarehouseRepository;
import si.plaan.service.BomService;
import si.plaan.service.ProductionOrderService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class ProductionOrderServiceTests {

    @Autowired
    private ProductionOrderService productionOrderService;

    @Autowired
    private ProductionOrderRepository productionOrderRepository;

    @Autowired
    private BomService bomService;

    @Autowired
    private BomRepository bomRepository;

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

    private Item woodenTableA;
    private Item woodenBoardA;
    private Item woodenLegsA;
    private Item screwsA;

    private Warehouse rawStoreA;
    private Warehouse fgStoreA;

    private Warehouse whB;
    private Item productB;
    private Item materialB;

    private BomResponse activeBomA;

    @BeforeEach
    void setUp() {
        orgA = organizationRepository.save(Organization.builder()
                .name("Production Org A " + UUID.randomUUID())
                .slug("prod-org-a-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());

        orgB = organizationRepository.save(Organization.builder()
                .name("Production Org B " + UUID.randomUUID())
                .slug("prod-org-b-" + UUID.randomUUID())
                .baseCurrency("EUR")
                .active(true)
                .build());

        ItemType finishedGoodTypeA = itemTypeRepository.save(ItemType.builder()
                .organization(orgA)
                .name("Finished Good")
                .build());

        ItemType rawMaterialTypeA = itemTypeRepository.save(ItemType.builder()
                .organization(orgA)
                .name("Raw Material")
                .build());

        ItemType generalTypeB = itemTypeRepository.save(ItemType.builder()
                .organization(orgB)
                .name("General")
                .build());

        woodenTableA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("PRD-TAB-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Wooden Table")
                .itemType(finishedGoodTypeA)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        woodenBoardA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("MAT-BRD-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Wooden Board")
                .itemType(rawMaterialTypeA)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        woodenLegsA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("MAT-LEG-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Wooden Legs")
                .itemType(rawMaterialTypeA)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        screwsA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("MAT-SCR-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Screws")
                .itemType(rawMaterialTypeA)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        rawStoreA = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("RMS-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Raw Material Store")
                .active(true)
                .build());

        fgStoreA = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("FGS-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Finished Goods Store")
                .active(true)
                .build());

        productB = itemRepository.save(Item.builder()
                .organization(orgB)
                .itemCode("PRD-B-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Org B Product")
                .itemType(generalTypeB)
                .unitOfMeasure("kg")
                .active(true)
                .build());

        materialB = itemRepository.save(Item.builder()
                .organization(orgB)
                .itemCode("MAT-B-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Org B Material")
                .itemType(generalTypeB)
                .unitOfMeasure("kg")
                .active(true)
                .build());

        whB = warehouseRepository.save(Warehouse.builder()
                .organization(orgB)
                .warehouseCode("WH-B-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Org B Warehouse")
                .active(true)
                .build());

        // Create and activate standard BOM for Wooden Table (Output = 1 Nos)
        // 1 Wooden Board, 4 Wooden Legs, 16 Screws
        activeBomA = bomService.createBom(orgA.getId(), CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1)),
                        new BomItemRequest(woodenLegsA.getId(), BigDecimal.valueOf(4)),
                        new BomItemRequest(screwsA.getId(), BigDecimal.valueOf(16))
                ))
                .build());
    }

    @Test
    void test1_createProductionOrder_andVerifyAutoBOMAndMaterialCalculation() {
        // Manufacture 10 Wooden Tables
        CreateProductionOrderRequest req = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(10))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .plannedStartDate(LocalDate.now())
                .plannedEndDate(LocalDate.now().plusDays(5))
                .notes("Production batch 1")
                .releaseImmediately(false)
                .build();

        ProductionOrderResponse response = productionOrderService.createProductionOrder(orgA.getId(), req);

        Assertions.assertNotNull(response.getId());
        Assertions.assertTrue(response.getOrderNumber().startsWith("MO-"));
        Assertions.assertEquals(woodenTableA.getId(), response.getProductId());
        Assertions.assertEquals("Nos", response.getUnitOfMeasure());
        Assertions.assertEquals(activeBomA.getId(), response.getBomId());
        Assertions.assertEquals(activeBomA.getBomCode(), response.getBomCode());
        Assertions.assertEquals(BigDecimal.valueOf(10), response.getProductionQuantity());
        Assertions.assertEquals(ProductionOrderStatus.DRAFT, response.getStatus());
        Assertions.assertEquals(3, response.getTotalComponents());

        // Verify required quantities:
        // Output = 1, Production Qty = 10 -> Multiplier = 10
        // Board: 1 * 10 = 10
        // Legs: 4 * 10 = 40
        // Screws: 16 * 10 = 160
        ProductionOrderItemResponse boardItem = response.getItems().stream()
                .filter(i -> i.getMaterialId().equals(woodenBoardA.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, BigDecimal.valueOf(10).compareTo(boardItem.getRequiredQuantity()));

        ProductionOrderItemResponse legsItem = response.getItems().stream()
                .filter(i -> i.getMaterialId().equals(woodenLegsA.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, BigDecimal.valueOf(40).compareTo(legsItem.getRequiredQuantity()));

        ProductionOrderItemResponse screwsItem = response.getItems().stream()
                .filter(i -> i.getMaterialId().equals(screwsA.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, BigDecimal.valueOf(160).compareTo(screwsItem.getRequiredQuantity()));
    }

    @Test
    void test2_handleBomOutputQuantitiesGreaterThanOne() {
        // Create a product with BOM output quantity = 10 (Batch of 10)
        Item chairA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("PRD-CHR-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Wooden Chair")
                .itemType(woodenTableA.getItemType())
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        // BOM output = 10 Chairs requires: 5 Boards, 40 Legs, 80 Screws
        bomService.createBom(orgA.getId(), CreateBomRequest.builder()
                .productId(chairA.getId())
                .outputQuantity(BigDecimal.valueOf(10))
                .saveAndActivate(true)
                .items(List.of(
                        new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(5)),
                        new BomItemRequest(woodenLegsA.getId(), BigDecimal.valueOf(40)),
                        new BomItemRequest(screwsA.getId(), BigDecimal.valueOf(80))
                ))
                .build());

        // Produce 50 Chairs -> Multiplier = 50 / 10 = 5
        // Expected requirements:
        // Boards: 5 * 5 = 25
        // Legs: 40 * 5 = 200
        // Screws: 80 * 5 = 400
        CreateProductionOrderRequest req = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(chairA.getId())
                .productionQuantity(BigDecimal.valueOf(50))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .releaseImmediately(false)
                .build();

        ProductionOrderResponse response = productionOrderService.createProductionOrder(orgA.getId(), req);

        ProductionOrderItemResponse boardItem = response.getItems().stream()
                .filter(i -> i.getMaterialId().equals(woodenBoardA.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, BigDecimal.valueOf(25).compareTo(boardItem.getRequiredQuantity()));

        ProductionOrderItemResponse legsItem = response.getItems().stream()
                .filter(i -> i.getMaterialId().equals(woodenLegsA.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, BigDecimal.valueOf(200).compareTo(legsItem.getRequiredQuantity()));

        ProductionOrderItemResponse screwsItem = response.getItems().stream()
                .filter(i -> i.getMaterialId().equals(screwsA.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, BigDecimal.valueOf(400).compareTo(screwsItem.getRequiredQuantity()));
    }

    @Test
    void test3_failIfProductHasNoActiveBom() {
        Item unconfiguredItem = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("PRD-NOBOM-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Unconfigured Item")
                .itemType(woodenTableA.getItemType())
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        CreateProductionOrderRequest req = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(unconfiguredItem.getId())
                .productionQuantity(BigDecimal.valueOf(10))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .build();

        IllegalStateException ex = Assertions.assertThrows(
                IllegalStateException.class,
                () -> productionOrderService.createProductionOrder(orgA.getId(), req)
        );
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("does not have an active bill of materials"));
    }

    @Test
    void test4_sourceAndDestinationWarehouses_canBeSameOrDifferent() {
        // Same warehouse allowed
        CreateProductionOrderRequest reqSame = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(5))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(rawStoreA.getId())
                .build();

        ProductionOrderResponse resSame = productionOrderService.createProductionOrder(orgA.getId(), reqSame);
        Assertions.assertEquals(resSame.getSourceWarehouseId(), resSame.getFinishedGoodsWarehouseId());

        // Inactive warehouse rejected
        Warehouse inactiveWh = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("INACT-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Inactive Store")
                .active(false)
                .build());

        CreateProductionOrderRequest reqInactive = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(5))
                .sourceWarehouseId(inactiveWh.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .build();

        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> productionOrderService.createProductionOrder(orgA.getId(), reqInactive)
        );
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("inactive"));
    }

    @Test
    void test5_saveAndEditDraftProductionOrder() {
        CreateProductionOrderRequest createReq = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(5))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .notes("Initial draft")
                .releaseImmediately(false)
                .build();

        ProductionOrderResponse draft = productionOrderService.createProductionOrder(orgA.getId(), createReq);
        Assertions.assertEquals(ProductionOrderStatus.DRAFT, draft.getStatus());
        Assertions.assertEquals(BigDecimal.valueOf(5), draft.getProductionQuantity());

        UpdateProductionOrderRequest updateReq = UpdateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(20))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .notes("Updated quantity to 20")
                .releaseImmediately(false)
                .build();

        ProductionOrderResponse updated = productionOrderService.updateProductionOrder(orgA.getId(), draft.getId(), updateReq);
        Assertions.assertEquals(BigDecimal.valueOf(20), updated.getProductionQuantity());
        Assertions.assertEquals("Updated quantity to 20", updated.getNotes());

        // Materials recalculated for quantity = 20
        ProductionOrderItemResponse boardItem = updated.getItems().stream()
                .filter(i -> i.getMaterialId().equals(woodenBoardA.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(0, BigDecimal.valueOf(20).compareTo(boardItem.getRequiredQuantity()));
    }

    @Test
    void test6_releaseProductionOrder_andPreserveSnapshotEvenIfBomDeactivated() {
        CreateProductionOrderRequest req = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(10))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .releaseImmediately(true)
                .build();

        ProductionOrderResponse released = productionOrderService.createProductionOrder(orgA.getId(), req);
        Assertions.assertEquals(ProductionOrderStatus.RELEASED, released.getStatus());
        Assertions.assertEquals(activeBomA.getBomCode(), released.getBomCode());

        // Deactivate the BOM
        bomService.deactivateBom(orgA.getId(), activeBomA.getId());

        // Fetch released order again - its snapshot and materials remain intact!
        ProductionOrderResponse fetched = productionOrderService.getProductionOrderById(orgA.getId(), released.getId());
        Assertions.assertEquals(activeBomA.getBomCode(), fetched.getBomCode());
        Assertions.assertEquals(3, fetched.getItems().size());

        // Released order cannot be edited
        UpdateProductionOrderRequest editReq = UpdateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(15))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .build();

        IllegalStateException ex = Assertions.assertThrows(
                IllegalStateException.class,
                () -> productionOrderService.updateProductionOrder(orgA.getId(), released.getId(), editReq)
        );
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("only draft"));
    }

    @Test
    void test7_cancelProductionOrder() {
        CreateProductionOrderRequest req = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(10))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .releaseImmediately(true)
                .build();

        ProductionOrderResponse released = productionOrderService.createProductionOrder(orgA.getId(), req);
        Assertions.assertEquals(ProductionOrderStatus.RELEASED, released.getStatus());

        ProductionOrderResponse cancelled = productionOrderService.cancelProductionOrder(orgA.getId(), released.getId());
        Assertions.assertEquals(ProductionOrderStatus.CANCELLED, cancelled.getStatus());
    }

    @Test
    void test8_deleteDraft_preventDeleteReleased() {
        CreateProductionOrderRequest req = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(5))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .releaseImmediately(false)
                .build();

        ProductionOrderResponse draft = productionOrderService.createProductionOrder(orgA.getId(), req);
        productionOrderService.deleteDraftProductionOrder(orgA.getId(), draft.getId());

        Assertions.assertFalse(productionOrderRepository.findById(draft.getId()).isPresent());

        CreateProductionOrderRequest relReq = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(5))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .releaseImmediately(true)
                .build();

        ProductionOrderResponse relOrder = productionOrderService.createProductionOrder(orgA.getId(), relReq);

        IllegalStateException ex = Assertions.assertThrows(
                IllegalStateException.class,
                () -> productionOrderService.deleteDraftProductionOrder(orgA.getId(), relOrder.getId())
        );
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("only draft"));
    }

    @Test
    void test9_verifyNoStockMovementsAreGenerated() {
        long initialMovementsCount = stockMovementRepository.count();

        CreateProductionOrderRequest req = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(50))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .releaseImmediately(true)
                .build();

        ProductionOrderResponse released = productionOrderService.createProductionOrder(orgA.getId(), req);
        productionOrderService.cancelProductionOrder(orgA.getId(), released.getId());

        long afterMovementsCount = stockMovementRepository.count();
        Assertions.assertEquals(initialMovementsCount, afterMovementsCount,
                "Creating, releasing or cancelling Production Order must NOT generate stock movements");
    }

    @Test
    void test10_verifyOrganizationLevelDataIsolation() {
        // Create active BOM in Org B
        bomService.createBom(orgB.getId(), CreateBomRequest.builder()
                .productId(productB.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(new BomItemRequest(materialB.getId(), BigDecimal.valueOf(2))))
                .build());

        CreateProductionOrderRequest reqA = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(10))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .build();
        ProductionOrderResponse orderA = productionOrderService.createProductionOrder(orgA.getId(), reqA);

        CreateProductionOrderRequest reqB = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(productB.getId())
                .productionQuantity(BigDecimal.valueOf(5))
                .sourceWarehouseId(whB.getId())
                .finishedGoodsWarehouseId(whB.getId())
                .build();
        ProductionOrderResponse orderB = productionOrderService.createProductionOrder(orgB.getId(), reqB);

        // Org A cannot see Org B's order
        Assertions.assertThrows(
                RuntimeException.class,
                () -> productionOrderService.getProductionOrderById(orgA.getId(), orderB.getId())
        );

        // Org B cannot see Org A's order
        Assertions.assertThrows(
                RuntimeException.class,
                () -> productionOrderService.getProductionOrderById(orgB.getId(), orderA.getId())
        );

        // Org A list contains only Org A orders
        PageResponse<ProductionOrderResponse> pageA = productionOrderService.getProductionOrders(orgA.getId(), null, null, PageRequest.of(0, 10));
        Assertions.assertTrue(pageA.content().stream().allMatch(o -> o.getProductId().equals(woodenTableA.getId())));
    }

    @Test
    void test11_plannedEndDateCannotPrecedeStartDate() {
        CreateProductionOrderRequest req = CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(woodenTableA.getId())
                .productionQuantity(BigDecimal.valueOf(10))
                .sourceWarehouseId(rawStoreA.getId())
                .finishedGoodsWarehouseId(fgStoreA.getId())
                .plannedStartDate(LocalDate.now().plusDays(10))
                .plannedEndDate(LocalDate.now().plusDays(5)) // Invalid
                .build();

        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> productionOrderService.createProductionOrder(orgA.getId(), req)
        );
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("planned end date cannot precede"));
    }
}
