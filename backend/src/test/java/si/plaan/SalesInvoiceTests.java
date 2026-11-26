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
public class SalesInvoiceTests {

    @Autowired
    private SalesInvoiceService salesInvoiceService;

    @Autowired
    private DispatchOrderService dispatchOrderService;

    @Autowired
    private SalesOrderService salesOrderService;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private ItemService itemService;

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private GoodsReceiptService goodsReceiptService;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private CustomerResponse customer1;
    private WarehouseResponse warehouse1;
    private ItemResponse tableItem;
    private DispatchOrderResponse postedDispatch;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);

        org1 = organizationRepository.save(Organization.builder()
                .name("Sales Inv Org " + uid)
                .slug("si-org-" + uid)
                .country("India")
                .baseCurrency("INR")
                .timeZone("Asia/Kolkata")
                .active(true)
                .build());

        org2 = organizationRepository.save(Organization.builder()
                .name("Other SI Org " + uid)
                .slug("si-other-" + uid)
                .country("India")
                .baseCurrency("INR")
                .timeZone("Asia/Kolkata")
                .active(true)
                .build());

        customer1 = customerService.createCustomer(org1.getId(), new CreateCustomerRequest(
                "CUS-001",
                "ABC Furniture",
                "Ravi Kumar",
                "+91 9876543210",
                "ravi@abcfurniture.com",
                "ABC Furniture, Ongole",
                "ABC Furniture, Ongole",
                null,
                true
        ));

        warehouse1 = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-FG",
                "Finished Goods Store",
                "Bangalore",
                "FG Warehouse",
                true
        ));

        tableItem = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITEM-TAB", "Wooden Table", null, "Finished Goods", null, null, "Nos", "Table", true
        ));

        // Stock 20 tables so we can dispatch 8
        addStockViaGoodsReceipt(org1.getId(), warehouse1.id(), tableItem.id(), new BigDecimal("20.000"));

        SalesOrderResponse order = salesOrderService.createSalesOrder(org1.getId(), new CreateSalesOrderRequest(
                null,
                customer1.id(),
                warehouse1.id(),
                LocalDate.now(),
                LocalDate.now().plusDays(7),
                "CUST-PO-1",
                "ABC Furniture, Ongole",
                "ABC Furniture, Ongole",
                "Confirm for invoice test",
                SalesOrderStatus.DRAFT,
                List.of(new SalesOrderItemRequest(null, tableItem.id(), new BigDecimal("8.000"), new BigDecimal("2500.00")))
        ));
        order = salesOrderService.confirmSalesOrder(org1.getId(), order.id());
        Long soItemId = order.items().get(0).id();

        postedDispatch = dispatchOrderService.createDispatchOrder(org1.getId(), new CreateDispatchOrderRequest(
                null,
                order.id(),
                LocalDate.now(),
                "ABC Furniture, Ongole",
                null,
                null,
                null,
                "Shipped for invoicing",
                DispatchOrderStatus.POSTED,
                List.of(new DispatchOrderItemRequest(soItemId, tableItem.id(), new BigDecimal("8.000")))
        ));
    }

    private void addStockViaGoodsReceipt(Long orgId, Long warehouseId, Long itemId, BigDecimal qty) {
        SupplierResponse supplier = supplierService.createSupplier(orgId, new CreateSupplierRequest(
                null, "Supplier " + UUID.randomUUID(), null, null, null, null, null, true
        ));

        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(orgId, new CreatePurchaseOrderRequest(
                null, supplier.id(), warehouseId, LocalDate.now(), null, "Stock setup", PurchaseOrderStatus.DRAFT,
                List.of(new PurchaseOrderItemRequest(itemId, qty, BigDecimal.TEN))
        ));
        purchaseOrderService.updateStatus(orgId, po.id(), PurchaseOrderStatus.ISSUED);

        GoodsReceiptResponse gr = goodsReceiptService.createGoodsReceipt(orgId, new CreateGoodsReceiptRequest(
                null, po.id(), LocalDate.now(), null, "Stock setup", GoodsReceiptStatus.DRAFT,
                List.of(new GoodsReceiptItemRequest(po.items().get(0).id(), itemId, qty))
        ));
        goodsReceiptService.postGoodsReceipt(orgId, gr.id());
    }

    @Test
    public void testEligibleDispatchesAndAutoPopulation() {
        List<EligibleDispatchResponse> eligible = salesInvoiceService.getEligibleDispatches(org1.getId());
        Assertions.assertFalse(eligible.isEmpty());

        EligibleDispatchResponse details = salesInvoiceService.getDispatchDetailsForInvoice(
                org1.getId(), postedDispatch.id());
        Assertions.assertEquals(postedDispatch.dispatchNumber(), details.dispatchNumber());
        Assertions.assertEquals("ABC Furniture", details.customerName());
        Assertions.assertEquals("ABC Furniture, Ongole", details.billingAddress());
        Assertions.assertEquals(1, details.items().size());
        Assertions.assertEquals(new BigDecimal("8.000"), details.items().get(0).quantity());
        Assertions.assertEquals(new BigDecimal("2500.00"), details.items().get(0).unitPrice());
        Assertions.assertEquals(new BigDecimal("20000.00"), details.items().get(0).lineAmount());
    }

    @Test
    public void testCreateDraftSalesInvoiceWithCalculations() {
        // Subtotal = 8 * 2500 = 20,000; Tax = 3,600; Total = 23,600
        CreateSalesInvoiceRequest request = new CreateSalesInvoiceRequest(
                null,
                LocalDate.of(2026, 11, 25),
                LocalDate.of(2026, 12, 25),
                postedDispatch.id(),
                new BigDecimal("3600.00"),
                "Net 30",
                SalesInvoiceStatus.DRAFT
        );

        SalesInvoiceResponse created = salesInvoiceService.createSalesInvoice(org1.getId(), request);

        Assertions.assertNotNull(created.id());
        Assertions.assertTrue(created.invoiceNumber().startsWith("SI-"));
        Assertions.assertEquals(SalesInvoiceStatus.DRAFT, created.status());
        Assertions.assertEquals(new BigDecimal("20000.00"), created.subtotal());
        Assertions.assertEquals(new BigDecimal("3600.00"), created.taxAmount());
        Assertions.assertEquals(new BigDecimal("23600.00"), created.totalAmount());
        Assertions.assertEquals(new BigDecimal("23600.00"), created.outstandingAmount());
        Assertions.assertEquals(BigDecimal.ZERO, created.receivedAmount());
        Assertions.assertEquals(1, created.itemsCount());
        Assertions.assertEquals("ABC Furniture", created.customerName());
        Assertions.assertEquals(postedDispatch.dispatchNumber(), created.dispatchNumber());
    }

    @Test
    public void testEditDraftSalesInvoiceTaxAndDates() {
        SalesInvoiceResponse draft = salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                null,
                LocalDate.of(2026, 11, 25),
                null,
                postedDispatch.id(),
                new BigDecimal("1000.00"),
                "Draft notes",
                SalesInvoiceStatus.DRAFT
        ));

        UpdateSalesInvoiceRequest updateReq = new UpdateSalesInvoiceRequest(
                LocalDate.of(2026, 11, 26),
                LocalDate.of(2026, 12, 10),
                new BigDecimal("3600.00"),
                "Updated tax",
                SalesInvoiceStatus.DRAFT
        );

        SalesInvoiceResponse updated = salesInvoiceService.updateSalesInvoice(org1.getId(), draft.id(), updateReq);
        Assertions.assertEquals(LocalDate.of(2026, 11, 26), updated.invoiceDate());
        Assertions.assertEquals(LocalDate.of(2026, 12, 10), updated.paymentDueDate());
        Assertions.assertEquals(new BigDecimal("20000.00"), updated.subtotal());
        Assertions.assertEquals(new BigDecimal("3600.00"), updated.taxAmount());
        Assertions.assertEquals(new BigDecimal("23600.00"), updated.totalAmount());
        Assertions.assertEquals("Updated tax", updated.notes());
        // Selling price remains read-only from SO
        Assertions.assertEquals(new BigDecimal("2500.00"), updated.items().get(0).unitPrice());
    }

    @Test
    public void testPostInvoiceEstablishesOutstandingReceivable() {
        SalesInvoiceResponse draft = salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                null,
                LocalDate.of(2026, 11, 25),
                LocalDate.of(2026, 12, 25),
                postedDispatch.id(),
                new BigDecimal("3600.00"),
                "Ready to post",
                SalesInvoiceStatus.DRAFT
        ));

        BigDecimal stockBeforePost = stockMovementRepository.getCurrentStockForItemAndWarehouse(
                org1.getId(), tableItem.id(), warehouse1.id());

        SalesInvoiceResponse posted = salesInvoiceService.postSalesInvoice(org1.getId(), draft.id());

        Assertions.assertEquals(SalesInvoiceStatus.POSTED, posted.status());
        Assertions.assertEquals(new BigDecimal("23600.00"), posted.totalAmount());
        Assertions.assertEquals(BigDecimal.ZERO, posted.receivedAmount());
        Assertions.assertEquals(new BigDecimal("23600.00"), posted.outstandingAmount());

        SalesInvoiceSummaryResponse summary = salesInvoiceService.getSummary(org1.getId());
        Assertions.assertEquals(1, summary.postedCount());
        Assertions.assertEquals(new BigDecimal("23600.00"), summary.totalReceivable());
        Assertions.assertEquals(new BigDecimal("23600.00"), summary.outstandingReceivable());

        // No inventory impact on posting sales invoice
        BigDecimal stockAfterPost = stockMovementRepository.getCurrentStockForItemAndWarehouse(
                org1.getId(), tableItem.id(), warehouse1.id());
        Assertions.assertEquals(0, stockBeforePost.compareTo(stockAfterPost));
    }

    @Test
    public void testPostedInvoiceCannotBeEditedOrDeleted() {
        SalesInvoiceResponse posted = salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                null,
                LocalDate.now(),
                null,
                postedDispatch.id(),
                BigDecimal.ZERO,
                null,
                SalesInvoiceStatus.POSTED
        ));

        UpdateSalesInvoiceRequest updateReq = new UpdateSalesInvoiceRequest(
                LocalDate.now(),
                null,
                new BigDecimal("100.00"),
                "Should fail",
                SalesInvoiceStatus.POSTED
        );

        Assertions.assertThrows(IllegalStateException.class, () ->
                salesInvoiceService.updateSalesInvoice(org1.getId(), posted.id(), updateReq)
        );

        Assertions.assertThrows(IllegalStateException.class, () ->
                salesInvoiceService.deleteSalesInvoice(org1.getId(), posted.id())
        );

        Assertions.assertThrows(IllegalStateException.class, () ->
                salesInvoiceService.postSalesInvoice(org1.getId(), posted.id())
        );
    }

    @Test
    public void testPreventDuplicatePostedInvoicePerDispatch() {
        salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                null,
                LocalDate.now(),
                null,
                postedDispatch.id(),
                BigDecimal.ZERO,
                null,
                SalesInvoiceStatus.POSTED
        ));

        Assertions.assertThrows(IllegalStateException.class, () ->
                salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                        null,
                        LocalDate.now(),
                        null,
                        postedDispatch.id(),
                        BigDecimal.ZERO,
                        null,
                        SalesInvoiceStatus.DRAFT
                ))
        );

        List<EligibleDispatchResponse> eligible = salesInvoiceService.getEligibleDispatches(org1.getId());
        Assertions.assertTrue(eligible.stream().noneMatch(d -> d.id().equals(postedDispatch.id())));
    }

    @Test
    public void testNegativeTaxRejected() {
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                        null,
                        LocalDate.now(),
                        null,
                        postedDispatch.id(),
                        new BigDecimal("-10.00"),
                        null,
                        SalesInvoiceStatus.DRAFT
                ))
        );
    }

    @Test
    public void testDeleteDraftInvoice() {
        SalesInvoiceResponse draft = salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                null,
                LocalDate.now(),
                null,
                postedDispatch.id(),
                BigDecimal.ZERO,
                null,
                SalesInvoiceStatus.DRAFT
        ));

        salesInvoiceService.deleteSalesInvoice(org1.getId(), draft.id());

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                salesInvoiceService.getSalesInvoiceById(org1.getId(), draft.id())
        );
    }

    @Test
    public void testTenantIsolation() {
        SalesInvoiceResponse created = salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                null,
                LocalDate.now(),
                null,
                postedDispatch.id(),
                BigDecimal.ZERO,
                null,
                SalesInvoiceStatus.DRAFT
        ));

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                salesInvoiceService.getSalesInvoiceById(org2.getId(), created.id())
        );

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                salesInvoiceService.getDispatchDetailsForInvoice(org2.getId(), postedDispatch.id())
        );

        Assertions.assertTrue(salesInvoiceService.getEligibleDispatches(org2.getId()).isEmpty());
    }

    @Test
    public void testGeneratePdf() {
        SalesInvoiceResponse posted = salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                null,
                LocalDate.now(),
                null,
                postedDispatch.id(),
                new BigDecimal("3600.00"),
                "Printable",
                SalesInvoiceStatus.POSTED
        ));

        byte[] pdf = salesInvoiceService.generateInvoicePdf(org1.getId(), posted.id());
        Assertions.assertNotNull(pdf);
        Assertions.assertTrue(pdf.length > 100);
        // PDF magic header
        Assertions.assertEquals('%', (char) pdf[0]);
        Assertions.assertEquals('P', (char) pdf[1]);
        Assertions.assertEquals('D', (char) pdf[2]);
        Assertions.assertEquals('F', (char) pdf[3]);
    }
}
