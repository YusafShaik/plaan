package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateStockAdjustmentRequest;
import si.plaan.dto.request.StockAdjustmentItemRequest;
import si.plaan.dto.request.BomItemRequest;
import si.plaan.dto.request.CreateBomRequest;
import si.plaan.dto.request.CreateOpeningStockRequest;
import si.plaan.dto.request.CreateProductionOrderRequest;
import si.plaan.dto.request.OpeningStockItemRequest;
import si.plaan.dto.response.BomResponse;
import si.plaan.dto.response.MaterialAvailabilityItemResponse;
import si.plaan.dto.response.OpeningStockResponse;
import si.plaan.dto.response.ProductionOrderAvailabilityResponse;
import si.plaan.dto.response.ProductionOrderResponse;
import si.plaan.entity.Item;
import si.plaan.entity.ItemType;
import si.plaan.entity.Organization;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.entity.Warehouse;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.BomRepository;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.ItemTypeRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.ProductionOrderRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.repository.WarehouseRepository;
import si.plaan.service.BomService;
import si.plaan.service.OpeningStockService;
import si.plaan.service.ProductionOrderService;
import si.plaan.service.StockAdjustmentService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class MaterialAvailabilityTests {

    @Autowired
    private ProductionOrderService productionOrderService;

    @Autowired
    private ProductionOrderRepository productionOrderRepository;

    @Autowired
    private BomService bomService;

    @Autowired
    private BomRepository bomRepository;

    @Autowired
    private OpeningStockService openingStockService;

    @Autowired
    private StockAdjustmentService stockAdjustmentService;

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
    private Warehouse mainWarehouse;
    private Warehouse fgStore;

    private Warehouse whB;
    private Item itemB;

    private BomResponse activeBom;
    private ProductionOrderResponse orderA;

    @BeforeEach
    void setUp() {
        orgA = organizationRepository.save(Organization.builder()
                .name("Avail Org A " + UUID.randomUUID())
                .slug("avail-org-a-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());

        orgB = organizationRepository.save(Organization.builder()
                .name("Avail Org B " + UUID.randomUUID())
                .slug("avail-org-b-" + UUID.randomUUID())
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

        mainWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("WH-MAIN")
                .name("Main Warehouse")
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

        // Create active BOM for Wooden Table: output 1 Nos, requires 1 Board, 4 Legs, 16 Screws
        activeBom = bomService.createBom(orgA.getId(), CreateBomRequest.builder()
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

        // Create Production Order for 10 Wooden Tables in Raw Material Store
        // Requirements: 10 Boards, 40 Legs, 160 Screws
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
    void testInitialZeroStockShowsCompleteShortage() {
        ProductionOrderAvailabilityResponse avail = productionOrderService.checkMaterialAvailability(orgA.getId(), orderA.getId());

        Assertions.assertNotNull(avail);
        Assertions.assertEquals(orderA.getId(), avail.getProductionOrderId());
        Assertions.assertEquals("MO-001", avail.getOrderNumber());
        Assertions.assertEquals(rawMaterialStore.getId(), avail.getSourceWarehouseId());
        Assertions.assertEquals("MATERIAL_SHORTAGE", avail.getOverallAvailability());
        Assertions.assertEquals(3, avail.getTotalComponents());
        Assertions.assertEquals(3, avail.getShortageCount());
        Assertions.assertEquals(0, avail.getAvailableCount());

        for (MaterialAvailabilityItemResponse item : avail.getItems()) {
            Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(item.getOnHandQuantity()));
            Assertions.assertEquals("NOT_AVAILABLE", item.getAvailabilityStatus());
            if (item.getMaterialId().equals(woodenBoard.getId())) {
                Assertions.assertEquals(0, new BigDecimal("10.0000").compareTo(item.getRequiredQuantity()));
                Assertions.assertEquals(0, new BigDecimal("10.0000").compareTo(item.getShortageQuantity()));
            } else if (item.getMaterialId().equals(woodenLegs.getId())) {
                Assertions.assertEquals(0, new BigDecimal("40.0000").compareTo(item.getRequiredQuantity()));
                Assertions.assertEquals(0, new BigDecimal("40.0000").compareTo(item.getShortageQuantity()));
            } else if (item.getMaterialId().equals(screws.getId())) {
                Assertions.assertEquals(0, new BigDecimal("160.0000").compareTo(item.getRequiredQuantity()));
                Assertions.assertEquals(0, new BigDecimal("160.0000").compareTo(item.getShortageQuantity()));
            }
        }
    }

    @Test
    void testPartialStockAvailabilityAndShortageCalculation() {
        // Post stock in rawMaterialStore:
        // Wooden Board: 20 Nos (Req: 10 -> Excess, Shortage 0, AVAILABLE)
        // Wooden Legs: 30 Nos (Req: 40 -> Insufficient, Shortage 10, PARTIALLY_AVAILABLE)
        // Screws: 100 Nos (Req: 160 -> Insufficient, Shortage 60, PARTIALLY_AVAILABLE)
        OpeningStockResponse os = openingStockService.createOpeningStock(orgA.getId(), CreateOpeningStockRequest.builder()
                .openingStockNumber("OS-AVAIL-01")
                .openingDate(LocalDate.now())
                .warehouseId(rawMaterialStore.getId())
                .items(List.of(
                        OpeningStockItemRequest.builder().itemId(woodenBoard.getId()).quantity(new BigDecimal("20.0000")).build(),
                        OpeningStockItemRequest.builder().itemId(woodenLegs.getId()).quantity(new BigDecimal("30.0000")).build(),
                        OpeningStockItemRequest.builder().itemId(screws.getId()).quantity(new BigDecimal("100.0000")).build()
                ))
                .postImmediately(true)
                .build());
        Assertions.assertNotNull(os);

        ProductionOrderAvailabilityResponse avail = productionOrderService.checkMaterialAvailability(orgA.getId(), orderA.getId());

        Assertions.assertEquals("MATERIAL_SHORTAGE", avail.getOverallAvailability());
        Assertions.assertEquals(2, avail.getShortageCount());
        Assertions.assertEquals(1, avail.getAvailableCount());

        MaterialAvailabilityItemResponse boardItem = avail.getItems().stream()
                .filter(i -> i.getMaterialId().equals(woodenBoard.getId()))
                .findFirst().orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("20.0000").compareTo(boardItem.getOnHandQuantity()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(boardItem.getShortageQuantity()));
        Assertions.assertEquals("AVAILABLE", boardItem.getAvailabilityStatus());

        MaterialAvailabilityItemResponse legItem = avail.getItems().stream()
                .filter(i -> i.getMaterialId().equals(woodenLegs.getId()))
                .findFirst().orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("30.0000").compareTo(legItem.getOnHandQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10.0000").compareTo(legItem.getShortageQuantity()));
        Assertions.assertEquals("PARTIALLY_AVAILABLE", legItem.getAvailabilityStatus());

        MaterialAvailabilityItemResponse screwItem = avail.getItems().stream()
                .filter(i -> i.getMaterialId().equals(screws.getId()))
                .findFirst().orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("100.0000").compareTo(screwItem.getOnHandQuantity()));
        Assertions.assertEquals(0, new BigDecimal("60.0000").compareTo(screwItem.getShortageQuantity()));
        Assertions.assertEquals("PARTIALLY_AVAILABLE", screwItem.getAvailabilityStatus());
    }

    @Test
    void testNewlyReceivedInventoryReflectsLiveAndAchievesAllMaterialsAvailable() {
        // Step 1: Initial stock has shortage
        openingStockService.createOpeningStock(orgA.getId(), CreateOpeningStockRequest.builder()
                .openingStockNumber("OS-AVAIL-P1")
                .openingDate(LocalDate.now())
                .warehouseId(rawMaterialStore.getId())
                .items(List.of(
                        OpeningStockItemRequest.builder().itemId(woodenBoard.getId()).quantity(new BigDecimal("10.0000")).build(),
                        OpeningStockItemRequest.builder().itemId(woodenLegs.getId()).quantity(new BigDecimal("20.0000")).build()
                ))
                .postImmediately(true)
                .build());

        ProductionOrderAvailabilityResponse step1 = productionOrderService.checkMaterialAvailability(orgA.getId(), orderA.getId());
        Assertions.assertEquals("MATERIAL_SHORTAGE", step1.getOverallAvailability());
        Assertions.assertEquals(2, step1.getShortageCount());

        // Step 2: Replenish additional materials via stock adjustment (e.g. goods receipt or inventory reconciliation)
        stockAdjustmentService.createStockAdjustment(orgA.getId(), CreateStockAdjustmentRequest.builder()
                .warehouseId(rawMaterialStore.getId())
                .adjustmentDate(LocalDate.now())
                .reason("Material Replenishment")
                .items(List.of(
                        StockAdjustmentItemRequest.builder().itemId(woodenLegs.getId()).physicalQuantity(new BigDecimal("50.0000")).build(), // now 50 >= 40
                        StockAdjustmentItemRequest.builder().itemId(screws.getId()).physicalQuantity(new BigDecimal("200.0000")).build()     // now 200 >= 160
                ))
                .postImmediately(true)
                .build());

        ProductionOrderAvailabilityResponse step2 = productionOrderService.checkMaterialAvailability(orgA.getId(), orderA.getId());
        Assertions.assertEquals("ALL_MATERIALS_AVAILABLE", step2.getOverallAvailability());
        Assertions.assertEquals(0, step2.getShortageCount());
        Assertions.assertEquals(3, step2.getAvailableCount());

        for (MaterialAvailabilityItemResponse it : step2.getItems()) {
            Assertions.assertEquals("AVAILABLE", it.getAvailabilityStatus());
            Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(it.getShortageQuantity()));
            Assertions.assertTrue(it.getOnHandQuantity().compareTo(it.getRequiredQuantity()) >= 0);
        }
    }

    @Test
    void testStockInOtherWarehouseIsStrictlyExcluded() {
        // Stock placed into mainWarehouse (NOT rawMaterialStore)
        openingStockService.createOpeningStock(orgA.getId(), CreateOpeningStockRequest.builder()
                .openingStockNumber("OS-OTHER-WH")
                .openingDate(LocalDate.now())
                .warehouseId(mainWarehouse.getId())
                .items(List.of(
                        OpeningStockItemRequest.builder().itemId(woodenBoard.getId()).quantity(new BigDecimal("500.0000")).build(),
                        OpeningStockItemRequest.builder().itemId(woodenLegs.getId()).quantity(new BigDecimal("500.0000")).build(),
                        OpeningStockItemRequest.builder().itemId(screws.getId()).quantity(new BigDecimal("5000.0000")).build()
                ))
                .postImmediately(true)
                .build());

        // Availability check must still show shortage in rawMaterialStore
        ProductionOrderAvailabilityResponse avail = productionOrderService.checkMaterialAvailability(orgA.getId(), orderA.getId());
        Assertions.assertEquals("MATERIAL_SHORTAGE", avail.getOverallAvailability());
        Assertions.assertEquals(3, avail.getShortageCount());

        for (MaterialAvailabilityItemResponse it : avail.getItems()) {
            Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(it.getOnHandQuantity()),
                    "Stock in main warehouse must not count towards rawMaterialStore requirements");
            Assertions.assertEquals("NOT_AVAILABLE", it.getAvailabilityStatus());
        }
    }

    @Test
    void testVerifyZeroStockMovementsGeneratedDuringAvailabilityCheck() {
        long countBefore = stockMovementRepository.count();

        // Perform multiple checks
        productionOrderService.checkMaterialAvailability(orgA.getId(), orderA.getId());
        productionOrderService.getProductionOrderById(orgA.getId(), orderA.getId());
        productionOrderService.checkMaterialAvailability(orgA.getId(), orderA.getId());
        productionOrderService.getProductionOrderById(orgA.getId(), orderA.getId());

        long countAfter = stockMovementRepository.count();
        Assertions.assertEquals(countBefore, countAfter, "Material availability checks must NEVER generate stock movements");
    }

    @Test
    void testTenantIsolation() {
        // Stock in Org B
        openingStockService.createOpeningStock(orgB.getId(), CreateOpeningStockRequest.builder()
                .openingStockNumber("OS-ORG-B")
                .openingDate(LocalDate.now())
                .warehouseId(whB.getId())
                .items(List.of(
                        OpeningStockItemRequest.builder().itemId(itemB.getId()).quantity(new BigDecimal("1000.0000")).build()
                ))
                .postImmediately(true)
                .build());

        // Org B cannot check Org A's production order
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                productionOrderService.checkMaterialAvailability(orgB.getId(), orderA.getId())
        );

        // Org A cannot see Org B's stock
        ProductionOrderAvailabilityResponse availA = productionOrderService.checkMaterialAvailability(orgA.getId(), orderA.getId());
        Assertions.assertEquals("MATERIAL_SHORTAGE", availA.getOverallAvailability());
    }

    @Test
    void testProductionOrderDetailsEndpointIncludesAvailabilityFields() {
        // Post partial stock
        openingStockService.createOpeningStock(orgA.getId(), CreateOpeningStockRequest.builder()
                .openingStockNumber("OS-DTL-TEST")
                .openingDate(LocalDate.now())
                .warehouseId(rawMaterialStore.getId())
                .items(List.of(
                        OpeningStockItemRequest.builder().itemId(woodenBoard.getId()).quantity(new BigDecimal("15.0000")).build()
                ))
                .postImmediately(true)
                .build());

        ProductionOrderResponse details = productionOrderService.getProductionOrderById(orgA.getId(), orderA.getId());
        Assertions.assertNotNull(details);
        Assertions.assertEquals("MATERIAL_SHORTAGE", details.getOverallAvailability());
        Assertions.assertEquals(2, details.getShortageCount());

        Assertions.assertNotNull(details.getItems());
        Assertions.assertEquals(3, details.getItems().size());

        for (var it : details.getItems()) {
            Assertions.assertNotNull(it.getOnHandQuantity());
            Assertions.assertNotNull(it.getShortageQuantity());
            Assertions.assertNotNull(it.getAvailabilityStatus());
        }
    }
}
