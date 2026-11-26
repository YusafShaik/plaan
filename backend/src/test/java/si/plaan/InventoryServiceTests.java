package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.StockLedgerResponse;
import si.plaan.dto.response.StockOverviewItemResponse;
import si.plaan.dto.response.StockOverviewSummaryResponse;
import si.plaan.entity.*;
import si.plaan.repository.*;
import si.plaan.service.InventoryService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@SpringBootTest
@Transactional
class InventoryServiceTests {

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
    private SupplierRepository supplierRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private GoodsReceiptRepository goodsReceiptRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Test
    void testStockOverviewAggregationsAndIsolation() {
        // 1. Create Organization A
        Organization orgA = organizationRepository.save(Organization.builder()
                .name("Tenant Stock Org " + UUID.randomUUID().toString().substring(0, 6))
                .slug("org-stock-" + UUID.randomUUID().toString().substring(0, 6))
                .country("SI")
                .baseCurrency("EUR")
                .timeZone("UTC")
                .active(true)
                .build());

        // 2. Warehouses in Org A
        Warehouse wh1 = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("WH-RAW")
                .name("Raw Material Store")
                .active(true)
                .build());

        Warehouse wh2 = warehouseRepository.save(Warehouse.builder()
                .organization(orgA)
                .warehouseCode("WH-MAIN")
                .name("Main Warehouse")
                .active(true)
                .build());

        // 3. Item Type and Items in Org A
        ItemType type = itemTypeRepository.save(ItemType.builder()
                .organization(orgA)
                .name("Raw Material")
                .description("Raw materials")
                .build());

