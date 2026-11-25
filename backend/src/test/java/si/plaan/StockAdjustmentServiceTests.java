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
import si.plaan.repository.*;
import si.plaan.service.InventoryService;
import si.plaan.service.OpeningStockService;
import si.plaan.service.StockAdjustmentService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class StockAdjustmentServiceTests {

    @Autowired
    private StockAdjustmentService stockAdjustmentService;

    @Autowired
    private OpeningStockService openingStockService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private StockAdjustmentRepository stockAdjustmentRepository;

    private Organization orgA;
    private Organization orgB;
    private Warehouse whMainA;
    private Warehouse whB;
    private Item steelSheetA;
    private Item steelRodA;
    private Item hexBoltA;
    private Item itemB;

    @BeforeEach
    void setUp() {
        orgA = organizationRepository.save(Organization.builder()
                .name("Adjustment Org A " + UUID.randomUUID().toString().substring(0, 6))
                .slug("adj-org-a-" + UUID.randomUUID().toString().substring(0, 6))
                .country("SI")
                .baseCurrency("EUR")
                .timeZone("UTC")
                .active(true)
                .build());

        orgB = organizationRepository.save(Organization.builder()
                .name("Adjustment Org B " + UUID.randomUUID().toString().substring(0, 6))
                .slug("adj-org-b-" + UUID.randomUUID().toString().substring(0, 6))
                .country("SI")
                .baseCurrency("EUR")
                .timeZone("UTC")
                .active(true)
                .build());

        whMainA = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("WH-MAIN-ADJ")
                .name("Main Warehouse")
                .active(true)
                .build());

        whB = warehouseRepository.save(Warehouse.builder()
                .organization(orgB)
                .warehouseCode("WH-B-ADJ")
                .name("Org B Warehouse")
                .active(true)
                .build());

        ItemType rawTypeA = itemTypeRepository.save(ItemType.builder()
                .organization(orgA)
                .name("Raw Materials A")
                .description("Raw materials")
                .build());

        steelSheetA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemType(rawTypeA)
                .itemCode("ITM-STEEL-SHEET")
                .name("Steel Sheet")
                .unitOfMeasure("kg")
                .active(true)
                .build());

        steelRodA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemType(rawTypeA)
                .itemCode("ITM-STEEL-ROD")
                .name("Steel Rod")
                .unitOfMeasure("kg")
                .active(true)
                .build());

        hexBoltA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemType(rawTypeA)
                .itemCode("ITM-HEX-BOLT")
                .name("Hex Bolt")
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        ItemType rawTypeB = itemTypeRepository.save(ItemType.builder()
                .organization(orgB)
                .name("Raw Materials B")
                .description("Raw materials B")
                .build());

        itemB = itemRepository.save(Item.builder()
                .organization(orgB)
                .itemType(rawTypeB)
                .itemCode("ITM-B-001")
                .name("Org B Material")
                .unitOfMeasure("kg")
                .active(true)
                .build());

        // Initialize inventory matching user prompt:
        // Steel Sheet: 500 kg
        // Steel Rod: 200 kg
        // Hex Bolt: 1,000 Nos
        openingStockService.createOpeningStock(orgA.getId(), CreateOpeningStockRequest.builder()
                .warehouseId(whMainA.getId())
                .openingDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("500.000")),
                        new OpeningStockItemRequest(steelRodA.getId(), new BigDecimal("200.000")),
                        new OpeningStockItemRequest(hexBoltA.getId(), new BigDecimal("1000.000"))
                ))
                .build());
    }

    @Test
    void testChecklist_StockAdjustmentEndToEnd() {
        // [2] Automatically fetch system stock via getWarehouseStock
        List<ItemOnHandStockResponse> stockList = stockAdjustmentService.getWarehouseStock(orgA.getId(), whMainA.getId());
        var sheetStock = stockList.stream().filter(s -> s.getItemId().equals(steelSheetA.getId())).findFirst().orElseThrow();
        var rodStock = stockList.stream().filter(s -> s.getItemId().equals(steelRodA.getId())).findFirst().orElseThrow();
        var boltStock = stockList.stream().filter(s -> s.getItemId().equals(hexBoltA.getId())).findFirst().orElseThrow();

        Assertions.assertEquals(new BigDecimal("500.000"), sheetStock.getOnHandQuantity());
        Assertions.assertEquals(new BigDecimal("200.000"), rodStock.getOnHandQuantity());
        Assertions.assertEquals(new BigDecimal("1000.000"), boltStock.getOnHandQuantity());

        // [1], [3], [4], [5], [8] Create adjustment as DRAFT with multiple items:
        // Steel Sheet: physical 480 -> diff -20
        // Steel Rod: physical 210 -> diff +10
        // Hex Bolt: physical 1000 -> diff 0
        CreateStockAdjustmentRequest draftReq = CreateStockAdjustmentRequest.builder()
                .warehouseId(whMainA.getId())
                .adjustmentDate(LocalDate.now())
                .reason("Physical count")
                .postImmediately(false)
                .items(List.of(
                        new StockAdjustmentItemRequest(steelSheetA.getId(), new BigDecimal("480.000"), new BigDecimal("500.000")),
                        new StockAdjustmentItemRequest(steelRodA.getId(), new BigDecimal("210.000"), new BigDecimal("200.000")),
                        new StockAdjustmentItemRequest(hexBoltA.getId(), new BigDecimal("1000.000"), new BigDecimal("1000.000"))
                ))
                .build();

        StockAdjustmentResponse draft = stockAdjustmentService.createStockAdjustment(orgA.getId(), draftReq);
        Assertions.assertEquals("SA-001", draft.getAdjustmentNumber());
        Assertions.assertEquals(StockAdjustmentStatus.DRAFT, draft.getStatus());
        Assertions.assertEquals(3, draft.getTotalItems());
        Assertions.assertEquals(new BigDecimal("-10.000"), draft.getTotalDifference()); // -20 + 10 + 0 = -10

        // Draft must NOT generate any stock movements
        Assertions.assertTrue(stockMovementRepository.findByStockAdjustmentIdOrderByCreatedAtDesc(draft.getId()).isEmpty());

        // [8] Edit draft
        UpdateStockAdjustmentRequest updateReq = UpdateStockAdjustmentRequest.builder()
                .warehouseId(whMainA.getId())
                .adjustmentDate(LocalDate.now())
                .reason("Physical count")
                .notes("Reviewed by storekeeper")
                .items(List.of(
                        new StockAdjustmentItemRequest(steelSheetA.getId(), new BigDecimal("480.000"), new BigDecimal("500.000")),
                        new StockAdjustmentItemRequest(steelRodA.getId(), new BigDecimal("210.000"), new BigDecimal("200.000")),
                        new StockAdjustmentItemRequest(hexBoltA.getId(), new BigDecimal("1000.000"), new BigDecimal("1000.000"))
                ))
                .build();
        StockAdjustmentResponse updatedDraft = stockAdjustmentService.updateStockAdjustment(orgA.getId(), draft.getId(), updateReq);
        Assertions.assertEquals("Reviewed by storekeeper", updatedDraft.getNotes());

        // [9] Post adjustment:
        // Only items with non-zero difference generate stock movements:
        // Steel Sheet (-20) -> ADJUSTMENT_OUT
        // Steel Rod (+10) -> ADJUSTMENT_IN
        // Hex Bolt (0) -> NO MOVEMENT
        StockAdjustmentResponse posted = stockAdjustmentService.postStockAdjustment(orgA.getId(), updatedDraft.getId());
        Assertions.assertEquals(StockAdjustmentStatus.POSTED, posted.getStatus());

        List<StockMovement> movements = stockMovementRepository.findByStockAdjustmentIdOrderByCreatedAtDesc(posted.getId());
        Assertions.assertEquals(2, movements.size());

        StockMovement outMv = movements.stream().filter(m -> m.getMovementType().equals("ADJUSTMENT_OUT")).findFirst().orElseThrow();
        Assertions.assertEquals(steelSheetA.getId(), outMv.getItem().getId());
        Assertions.assertEquals(new BigDecimal("20.000"), outMv.getQuantity());

        StockMovement inMv = movements.stream().filter(m -> m.getMovementType().equals("ADJUSTMENT_IN")).findFirst().orElseThrow();
        Assertions.assertEquals(steelRodA.getId(), inMv.getItem().getId());
        Assertions.assertEquals(new BigDecimal("10.000"), inMv.getQuantity());

        // [10] Verify Stock Overview and Stock Ledger:
        // Steel Sheet: 500 - 20 = 480 kg
        // Steel Rod: 200 + 10 = 210 kg
        // Hex Bolt: 1000 kg (unchanged)
        BigDecimal sheetStockAfter = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), steelSheetA.getId(), whMainA.getId());
        BigDecimal rodStockAfter = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), steelRodA.getId(), whMainA.getId());
        BigDecimal boltStockAfter = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), hexBoltA.getId(), whMainA.getId());

        Assertions.assertEquals(new BigDecimal("480.000"), sheetStockAfter);
        Assertions.assertEquals(new BigDecimal("210.000"), rodStockAfter);
        Assertions.assertEquals(new BigDecimal("1000.000"), boltStockAfter);

        // Ledger check for Steel Sheet:
        StockLedgerResponse sheetLedger = inventoryService.getStockLedger(orgA.getId(), steelSheetA.getId(), whMainA.getId());
        Assertions.assertEquals(new BigDecimal("480.000"), sheetLedger.closingBalance());
        Assertions.assertTrue(sheetLedger.movements().stream().anyMatch(m ->
                m.referenceNumber().equals("SA-001") &&
                m.transactionType().equals("Stock Adjustment") &&
                m.quantityOut().compareTo(new BigDecimal("20.000")) == 0));

        // Ledger check for Steel Rod:
        StockLedgerResponse rodLedger = inventoryService.getStockLedger(orgA.getId(), steelRodA.getId(), whMainA.getId());
        Assertions.assertEquals(new BigDecimal("210.000"), rodLedger.closingBalance());
        Assertions.assertTrue(rodLedger.movements().stream().anyMatch(m ->
                m.referenceNumber().equals("SA-001") &&
                m.transactionType().equals("Stock Adjustment") &&
                m.quantityIn().compareTo(new BigDecimal("10.000")) == 0));

        // [6] Support physical quantity of zero (e.g. all remaining stock lost/damaged)
        CreateStockAdjustmentRequest zeroPhysicalReq = CreateStockAdjustmentRequest.builder()
                .warehouseId(whMainA.getId())
                .adjustmentDate(LocalDate.now())
                .reason("Material damage")
                .postImmediately(true)
                .items(List.of(
                        new StockAdjustmentItemRequest(hexBoltA.getId(), BigDecimal.ZERO, new BigDecimal("1000.000"))
                ))
                .build();
        StockAdjustmentResponse zeroPosted = stockAdjustmentService.createStockAdjustment(orgA.getId(), zeroPhysicalReq);
        Assertions.assertEquals(StockAdjustmentStatus.POSTED, zeroPosted.getStatus());

        BigDecimal boltStockZero = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), hexBoltA.getId(), whMainA.getId());
        Assertions.assertEquals(BigDecimal.ZERO.setScale(3), boltStockZero.setScale(3));

        // [7] Prevent stale stock adjustments:
        // Create a draft with Hex Bolt systemQty = 0, physicalQty = 50.
        // Then external movement changes stock. Posting the draft must fail!
        CreateStockAdjustmentRequest staleDraftReq = CreateStockAdjustmentRequest.builder()
                .warehouseId(whMainA.getId())
                .adjustmentDate(LocalDate.now())
                .reason("Stock correction")
                .postImmediately(false)
                .items(List.of(
                        new StockAdjustmentItemRequest(hexBoltA.getId(), new BigDecimal("50.000"), BigDecimal.ZERO)
                ))
                .build();
        StockAdjustmentResponse staleDraft = stockAdjustmentService.createStockAdjustment(orgA.getId(), staleDraftReq);

        // Inject an intervening stock movement to change Hex Bolt stock from 0 to 10
        StockAdjustment zeroEntity = stockAdjustmentRepository.findById(zeroPosted.getId()).orElseThrow();
        StockMovement interveningMovement = StockMovement.builder()
                .organization(orgA)
                .stockAdjustment(zeroEntity)
                .warehouse(whMainA)
                .item(hexBoltA)
                .movementType("ADJUSTMENT_IN")
                .quantity(new BigDecimal("10.000"))
                .unitOfMeasure("Nos")
                .movementDate(LocalDate.now())
                .referenceNumber("INTERVENING-001")
                .build();
        stockMovementRepository.save(interveningMovement);

        // Posting the stale draft MUST throw IllegalStateException!
        IllegalStateException staleEx = Assertions.assertThrows(
                IllegalStateException.class,
                () -> stockAdjustmentService.postStockAdjustment(orgA.getId(), staleDraft.getId())
        );
        Assertions.assertTrue(staleEx.getMessage().contains("has changed"));

        // [9] Prevent duplicate posting and editing posted
        Assertions.assertThrows(
                IllegalStateException.class,
                () -> stockAdjustmentService.postStockAdjustment(orgA.getId(), posted.getId())
        );
        Assertions.assertThrows(
                IllegalStateException.class,
                () -> stockAdjustmentService.updateStockAdjustment(orgA.getId(), posted.getId(), updateReq)
        );

        // [11] Verify tenant data isolation
        Assertions.assertThrows(
                Exception.class,
                () -> stockAdjustmentService.getStockAdjustmentById(orgB.getId(), posted.getId())
        );
        var orgBList = stockAdjustmentService.getStockAdjustments(orgB.getId(), null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, orgBList.totalElements());
    }
}
