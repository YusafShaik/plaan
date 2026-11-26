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
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.service.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class PurchaseInvoiceTests {

    @Autowired
    private PurchaseInvoiceService purchaseInvoiceService;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private GoodsReceiptService goodsReceiptService;

    @Autowired
    private ItemService itemService;

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private Organization org1;
    private Organization org2;
    private SupplierResponse supplier1;
    private WarehouseResponse warehouse1;
    private ItemResponse itemWood;
    private ItemResponse itemLegs;
    private ItemResponse itemScrews;

    private GoodsReceiptResponse postedGrn;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);

        org1 = organizationRepository.save(Organization.builder()
                .name("Timber Craft " + uid)
                .slug("timber-craft-" + uid)
                .country("India")
                .baseCurrency("INR")
                .timeZone("Asia/Kolkata")
                .active(true)
                .build());

        org2 = organizationRepository.save(Organization.builder()
                .name("Other Tenant " + uid)
                .slug("other-tenant-" + uid)
                .country("India")
                .baseCurrency("INR")
                .timeZone("Asia/Kolkata")
                .active(true)
                .build());

        // Setup supplier and warehouse for org1
        supplier1 = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-001",
                "ABC Timber",
                "John Wood",
                "9876543210",
                "john@abctimber.com",
                "Forest Road 10",
                "GSTIN123",
                true
        ));

        warehouse1 = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-001",
                "Central Store",
                "Bangalore",
                "Main Yard",
                true
        ));

        // Setup items
        itemWood = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITEM-WOOD", "Wooden Board", null, "Raw Materials", null, null, "Nos", "High quality pine board", true
        ));

        itemLegs = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITEM-LEGS", "Wooden Legs", null, "Raw Materials", null, null, "Nos", "Pine legs", true
        ));

        itemScrews = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITEM-SCRW", "Screws", null, "Consumables", null, null, "Nos", "Metal screws", true
        ));

        // Create PO and issue it
        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(org1.getId(), new CreatePurchaseOrderRequest(
                null,
                supplier1.id(),
                warehouse1.id(),
                LocalDate.now(),
                LocalDate.now().plusDays(7),
                "Initial purchase",
                PurchaseOrderStatus.ISSUED,
                List.of(
                        new PurchaseOrderItemRequest(itemWood.id(), new BigDecimal("20.000"), new BigDecimal("500.00")),
                        new PurchaseOrderItemRequest(itemLegs.id(), new BigDecimal("60.000"), new BigDecimal("200.00")),
                        new PurchaseOrderItemRequest(itemScrews.id(), new BigDecimal("500.000"), new BigDecimal("6.00"))
                )
        ));

        // Create GRN and post it
        GoodsReceiptResponse draftGrn = goodsReceiptService.createGoodsReceipt(org1.getId(), new CreateGoodsReceiptRequest(
                null,
                po.id(),
                LocalDate.now(),
                "DN-101",
                "Received in full",
                GoodsReceiptStatus.DRAFT,
                List.of(
                        new GoodsReceiptItemRequest(po.items().get(0).id(), itemWood.id(), new BigDecimal("20.000")),
                        new GoodsReceiptItemRequest(po.items().get(1).id(), itemLegs.id(), new BigDecimal("60.000")),
                        new GoodsReceiptItemRequest(po.items().get(2).id(), itemScrews.id(), new BigDecimal("500.000"))
                )
        ));

        postedGrn = goodsReceiptService.postGoodsReceipt(org1.getId(), draftGrn.id());
    }

    @Test
    public void testEligibleGoodsReceiptsAndAutoPopulation() {
        List<EligibleGrnResponse> eligible = purchaseInvoiceService.getEligibleGoodsReceipts(org1.getId());
        Assertions.assertFalse(eligible.isEmpty());

        EligibleGrnResponse grnDetails = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());
        Assertions.assertEquals(postedGrn.grnNumber(), grnDetails.grnNumber());
        Assertions.assertEquals("ABC Timber", grnDetails.supplierName());
        Assertions.assertEquals(3, grnDetails.items().size());

        // Verify default prices match PO prices
        Assertions.assertEquals(new BigDecimal("500.00"), grnDetails.items().get(0).defaultUnitPrice());
        Assertions.assertEquals(new BigDecimal("200.00"), grnDetails.items().get(1).defaultUnitPrice());
        Assertions.assertEquals(new BigDecimal("6.00"), grnDetails.items().get(2).defaultUnitPrice());
    }

    @Test
    public void testCreateDraftPurchaseInvoiceWithCalculations() {
        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());

        // Subtotal = 20*500 + 60*200 + 500*6 = 10,000 + 12,000 + 3,000 = 25,000
        // Tax = 4500
        // Total = 29,500
        CreatePurchaseInvoiceRequest request = new CreatePurchaseInvoiceRequest(
                null,
                "ABC/2026/105",
                LocalDate.of(2026, 11, 25),
                LocalDate.of(2026, 12, 25),
                postedGrn.id(),
                new BigDecimal("4500.00"),
                "invoice.pdf",
                "application/pdf",
                "base64dummycontent",
                "Standard 30 days terms",
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(1).goodsReceiptItemId(), itemLegs.id(), new BigDecimal("200.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(2).goodsReceiptItemId(), itemScrews.id(), new BigDecimal("6.00"))
                )
        );

        PurchaseInvoiceResponse created = purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request);

        Assertions.assertNotNull(created.id());
        Assertions.assertTrue(created.invoiceNumber().startsWith("PI-"));
        Assertions.assertEquals(PurchaseInvoiceStatus.DRAFT, created.status());
        Assertions.assertEquals(new BigDecimal("25000.00"), created.subtotal());
        Assertions.assertEquals(new BigDecimal("4500.00"), created.taxAmount());
        Assertions.assertEquals(new BigDecimal("29500.00"), created.totalAmount());
        Assertions.assertEquals(new BigDecimal("29500.00"), created.outstandingAmount());
        Assertions.assertTrue(created.hasAttachment());
    }

    @Test
    public void testEditUnitPriceInDraftInvoice() {
        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());

        CreatePurchaseInvoiceRequest request = new CreatePurchaseInvoiceRequest(
                null,
                "INV-EDIT-1",
                LocalDate.of(2026, 11, 25),
                null,
                postedGrn.id(),
                new BigDecimal("1000.00"),
                null,
                null,
                null,
                "Testing edit",
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(1).goodsReceiptItemId(), itemLegs.id(), new BigDecimal("200.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(2).goodsReceiptItemId(), itemScrews.id(), new BigDecimal("6.00"))
                )
        );

        PurchaseInvoiceResponse created = purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request);

        // Edit unit price of wooden board from 500 to 550 (supplier charged more)
        // New subtotal: 20*550 + 60*200 + 500*6 = 11,000 + 12,000 + 3,000 = 26,000
        // New total: 26,000 + 1,000 = 27,000
        UpdatePurchaseInvoiceRequest updateReq = new UpdatePurchaseInvoiceRequest(
                "INV-EDIT-1-MODIFIED",
                LocalDate.of(2026, 11, 25),
                LocalDate.of(2026, 12, 10),
                new BigDecimal("1000.00"),
                null,
                null,
                null,
                "Supplier increased timber board rate",
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("550.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(1).goodsReceiptItemId(), itemLegs.id(), new BigDecimal("200.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(2).goodsReceiptItemId(), itemScrews.id(), new BigDecimal("6.00"))
                )
        );

        PurchaseInvoiceResponse updated = purchaseInvoiceService.updatePurchaseInvoice(org1.getId(), created.id(), updateReq);
        Assertions.assertEquals("INV-EDIT-1-MODIFIED", updated.supplierInvoiceNumber());
        Assertions.assertEquals(new BigDecimal("26000.00"), updated.subtotal());
        Assertions.assertEquals(new BigDecimal("27000.00"), updated.totalAmount());
        Assertions.assertEquals(new BigDecimal("27000.00"), updated.outstandingAmount());
    }

    @Test
    public void testPostInvoiceEstablishesOutstandingPayable() {
        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());

        CreatePurchaseInvoiceRequest request = new CreatePurchaseInvoiceRequest(
                null,
                "ABC/2026/POST-1",
                LocalDate.of(2026, 11, 25),
                LocalDate.of(2026, 12, 25),
                postedGrn.id(),
                new BigDecimal("4500.00"),
                null,
                null,
                null,
                "Ready to post",
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(1).goodsReceiptItemId(), itemLegs.id(), new BigDecimal("200.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(2).goodsReceiptItemId(), itemScrews.id(), new BigDecimal("6.00"))
                )
        );

        PurchaseInvoiceResponse draft = purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request);
        PurchaseInvoiceResponse posted = purchaseInvoiceService.postPurchaseInvoice(org1.getId(), draft.id());

        Assertions.assertEquals(PurchaseInvoiceStatus.POSTED, posted.status());
        Assertions.assertEquals(new BigDecimal("29500.00"), posted.totalAmount());
        Assertions.assertEquals(BigDecimal.ZERO, posted.paidAmount());
        Assertions.assertEquals(new BigDecimal("29500.00"), posted.outstandingAmount());

        // Check summary reflection
        PurchaseInvoiceSummaryResponse summary = purchaseInvoiceService.getSummary(org1.getId());
        Assertions.assertEquals(1, summary.postedCount());
        Assertions.assertEquals(new BigDecimal("29500.00"), summary.totalPayable());
        Assertions.assertEquals(new BigDecimal("29500.00"), summary.outstandingPayable());
    }

    @Test
    public void testPostedInvoiceCannotBeEditedOrDeleted() {
        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());

        CreatePurchaseInvoiceRequest request = new CreatePurchaseInvoiceRequest(
                null,
                "ABC/2026/LOCK-1",
                LocalDate.now(),
                null,
                postedGrn.id(),
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.POSTED,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(1).goodsReceiptItemId(), itemLegs.id(), new BigDecimal("200.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(2).goodsReceiptItemId(), itemScrews.id(), new BigDecimal("6.00"))
                )
        );

        PurchaseInvoiceResponse posted = purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request);
        Assertions.assertEquals(PurchaseInvoiceStatus.POSTED, posted.status());

        // Try to update posted invoice -> must fail
        UpdatePurchaseInvoiceRequest updateReq = new UpdatePurchaseInvoiceRequest(
                "ABC/2026/LOCK-2",
                LocalDate.now(),
                null,
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.POSTED,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("550.00"))
                )
        );

        Assertions.assertThrows(IllegalStateException.class, () ->
                purchaseInvoiceService.updatePurchaseInvoice(org1.getId(), posted.id(), updateReq)
        );

        // Try to delete posted invoice -> must fail
        Assertions.assertThrows(IllegalStateException.class, () ->
                purchaseInvoiceService.deletePurchaseInvoice(org1.getId(), posted.id())
        );

        // Try to post again -> must fail
        Assertions.assertThrows(IllegalStateException.class, () ->
                purchaseInvoiceService.postPurchaseInvoice(org1.getId(), posted.id())
        );
    }

    @Test
    public void testDeleteDraftInvoice() {
        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());

        CreatePurchaseInvoiceRequest request = new CreatePurchaseInvoiceRequest(
                null,
                "DEL-DRAFT-1",
                LocalDate.now(),
                null,
                postedGrn.id(),
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00"))
                )
        );

        PurchaseInvoiceResponse draft = purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request);
        purchaseInvoiceService.deletePurchaseInvoice(org1.getId(), draft.id());

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                purchaseInvoiceService.getPurchaseInvoiceById(org1.getId(), draft.id())
        );
    }

    @Test
    public void testPreventDuplicateSupplierInvoiceNumbersForSameSupplier() {
        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());

        CreatePurchaseInvoiceRequest request1 = new CreatePurchaseInvoiceRequest(
                null,
                "DUP-BILL-100",
                LocalDate.now(),
                null,
                postedGrn.id(),
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00"))
                )
        );
        purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request1);

        // Creating another invoice with same supplier bill number must fail
        CreatePurchaseInvoiceRequest request2 = new CreatePurchaseInvoiceRequest(
                null,
                "  dup-bill-100  ",
                LocalDate.now(),
                null,
                postedGrn.id(),
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00"))
                )
        );

        Assertions.assertThrows(IllegalArgumentException.class, () ->
                purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request2)
        );
    }

    @Test
    public void testPreventMultiplePostedInvoicesPerGrnInV1() {
        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());

        // First invoice is posted
        CreatePurchaseInvoiceRequest request1 = new CreatePurchaseInvoiceRequest(
                null,
                "BILL-GRN-1",
                LocalDate.now(),
                null,
                postedGrn.id(),
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.POSTED,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00"))
                )
        );
        purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request1);

        // Grn should no longer be eligible
        List<EligibleGrnResponse> eligibleAfter = purchaseInvoiceService.getEligibleGoodsReceipts(org1.getId());
        boolean containsPostedGrn = eligibleAfter.stream().anyMatch(g -> g.id().equals(postedGrn.id()));
        Assertions.assertFalse(containsPostedGrn);

        // Attempting to create another purchase invoice for this GRN must fail
        CreatePurchaseInvoiceRequest request2 = new CreatePurchaseInvoiceRequest(
                null,
                "BILL-GRN-2",
                LocalDate.now(),
                null,
                postedGrn.id(),
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00"))
                )
        );

        Assertions.assertThrows(IllegalStateException.class, () ->
                purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request2)
        );
    }

    @Test
    public void testNegativePricesAndTaxesRejected() {
        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());

        // Negative tax
        CreatePurchaseInvoiceRequest negTax = new CreatePurchaseInvoiceRequest(
                null,
                "NEG-TAX",
                LocalDate.now(),
                null,
                postedGrn.id(),
                new BigDecimal("-50.00"),
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00"))
                )
        );
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                purchaseInvoiceService.createPurchaseInvoice(org1.getId(), negTax)
        );

        // Negative unit price
        CreatePurchaseInvoiceRequest negPrice = new CreatePurchaseInvoiceRequest(
                null,
                "NEG-PRICE",
                LocalDate.now(),
                null,
                postedGrn.id(),
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("-10.00"))
                )
        );
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                purchaseInvoiceService.createPurchaseInvoice(org1.getId(), negPrice)
        );
    }

    @Test
    public void testVerifyNoInventoryImpact() {
        long stockMovementCountBefore = stockMovementRepository.count();

        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());

        CreatePurchaseInvoiceRequest request = new CreatePurchaseInvoiceRequest(
                null,
                "NO-INV-IMPACT-1",
                LocalDate.now(),
                null,
                postedGrn.id(),
                new BigDecimal("4500.00"),
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.POSTED,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(1).goodsReceiptItemId(), itemLegs.id(), new BigDecimal("200.00")),
                        new PurchaseInvoiceItemRequest(details.items().get(2).goodsReceiptItemId(), itemScrews.id(), new BigDecimal("6.00"))
                )
        );

        purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request);

        long stockMovementCountAfter = stockMovementRepository.count();
        // Assert zero new stock movements created!
        Assertions.assertEquals(stockMovementCountBefore, stockMovementCountAfter);
    }

    @Test
    public void testTenantIsolation() {
        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), postedGrn.id());

        CreatePurchaseInvoiceRequest request = new CreatePurchaseInvoiceRequest(
                null,
                "TENANT-ISO-1",
                LocalDate.now(),
                null,
                postedGrn.id(),
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("500.00"))
                )
        );

        PurchaseInvoiceResponse invOrg1 = purchaseInvoiceService.createPurchaseInvoice(org1.getId(), request);

        // Org2 cannot find, view, update, post, or delete Org1's invoice
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                purchaseInvoiceService.getPurchaseInvoiceById(org2.getId(), invOrg1.id())
        );

        UpdatePurchaseInvoiceRequest updateReq = new UpdatePurchaseInvoiceRequest(
                "CROSS-TENANT",
                LocalDate.now(),
                null,
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                PurchaseInvoiceStatus.DRAFT,
                List.of(
                        new PurchaseInvoiceItemRequest(details.items().get(0).goodsReceiptItemId(), itemWood.id(), new BigDecimal("600.00"))
                )
        );

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                purchaseInvoiceService.updatePurchaseInvoice(org2.getId(), invOrg1.id(), updateReq)
        );

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                purchaseInvoiceService.postPurchaseInvoice(org2.getId(), invOrg1.id())
        );

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                purchaseInvoiceService.deletePurchaseInvoice(org2.getId(), invOrg1.id())
        );

        // Org2 cannot access Org1's posted GRN to create an invoice
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org2.getId(), postedGrn.id())
        );
    }
}
