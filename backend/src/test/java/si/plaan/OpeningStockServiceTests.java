package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateOpeningStockRequest;
import si.plaan.dto.request.OpeningStockItemRequest;
import si.plaan.dto.request.UpdateOpeningStockRequest;
import si.plaan.dto.response.OpeningStockResponse;
import si.plaan.dto.response.StockLedgerResponse;
import si.plaan.dto.response.StockOverviewItemResponse;
import si.plaan.entity.*;
import si.plaan.repository.*;
import si.plaan.service.InventoryService;
import si.plaan.service.OpeningStockService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class OpeningStockServiceTests {

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

    private Organization orgA;
    private Organization orgB;
    private Warehouse whRawA;
    private Warehouse whMainA;
    private Warehouse whB;
    private Item steelSheetA;
    private Item steelRodA;
    private Item cuttingOilA;
    private Item itemB;

    @BeforeEach
    void setUp() {
        orgA = organizationRepository.save(Organization.builder()
                .name("Opening Stock Org A " + UUID.randomUUID().toString().substring(0, 6))
                .slug("os-org-a-" + UUID.randomUUID().toString().substring(0, 6))
                .country("SI")
                .baseCurrency("EUR")
                .timeZone("UTC")
                .active(true)
                .build());

        orgB = organizationRepository.save(Organization.builder()
                .name("Opening Stock Org B " + UUID.randomUUID().toString().substring(0, 6))
                .slug("os-org-b-" + UUID.randomUUID().toString().substring(0, 6))
                .country("SI")
                .baseCurrency("EUR")
                .timeZone("UTC")
                .active(true)
                .build());

        whRawA = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("WH-RAW")
                .name("Raw Material Store")
                .active(true)
                .build());

        whMainA = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("WH-MAIN")
                .name("Main Warehouse")
                .active(true)
                .build());

        whB = warehouseRepository.save(Warehouse.builder()
                .organization(orgB)
                .warehouseCode("WH-B")
                .name("Org B Warehouse")
                .active(true)
                .build());

        ItemType rawTypeA = itemTypeRepository.save(ItemType.builder()
                .organization(orgA)
                .name("Raw Materials")
                .description("Raw materials description")
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

        cuttingOilA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemType(rawTypeA)
                .itemCode("ITM-CUT-OIL")
                .name("Cutting Oil")
                .unitOfMeasure("L")
                .active(true)
                .build());

        ItemType rawTypeB = itemTypeRepository.save(ItemType.builder()
                .organization(orgB)
                .name("Raw Materials B")
                .description("Raw materials B description")
                .build());

        itemB = itemRepository.save(Item.builder()
                .organization(orgB)
                .itemType(rawTypeB)
                .itemCode("ITM-B-001")
                .name("Org B Material")
                .unitOfMeasure("kg")
                .active(true)
                .build());
    }

    @Test
    void testChecklist1_2_3_CreateDraft_EditDraft_PostOpeningStock() {
        // [1] Create Opening Stock with multiple items (as DRAFT)
        CreateOpeningStockRequest createReq = CreateOpeningStockRequest.builder()
                .warehouseId(whRawA.getId())
                .openingDate(LocalDate.now())
                .notes("Initial stock entry")
                .postImmediately(false)
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("300.000")),
                        new OpeningStockItemRequest(steelRodA.getId(), new BigDecimal("150.000"))
                ))
                .build();

        OpeningStockResponse created = openingStockService.createOpeningStock(orgA.getId(), createReq);
        Assertions.assertNotNull(created.getId());
        Assertions.assertEquals("OS-001", created.getOpeningStockNumber());
        Assertions.assertEquals(OpeningStockStatus.DRAFT, created.getStatus());
        Assertions.assertEquals(2, created.getTotalItems());

        // Verify draft does NOT create stock movements or affect overview
        List<StockMovement> draftMovements = stockMovementRepository.findByOpeningStockIdOrderByCreatedAtDesc(created.getId());
        Assertions.assertTrue(draftMovements.isEmpty(), "Draft opening stock must not create stock movements");
        var overviewBeforePost = inventoryService.getStockOverview(orgA.getId(), null, null, null, null, null);
        Assertions.assertEquals(0, overviewBeforePost.totalElements(), "Draft opening stock must not affect stock overview");

        // [2] Save and edit draft
        UpdateOpeningStockRequest updateReq = UpdateOpeningStockRequest.builder()
                .warehouseId(whRawA.getId())
                .openingDate(LocalDate.now())
                .notes("Updated notes with revised quantities")
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("500.000")),
                        new OpeningStockItemRequest(steelRodA.getId(), new BigDecimal("200.000")),
                        new OpeningStockItemRequest(cuttingOilA.getId(), new BigDecimal("50.000"))
                ))
                .build();

        OpeningStockResponse updated = openingStockService.updateOpeningStock(orgA.getId(), created.getId(), updateReq);
        Assertions.assertEquals(3, updated.getTotalItems());
        Assertions.assertEquals("Updated notes with revised quantities", updated.getNotes());
        Assertions.assertEquals(OpeningStockStatus.DRAFT, updated.getStatus());

        // [3] Post Opening Stock
        OpeningStockResponse posted = openingStockService.postOpeningStock(orgA.getId(), updated.getId());
        Assertions.assertEquals(OpeningStockStatus.POSTED, posted.getStatus());

        // Verify stock movements were created atomically
        List<StockMovement> postedMovements = stockMovementRepository.findByOpeningStockIdOrderByCreatedAtDesc(posted.getId());
        Assertions.assertEquals(3, postedMovements.size());
        for (StockMovement sm : postedMovements) {
            Assertions.assertEquals("OPENING_STOCK", sm.getMovementType());
            Assertions.assertEquals("OS-001", sm.getReferenceNumber());
            Assertions.assertNull(sm.getGoodsReceipt());
            Assertions.assertNull(sm.getPurchaseOrder());
        }

        // [6] Verify Stock Overview updates
        var overview = inventoryService.getStockOverview(orgA.getId(), null, null, null, null, null);
        Assertions.assertEquals(3, overview.content().size());
        StockOverviewItemResponse sheetOverview = overview.content().stream()
                .filter(o -> o.itemCode().equals(steelSheetA.getItemCode()))
                .findFirst().orElseThrow();
        Assertions.assertEquals(new BigDecimal("500.000"), sheetOverview.onHandQuantity());

        // [7] Verify Stock Ledger records the movement
        StockLedgerResponse ledgerSheet = inventoryService.getStockLedger(orgA.getId(), steelSheetA.getId(), whRawA.getId());
        Assertions.assertEquals(new BigDecimal("500.000"), ledgerSheet.closingBalance());
        Assertions.assertEquals(1, ledgerSheet.movements().size());
        var ledgerEntry = ledgerSheet.movements().get(0);
        Assertions.assertEquals("OS-001", ledgerEntry.referenceNumber());
        Assertions.assertEquals("Opening Stock", ledgerEntry.transactionType());
        Assertions.assertEquals(new BigDecimal("500.000"), ledgerEntry.quantityIn());
        Assertions.assertNull(ledgerEntry.quantityOut());

        // [8] Open source document from Stock Ledger
        Assertions.assertEquals(posted.getId(), ledgerEntry.openingStockId());
        OpeningStockResponse doc = openingStockService.getOpeningStockById(orgA.getId(), ledgerEntry.openingStockId());
        Assertions.assertEquals("OS-001", doc.getOpeningStockNumber());
    }

    @Test
    void testChecklist4_PreventDuplicateInitialization() {
        // First post opening stock for steelSheetA in whRawA
        CreateOpeningStockRequest req1 = CreateOpeningStockRequest.builder()
                .warehouseId(whRawA.getId())
                .openingDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("100.000"))
                ))
                .build();
        openingStockService.createOpeningStock(orgA.getId(), req1);

        // Attempt second initialization for steelSheetA in whRawA -> must fail
        CreateOpeningStockRequest req2 = CreateOpeningStockRequest.builder()
                .warehouseId(whRawA.getId())
                .openingDate(LocalDate.now())
                .postImmediately(false)
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("50.000"))
                ))
                .build();

        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> openingStockService.createOpeningStock(orgA.getId(), req2)
        );
        Assertions.assertTrue(ex.getMessage().contains("Opening stock can only be initialized once per item-warehouse combination"));

        // However, steelSheetA in ANOTHER warehouse (whMainA) IS allowed
        CreateOpeningStockRequest reqWhMain = CreateOpeningStockRequest.builder()
                .warehouseId(whMainA.getId())
                .openingDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("75.000"))
                ))
                .build();
        OpeningStockResponse resWhMain = openingStockService.createOpeningStock(orgA.getId(), reqWhMain);
        Assertions.assertEquals(OpeningStockStatus.POSTED, resWhMain.getStatus());
    }

    @Test
    void testChecklist5_PreventDuplicatePosting_And_EditingPosted() {
        CreateOpeningStockRequest req = CreateOpeningStockRequest.builder()
                .warehouseId(whRawA.getId())
                .openingDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("100.000"))
                ))
                .build();
        OpeningStockResponse posted = openingStockService.createOpeningStock(orgA.getId(), req);

        // Cannot post again
        IllegalArgumentException postTwiceEx = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> openingStockService.postOpeningStock(orgA.getId(), posted.getId())
        );
        Assertions.assertTrue(postTwiceEx.getMessage().contains("already posted"));

        // Cannot edit posted document
        UpdateOpeningStockRequest updateReq = UpdateOpeningStockRequest.builder()
                .warehouseId(whRawA.getId())
                .openingDate(LocalDate.now())
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("200.000"))
                ))
                .build();
        IllegalArgumentException editPostedEx = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> openingStockService.updateOpeningStock(orgA.getId(), posted.getId(), updateReq)
        );
        Assertions.assertTrue(editPostedEx.getMessage().contains("Only draft opening stock documents can be edited"));

        // Cannot cancel posted document
        IllegalArgumentException cancelPostedEx = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> openingStockService.cancelOpeningStock(orgA.getId(), posted.getId())
        );
        Assertions.assertTrue(cancelPostedEx.getMessage().contains("Only draft opening stock documents can be cancelled"));
    }

    @Test
    void testDuplicateItemsInSameDocument_NotAllowed() {
        CreateOpeningStockRequest req = CreateOpeningStockRequest.builder()
                .warehouseId(whRawA.getId())
                .openingDate(LocalDate.now())
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("100.000")),
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("50.000"))
                ))
                .build();

        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> openingStockService.createOpeningStock(orgA.getId(), req)
        );
        Assertions.assertTrue(ex.getMessage().contains("Duplicate items within the same document are not allowed"));
    }

    @Test
    void testChecklist9_TenantDataIsolation() {
        // Create posted opening stock in Org A
        CreateOpeningStockRequest reqA = CreateOpeningStockRequest.builder()
                .warehouseId(whRawA.getId())
                .openingDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("100.000"))
                ))
                .build();
        OpeningStockResponse osA = openingStockService.createOpeningStock(orgA.getId(), reqA);

        // Org B cannot access Org A's opening stock document
        Assertions.assertThrows(
                Exception.class,
                () -> openingStockService.getOpeningStockById(orgB.getId(), osA.getId())
        );

        // Org B list must be empty
        var orgBList = openingStockService.getOpeningStocks(orgB.getId(), null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, orgBList.totalElements());

        // Org B cannot post with warehouse of Org A
        CreateOpeningStockRequest crossReq = CreateOpeningStockRequest.builder()
                .warehouseId(whRawA.getId()) // Belongs to Org A!
                .openingDate(LocalDate.now())
                .items(List.of(
                        new OpeningStockItemRequest(itemB.getId(), new BigDecimal("10.000"))
                ))
                .build();
        Assertions.assertThrows(
                Exception.class,
                () -> openingStockService.createOpeningStock(orgB.getId(), crossReq)
        );
    }
}