        Item steelSheet = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("ITM-001")
                .name("Steel Sheet")
                .itemType(type)
                .unitOfMeasure("kg")
                .active(true)
                .build());

        Item steelRod = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("ITM-002")
                .name("Steel Rod")
                .itemType(type)
                .unitOfMeasure("kg")
                .active(true)
                .build());

        // 4. Supplier
        Supplier supplier = supplierRepository.save(Supplier.builder()
                .organization(orgA)
                .supplierCode("SUP-001")
                .name("Steel Corp")
                .active(true)
                .build());

        // 5. Purchase Order
        PurchaseOrder po = purchaseOrderRepository.save(PurchaseOrder.builder()
                .organization(orgA)
                .poNumber("PO-TEST-100")
                .supplier(supplier)
                .receivingWarehouse(wh1)
                .orderDate(LocalDate.now())
                .status(PurchaseOrderStatus.ISSUED)
                .currency("EUR")
                .totalAmount(new BigDecimal("1000"))
                .build());

        // 6. POSTED Goods Receipt 1 in WH 1 (+100 kg Steel Sheet)
        GoodsReceipt grn1 = goodsReceiptRepository.save(GoodsReceipt.builder()
                .organization(orgA)
                .grnNumber("GRN-TEST-001")
                .purchaseOrder(po)
                .receiptDate(LocalDate.now())
                .status(GoodsReceiptStatus.POSTED)
                .build());

        stockMovementRepository.save(StockMovement.builder()
                .organization(orgA)
                .goodsReceipt(grn1)
                .purchaseOrder(po)
                .item(steelSheet)
                .warehouse(wh1)
                .movementType("INBOUND_RECEIPT")
                .quantity(new BigDecimal("100.000"))
                .unitOfMeasure("kg")
                .movementDate(LocalDate.now())
                .referenceNumber("GRN-TEST-001")
                .build());

        // 7. POSTED Goods Receipt 2 in WH 2 (+50 kg Steel Sheet)
        GoodsReceipt grn2 = goodsReceiptRepository.save(GoodsReceipt.builder()
                .organization(orgA)
                .grnNumber("GRN-TEST-002")
                .purchaseOrder(po)
                .receiptDate(LocalDate.now())
                .status(GoodsReceiptStatus.POSTED)
                .build());

        stockMovementRepository.save(StockMovement.builder()
                .organization(orgA)
                .goodsReceipt(grn2)
                .purchaseOrder(po)
                .item(steelSheet)
                .warehouse(wh2)
                .movementType("INBOUND_RECEIPT")
                .quantity(new BigDecimal("50.000"))
                .unitOfMeasure("kg")
                .movementDate(LocalDate.now())
                .referenceNumber("GRN-TEST-002")
                .build());

        // 8. POSTED Goods Receipt 3 in WH 1 (+200 kg Steel Rod)
        GoodsReceipt grn3 = goodsReceiptRepository.save(GoodsReceipt.builder()
                .organization(orgA)
                .grnNumber("GRN-TEST-003")
                .purchaseOrder(po)
                .receiptDate(LocalDate.now())
                .status(GoodsReceiptStatus.POSTED)
                .build());

        stockMovementRepository.save(StockMovement.builder()
                .organization(orgA)
                .goodsReceipt(grn3)
                .purchaseOrder(po)
                .item(steelRod)
                .warehouse(wh1)
                .movementType("INBOUND_RECEIPT")
                .quantity(new BigDecimal("200.000"))
                .unitOfMeasure("kg")
                .movementDate(LocalDate.now())
                .referenceNumber("GRN-TEST-003")
                .build());

        // 9. DRAFT GRN (+500 kg Steel Rod in WH 2) -> MUST NOT AFFECT STOCK
        GoodsReceipt draftGrn = goodsReceiptRepository.save(GoodsReceipt.builder()
                .organization(orgA)
                .grnNumber("GRN-DRAFT-001")
                .purchaseOrder(po)
                .receiptDate(LocalDate.now())
                .status(GoodsReceiptStatus.DRAFT)
                .build());

        stockMovementRepository.save(StockMovement.builder()
                .organization(orgA)
                .goodsReceipt(draftGrn)
                .purchaseOrder(po)
                .item(steelRod)
                .warehouse(wh2)
                .movementType("INBOUND_RECEIPT")
                .quantity(new BigDecimal("500.000"))
                .unitOfMeasure("kg")
                .movementDate(LocalDate.now())
                .referenceNumber("GRN-DRAFT-001")
                .build());

        // ================= VERIFY SUMMARY =================
        StockOverviewSummaryResponse summary = inventoryService.getStockOverviewSummary(orgA.getId());
        Assertions.assertEquals(2, summary.itemsInStock(), "Should have 2 distinct items in stock (Steel Sheet & Steel Rod)");
        Assertions.assertEquals(2, summary.warehousesWithStock(), "Should have 2 warehouses with stock (Raw Material Store & Main Warehouse)");
        Assertions.assertEquals(3, summary.totalStockRecords(), "Should have 3 stock records: Sheet in WH1, Sheet in WH2, Rod in WH1");

        // ================= VERIFY STOCK OVERVIEW LIST =================
        PageResponse<StockOverviewItemResponse> overview = inventoryService.getStockOverview(
                orgA.getId(), null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(3, overview.totalElements());

        // Verify Steel Sheet in WH1 = 100 kg
        StockOverviewItemResponse sheetInWh1 = overview.content().stream()
                .filter(i -> i.itemCode().equals("ITM-001") && i.warehouseCode().equals("WH-RAW"))
                .findFirst().orElseThrow();
        Assertions.assertEquals(0, sheetInWh1.onHandQuantity().compareTo(new BigDecimal("100.000")));
        Assertions.assertEquals("kg", sheetInWh1.unitOfMeasure());

        // Verify Steel Sheet in WH2 = 50 kg
        StockOverviewItemResponse sheetInWh2 = overview.content().stream()
                .filter(i -> i.itemCode().equals("ITM-001") && i.warehouseCode().equals("WH-MAIN"))
                .findFirst().orElseThrow();
        Assertions.assertEquals(0, sheetInWh2.onHandQuantity().compareTo(new BigDecimal("50.000")));

        // Verify Steel Rod in WH1 = 200 kg
        StockOverviewItemResponse rodInWh1 = overview.content().stream()
                .filter(i -> i.itemCode().equals("ITM-002") && i.warehouseCode().equals("WH-RAW"))
                .findFirst().orElseThrow();
        Assertions.assertEquals(0, rodInWh1.onHandQuantity().compareTo(new BigDecimal("200.000")));

        // ================= VERIFY DRAFT GRN EXCLUSION =================
        // Steel Rod in WH2 was only in DRAFT GRN, so it MUST NOT be present in stock overview!
        boolean rodInWh2Present = overview.content().stream()
                .anyMatch(i -> i.itemCode().equals("ITM-002") && i.warehouseCode().equals("WH-MAIN"));
        Assertions.assertFalse(rodInWh2Present, "Draft GRN movements must not be included in stock balance");

        // ================= VERIFY SEARCH FILTER =================
        PageResponse<StockOverviewItemResponse> searchByName = inventoryService.getStockOverview(
                orgA.getId(), "sheet", null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(2, searchByName.totalElements(), "Search for 'sheet' should match Sheet in WH1 and Sheet in WH2");

        PageResponse<StockOverviewItemResponse> searchByCode = inventoryService.getStockOverview(
                orgA.getId(), "ITM-002", null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(1, searchByCode.totalElements(), "Search for 'ITM-002' should match Rod in WH1");

        // ================= VERIFY WAREHOUSE FILTER =================
        PageResponse<StockOverviewItemResponse> wh1Filter = inventoryService.getStockOverview(
                orgA.getId(), null, wh1.getId(), null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(2, wh1Filter.totalElements(), "WH1 should have 2 records (Sheet and Rod)");

        PageResponse<StockOverviewItemResponse> wh2Filter = inventoryService.getStockOverview(
                orgA.getId(), null, wh2.getId(), null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(1, wh2Filter.totalElements(), "WH2 should have 1 record (Sheet only)");

        // ================= VERIFY TENANT DATA ISOLATION =================
        Organization orgB = organizationRepository.save(Organization.builder()
                .name("Tenant B Corp " + UUID.randomUUID().toString().substring(0, 6))
                .slug("org-b-" + UUID.randomUUID().toString().substring(0, 6))
                .country("USA")
                .baseCurrency("USD")
                .timeZone("UTC")
                .active(true)
                .build());

        StockOverviewSummaryResponse orgBSummary = inventoryService.getStockOverviewSummary(orgB.getId());
        Assertions.assertEquals(0, orgBSummary.itemsInStock(), "Tenant B should see 0 items in stock");
        Assertions.assertEquals(0, orgBSummary.warehousesWithStock(), "Tenant B should see 0 warehouses with stock");
        Assertions.assertEquals(0, orgBSummary.totalStockRecords(), "Tenant B should see 0 stock records");

        PageResponse<StockOverviewItemResponse> orgBOverview = inventoryService.getStockOverview(
                orgB.getId(), null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, orgBOverview.totalElements(), "Tenant B must not see any stock from Tenant A");

        // ================= VERIFY STOCK LEDGER =================
        StockLedgerResponse ledgerSheet = inventoryService.getStockLedger(orgA.getId(), steelSheet.getId(), null);
        Assertions.assertEquals("ITM-001", ledgerSheet.itemCode());
        Assertions.assertEquals(0, ledgerSheet.totalIn().compareTo(new BigDecimal("150.000")));
        Assertions.assertEquals(0, ledgerSheet.totalOut().compareTo(BigDecimal.ZERO));
        Assertions.assertEquals(0, ledgerSheet.closingBalance().compareTo(new BigDecimal("150.000")));
        Assertions.assertEquals(2, ledgerSheet.movements().size());
        Assertions.assertEquals(0, ledgerSheet.movements().get(0).runningBalance().compareTo(new BigDecimal("100.000")));
        Assertions.assertEquals(0, ledgerSheet.movements().get(1).runningBalance().compareTo(new BigDecimal("150.000")));

        // Scoped to WH1
        StockLedgerResponse ledgerSheetWh1 = inventoryService.getStockLedger(orgA.getId(), steelSheet.getId(), wh1.getId());
        Assertions.assertEquals(1, ledgerSheetWh1.movements().size());
        Assertions.assertEquals(0, ledgerSheetWh1.closingBalance().compareTo(new BigDecimal("100.000")));
    }
}
