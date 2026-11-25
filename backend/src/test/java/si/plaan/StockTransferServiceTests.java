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
import si.plaan.service.StockTransferService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class StockTransferServiceTests {

    @Autowired
    private StockTransferService stockTransferService;

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
    private Warehouse whMainA;
    private Warehouse whRawA;
    private Warehouse whB;
    private Item steelSheetA;
    private Item steelRodA;
    private Item itemB;

    @BeforeEach
    void setUp() {
        orgA = organizationRepository.save(Organization.builder()
                .name("Transfer Org A " + UUID.randomUUID().toString().substring(0, 6))
                .slug("tr-org-a-" + UUID.randomUUID().toString().substring(0, 6))
                .country("SI")
                .baseCurrency("EUR")
                .timeZone("UTC")
                .active(true)
                .build());

        orgB = organizationRepository.save(Organization.builder()
                .name("Transfer Org B " + UUID.randomUUID().toString().substring(0, 6))
                .slug("tr-org-b-" + UUID.randomUUID().toString().substring(0, 6))
                .country("SI")
                .baseCurrency("EUR")
                .timeZone("UTC")
                .active(true)
                .build());

        whMainA = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("WH-MAIN")
                .name("Main Warehouse")
                .active(true)
                .build());

        whRawA = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("WH-RAW")
                .name("Raw Material Store")
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

        // Initialize starting inventory in whMainA: 500 kg Steel Sheet, 200 kg Steel Rod
        openingStockService.createOpeningStock(orgA.getId(), CreateOpeningStockRequest.builder()
                .warehouseId(whMainA.getId())
                .openingDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("500.000")),
                        new OpeningStockItemRequest(steelRodA.getId(), new BigDecimal("200.000"))
                ))
                .build());

        // Also initialize 200 kg Steel Sheet in whRawA (matching user story: 500 kg in Main, 200 kg in Raw -> total 700 kg)
        openingStockService.createOpeningStock(orgA.getId(), CreateOpeningStockRequest.builder()
                .warehouseId(whRawA.getId())
                .openingDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        new OpeningStockItemRequest(steelSheetA.getId(), new BigDecimal("200.000"))
                ))
                .build());
    }

    @Test
    void testChecklist_TransferEndToEnd() {
        // [2] Display source warehouse stock
        List<ItemOnHandStockResponse> mainStock = stockTransferService.getWarehouseStock(orgA.getId(), whMainA.getId());
        var sheetStock = mainStock.stream().filter(s -> s.getItemId().equals(steelSheetA.getId())).findFirst().orElseThrow();
        Assertions.assertEquals(new BigDecimal("500.000"), sheetStock.getOnHandQuantity());

        // [3] Prevent same-warehouse transfers
        CreateStockTransferRequest sameWhReq = CreateStockTransferRequest.builder()
                .fromWarehouseId(whMainA.getId())
                .toWarehouseId(whMainA.getId())
                .transferDate(LocalDate.now())
                .items(List.of(new StockTransferItemRequest(steelSheetA.getId(), new BigDecimal("100.000"))))
                .build();
        IllegalArgumentException sameWhEx = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> stockTransferService.createStockTransfer(orgA.getId(), sameWhReq)
        );
        Assertions.assertTrue(sameWhEx.getMessage().contains("Source and destination warehouses must be different"));

        // [4] Prevent insufficient stock transfers
        CreateStockTransferRequest overReq = CreateStockTransferRequest.builder()
                .fromWarehouseId(whMainA.getId())
                .toWarehouseId(whRawA.getId())
                .transferDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(new StockTransferItemRequest(steelSheetA.getId(), new BigDecimal("501.000"))))
                .build();
        IllegalArgumentException overEx = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> stockTransferService.createStockTransfer(orgA.getId(), overReq)
        );
        Assertions.assertTrue(overEx.getMessage().contains("Insufficient stock"));

        // [1] & [5] Create transfer with multiple items as DRAFT, then edit draft
        CreateStockTransferRequest draftReq = CreateStockTransferRequest.builder()
                .fromWarehouseId(whMainA.getId())
                .toWarehouseId(whRawA.getId())
                .transferDate(LocalDate.now())
                .notes("Production requirement")
                .postImmediately(false)
                .items(List.of(
                        new StockTransferItemRequest(steelSheetA.getId(), new BigDecimal("100.000")),
                        new StockTransferItemRequest(steelRodA.getId(), new BigDecimal("50.000"))
                ))
                .build();

        StockTransferResponse draft = stockTransferService.createStockTransfer(orgA.getId(), draftReq);
        Assertions.assertEquals("ST-001", draft.getTransferNumber());
        Assertions.assertEquals(StockTransferStatus.DRAFT, draft.getStatus());
        Assertions.assertEquals(2, draft.getTotalItems());

        // Draft must NOT generate stock movements
        Assertions.assertTrue(stockMovementRepository.findByStockTransferIdOrderByCreatedAtDesc(draft.getId()).isEmpty());

        // Edit draft (change Steel Sheet to 150 kg matching prompt)
        UpdateStockTransferRequest updateReq = UpdateStockTransferRequest.builder()
                .fromWarehouseId(whMainA.getId())
                .toWarehouseId(whRawA.getId())
                .transferDate(LocalDate.now())
                .notes("Updated to 150 kg sheet")
                .items(List.of(
                        new StockTransferItemRequest(steelSheetA.getId(), new BigDecimal("150.000")),
                        new StockTransferItemRequest(steelRodA.getId(), new BigDecimal("50.000"))
                ))
                .build();
        StockTransferResponse updatedDraft = stockTransferService.updateStockTransfer(orgA.getId(), draft.getId(), updateReq);
        Assertions.assertEquals(new BigDecimal("200.000"), updatedDraft.getTotalQuantity());

        // [6] Post transfer successfully
        StockTransferResponse posted = stockTransferService.postStockTransfer(orgA.getId(), updatedDraft.getId());
        Assertions.assertEquals(StockTransferStatus.POSTED, posted.getStatus());

        // [7] Generate incoming and outgoing movements (2 movements per item -> 4 total)
        List<StockMovement> movements = stockMovementRepository.findByStockTransferIdOrderByCreatedAtDesc(posted.getId());
        Assertions.assertEquals(4, movements.size());

        long outCount = movements.stream().filter(m -> m.getMovementType().equals("TRANSFER_OUT")).count();
        long inCount = movements.stream().filter(m -> m.getMovementType().equals("TRANSFER_IN")).count();
        Assertions.assertEquals(2, outCount);
        Assertions.assertEquals(2, inCount);

        // [8] Verify total organization stock remains unchanged:
        // Steel sheet: 500 - 150 = 350 in Main, 200 + 150 = 350 in Raw -> Total = 700 kg!
        BigDecimal sheetMainAfter = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), steelSheetA.getId(), whMainA.getId());
        BigDecimal sheetRawAfter = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), steelSheetA.getId(), whRawA.getId());
        Assertions.assertEquals(new BigDecimal("350.000"), sheetMainAfter);
        Assertions.assertEquals(new BigDecimal("350.000"), sheetRawAfter);
        Assertions.assertEquals(new BigDecimal("700.000"), sheetMainAfter.add(sheetRawAfter));

        // [9] Verify Stock Overview and Stock Ledger
        var overview = inventoryService.getStockOverview(orgA.getId(), null, null, null);
        Assertions.assertTrue(overview.totalElements() >= 3);

        StockLedgerResponse ledgerSheetMain = inventoryService.getStockLedger(orgA.getId(), steelSheetA.getId(), whMainA.getId());
        Assertions.assertEquals(new BigDecimal("350.000"), ledgerSheetMain.closingBalance());
        Assertions.assertTrue(ledgerSheetMain.movements().stream().anyMatch(m ->
                m.referenceNumber().equals("ST-001") && m.quantityOut().compareTo(new BigDecimal("150.000")) == 0));

        StockLedgerResponse ledgerSheetRaw = inventoryService.getStockLedger(orgA.getId(), steelSheetA.getId(), whRawA.getId());
        Assertions.assertEquals(new BigDecimal("350.000"), ledgerSheetRaw.closingBalance());
        Assertions.assertTrue(ledgerSheetRaw.movements().stream().anyMatch(m ->
                m.referenceNumber().equals("ST-001") && m.quantityIn().compareTo(new BigDecimal("150.000")) == 0));

        // [10] Prevent duplicate posting and editing posted
        Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> stockTransferService.postStockTransfer(orgA.getId(), posted.getId())
        );
        Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> stockTransferService.updateStockTransfer(orgA.getId(), posted.getId(), updateReq)
        );

        // [11] Verify tenant data isolation
        Assertions.assertThrows(
                Exception.class,
                () -> stockTransferService.getStockTransferById(orgB.getId(), posted.getId())
        );
        var orgBList = stockTransferService.getStockTransfers(orgB.getId(), null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, orgBList.totalElements());
    }
}
